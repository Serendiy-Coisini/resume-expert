/**
 * SSRF (Server-Side Request Forgery) protection utilities.
 * Validates that baseUrl provided by clients points to a legitimate public HTTPS endpoint
 * and prevents probing of internal networks, localhost, or cloud metadata endpoints.
 */

function parseIPv4(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const n = parseInt(part, 10);
    if (n < 0 || n > 255) return null;
    octets.push(n);
  }
  return octets;
}

function isPrivateIPv4(octets: number[]): boolean {
  const [b0, b1, b2] = octets;
  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;
  // 10.0.0.0/8 (Private)
  if (b0 === 10) return true;
  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;
  // 100.64.0.0/10 (Shared address space / CGNAT: 100.64.0.0 - 100.127.255.255)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
  // 169.254.0.0/16 (Link-local & Cloud Metadata e.g. AWS/GCP/Aliyun 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;
  // 172.16.0.0/12 (Private 172.16.0.0 - 172.31.255.255)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (b0 === 192 && b1 === 168) return true;
  // 192.0.2.0/24 (TEST-NET-1)
  if (b0 === 192 && b1 === 0 && b2 === 2) return true;
  // 198.51.100.0/24 (TEST-NET-2)
  if (b0 === 198 && b1 === 51 && b2 === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (b0 === 203 && b1 === 0 && b2 === 113) return true;
  // 224.0.0.0/4 (Multicast) or 240.0.0.0/4 (Reserved)
  if (b0 >= 224) return true;

  return false;
}

function isPrivateIPv6(hostname: string): boolean {
  const clean = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  // IPv6 loopback
  if (clean === "::1" || clean === "0:0:0:0:0:0:0:1") return true;
  // IPv6 unspecified
  if (clean === "::" || clean === "0:0:0:0:0:0:0:0") return true;
  // Unique local addresses (fc00::/7)
  if (clean.startsWith("fc") || clean.startsWith("fd")) return true;
  // Link-local addresses (fe80::/10)
  if (clean.startsWith("fe80") || clean.startsWith("fe9") || clean.startsWith("fea") || clean.startsWith("feb")) return true;
  // IPv4-mapped IPv6 addresses (::ffff:127.0.0.1 etc.)
  if (clean.startsWith("::ffff:")) {
    const ipv4Part = clean.slice(7);
    const octets = parseIPv4(ipv4Part);
    if (octets !== null && isPrivateIPv4(octets)) return true;
  }
  return false;
}

const FORBIDDEN_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "instance-data",
]);

const FORBIDDEN_SUFFIXES = [
  ".local",
  ".localhost",
  ".internal",
  ".lan",
  ".home.arpa",
  ".corp",
];

/**
 * Validates a client-provided Base URL to prevent SSRF attacks.
 * Throws an error if the URL is invalid, uses insecure protocols, or points to private/internal networks.
 */
export function validateAndSanitizeBaseUrl(inputUrl: string): string {
  if (!inputUrl || typeof inputUrl !== "string") {
    throw new Error("Base URL 不能为空");
  }

  const trimmed = inputUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`非法的 Base URL 格式: ${trimmed}`);
  }

  // 1. Enforce HTTPS protocol
  if (parsed.protocol !== "https:") {
    // Optional bypass for local development only if explicitly enabled
    const allowInsecure = process.env.NODE_ENV === "development" && process.env.ALLOW_INSECURE_HTTP_BASEURL === "true";
    if (!allowInsecure || parsed.protocol !== "http:") {
      throw new Error(`安全限制：Base URL 必须使用 https:// 协议 (收到 ${parsed.protocol})`);
    }
  }

  // 2. Reject credentials in URL
  if (parsed.username || parsed.password) {
    throw new Error("Base URL 禁止包含用户名或密码");
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Check forbidden literal hostnames
  if (FORBIDDEN_HOSTNAMES.has(hostname)) {
    throw new Error(`安全限制：禁止访问受限主机 ${hostname}`);
  }

  // 4. Check forbidden domain suffixes
  for (const suffix of FORBIDDEN_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      throw new Error(`安全限制：禁止访问内网或保留域名后缀 ${hostname}`);
    }
  }

  // 5. Check IPv4 private/loopback/cloud metadata
  const octets = parseIPv4(hostname);
  if (octets !== null) {
    if (isPrivateIPv4(octets)) {
      throw new Error(`安全限制：禁止访问私有、本地回环或云元数据 IP 地址 (${hostname})`);
    }
  }

  // 6. Check IPv6 private/loopback
  if (hostname.includes(":") || hostname.startsWith("[")) {
    if (isPrivateIPv6(hostname)) {
      throw new Error(`安全限制：禁止访问私有或本地 IPv6 地址 (${hostname})`);
    }
  }

  // Return clean URL without trailing slashes
  return (parsed.origin + parsed.pathname).replace(/\/+$/, "");
}
