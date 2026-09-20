import sanitizeHtml from "sanitize-html";

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["b", "strong", "i", "em", "u", "s", "br", "p", "div", "span", "mark", "ul", "ol", "li", "font"],
    allowedAttributes: { "*": ["style"], font: ["color", "size", "face"] },
    allowedStyles: { "*": {
      color: [/^(?:#[0-9a-f]{3,8}|[a-z]+|rgba?\([\d\s.,%]+\))$/i],
      "background-color": [/^(?:#[0-9a-f]{3,8}|[a-z]+|rgba?\([\d\s.,%]+\))$/i],
      "font-size": [/^\d+(?:\.\d+)?(?:px|pt|em|%)$/],
      "font-weight": [/^(?:normal|bold|[1-9]00)$/],
      "font-style": [/^(?:normal|italic)$/],
      "text-decoration": [/^(?:none|underline|line-through)$/],
      "text-align": [/^(?:left|right|center|justify)$/],
    } },
  });
}

/**
 * Decodes CSS escape sequences (\hex{1,6}[ \t\r\n\f]? or \char) into their canonical unicode characters.
 * This prevents filter bypass via obfuscated CSS identifiers such as \75rl(...) or @\69mport "...".
 */
export function decodeCSSEscapes(input: string): string {
  if (!input) return "";
  return input.replace(/\\([0-9a-fA-F]{1,6})[ \t\r\n\f]?|\\([^\r\n\f])/g, (_match, hex, char) => {
    if (hex) {
      const codePoint = parseInt(hex, 16);
      if (codePoint === 0 || (codePoint >= 0xd800 && codePoint <= 0xdfff) || codePoint > 0x10ffff) {
        return "\uFFFD";
      }
      return String.fromCodePoint(codePoint);
    }
    return char || "";
  });
}

/**
 * Neutralizes a CSS function call (such as image-set or expression) by correctly tracking
 * balanced parentheses and nested quotes/functions, preventing nested functions like
 * image-set(url(...) 1x, "/tracking" 2x) from bypassing sanitization.
 */
function stripBalancedFunction(css: string, fnPrefixRegex: RegExp, replacement: string = "none"): string {
  let result = "";
  let lastIndex = 0;
  const regex = new RegExp(fnPrefixRegex.source, fnPrefixRegex.flags.includes("g") ? fnPrefixRegex.flags : fnPrefixRegex.flags + "g");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(css)) !== null) {
    result += css.slice(lastIndex, match.index);
    let depth = 1;
    let i = regex.lastIndex;
    let inQuote: string | null = null;

    while (i < css.length && depth > 0) {
      const ch = css[i];
      if (inQuote) {
        if (ch === "\\" && i + 1 < css.length) {
          i += 2;
          continue;
        }
        if (ch === inQuote) {
          inQuote = null;
        }
      } else {
        if (ch === '"' || ch === "'") {
          inQuote = ch;
        } else if (ch === '(') {
          depth++;
        } else if (ch === ')') {
          depth--;
        }
      }
      i++;
    }

    result += replacement;
    lastIndex = i;
    regex.lastIndex = i;
  }
  result += css.slice(lastIndex);
  return result;
}

/**
 * Strips dangerous CSS constructs, all @import declarations, external network url() and image-set() references.
 * Only benign inline data:image base64 URLs are permitted.
 */
export function sanitizeCSS(css: string): string {
  if (!css) return "";

  // 1. Decode CSS escape sequences (e.g. \75rl -> url, @\69mport -> @import, \69mage-set -> image-set)
  let clean = decodeCSSEscapes(css);

  // 2. Strip comments to prevent comment-based token evasion (e.g. @/* comment */import)
  clean = clean.replace(/\/\*[\s\S]*?\*\//g, " ");

  // 3. Strip all @import declarations (supporting bare strings, quotes, or url(...))
  clean = clean.replace(/@\s*import\b[^;{}]*(?:;|$)/gi, "");

  // 4. Strip external / network url() references in all CSS properties
  clean = clean.replace(/url\s*\(\s*(['"]?)([\s\S]*?)\1\s*\)/gi, (_m, quote, content) => {
    const trimmed = (content || "").trim();
    if (/^data:image\/(?:png|jpe?g|gif|svg\+xml|webp);base64,[a-zA-Z0-9+/=]+$/i.test(trimmed)) {
      return `url(${quote}${trimmed}${quote})`;
    }
    return "none";
  });

  // 5. Completely neutralize image-set() and -webkit-image-set() handling nested functions/parentheses
  clean = stripBalancedFunction(clean, /(?:-webkit-)?image-set\s*\(/gi, "none");

  // 6. Generic catch-all: strip any remaining external network URLs (http://, https://, //) in CSS property values
  clean = clean.replace(/:\s*[^;}]*(?:https?:\/\/|\/\/)[^;}]*(?:;|$)/gi, ": none;");

  // 7. Disallow dynamic expressions and legacy browser bindings
  clean = stripBalancedFunction(clean, /expression\s*\(/gi, "none");
  clean = clean.replace(/-moz-binding\s*:[\s\S]*?;?/gi, "");
  clean = clean.replace(/behavior\s*:[\s\S]*?;?/gi, "");

  return clean;
}

/** Templates keep layout CSS, but never executable markup, external resources or navigation. */
export function sanitizePrintHTML(html: string): string {
  // Pre-sanitize any <style> blocks
  const preCleaned = (html || "").replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_match, attrs, content) => {
    return `<style${attrs}>${sanitizeCSS(content)}</style>`;
  });

  return sanitizeHtml(preCleaned, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "html", "head", "body", "title", "style", "img"],
    allowedAttributes: {
      "*": ["class", "style", "id", "lang", "dir"],
      img: ["src", "alt", "width", "height"],
      td: ["colspan", "rowspan"], th: ["colspan", "rowspan"],
    },
    transformTags: {
      "*": (tagName, attribs) => {
        if (attribs.style) {
          attribs.style = sanitizeCSS(attribs.style);
        }
        return { tagName, attribs };
      },
    },
    allowedSchemes: ["https", "http"],
    allowedSchemesByTag: { img: ["https", "http", "data", "blob"] },
    allowVulnerableTags: true, // style is required for resume pagination; scripts and external stylesheet links remain forbidden.
  });
}
