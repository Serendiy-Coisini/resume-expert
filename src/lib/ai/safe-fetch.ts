import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { validateAndSanitizeBaseUrl } from "@/lib/ai/ssrf";
import { reserveServerCall } from "@/lib/ai/server-access";

/** Resolve once, validate every answer, then pin the connection to that answer.
 * The original hostname is retained for Host and TLS certificate validation.
 * Redirects are deliberately returned to the caller, never followed.
 */
export async function safeAIFetch(url: string, init: RequestInit, access?: { serverPrincipal?: string }): Promise<Response> {
  const release = reserveServerCall(access?.serverPrincipal);
  try {
  const target = new URL(validateAndSanitizeBaseUrl(url));
  const hostname = target.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error("模型服务地址无法解析");
  for (const { address, family } of addresses) {
    validateAndSanitizeBaseUrl(`https://${family === 6 ? `[${address}]` : address}`);
  }
  const address = addresses[0];
  const signal = init.signal ?? AbortSignal.timeout(60_000);
  signal.throwIfAborted();
  if (init.body != null && typeof init.body !== "string") throw new Error("模型请求必须为 JSON 文本");
  return await new Promise<Response>((resolve, reject) => {
    const request = target.protocol === "https:" ? httpsRequest : httpRequest;
    const req = request(target, {
      method: init.method ?? "POST",
      headers: Object.fromEntries(new Headers(init.headers).entries()),
      signal,
      family: address.family,
      lookup: (_host, _options, callback) => callback(null, address.address, address.family),
    }, (res) => {
      const chunks: Buffer[] = [];
      let bytes = 0;
      res.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 2 * 1024 * 1024) {
          res.destroy(new Error("模型响应超过大小限制"));
          return;
        }
        chunks.push(chunk);
      });
      res.on("error", reject);
      res.on("end", () => {
        const status = res.statusCode ?? 502;
        const headers = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
        }
        resolve(new Response([204, 205, 304].includes(status) ? null : Buffer.concat(chunks), { status, headers }));
      });
    });
    req.on("error", reject);
    req.end(init.body ?? undefined);
  });
  } finally { release(); }
}
