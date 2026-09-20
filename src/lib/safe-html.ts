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

/** Templates keep layout CSS, but never executable markup or navigation. */
export function sanitizePrintHTML(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "html", "head", "body", "title", "style", "img"],
    allowedAttributes: {
      "*": ["class", "style", "id", "lang", "dir"],
      img: ["src", "alt", "width", "height"],
      td: ["colspan", "rowspan"], th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["https", "http"],
    allowedSchemesByTag: { img: ["https", "http", "data", "blob"] },
    allowVulnerableTags: true, // style is required for resume pagination; scripts remain forbidden.
  });
}
