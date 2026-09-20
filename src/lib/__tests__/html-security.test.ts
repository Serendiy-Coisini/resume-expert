import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeRichText, sanitizePrintHTML } from "@/lib/safe-html";

test("rich text preserves formatting but strips executable markup", () => {
  const html = sanitizeRichText('<b>成果</b><span style="color:#ff0000" onclick="alert(1)">增长</span><img src=x onerror=alert(1)><svg onload=alert(1)></svg><script>alert(1)</script>');
  assert.match(html, /<b>成果<\/b>/);
  assert.match(html, /color:#ff0000/);
  assert.doesNotMatch(html, /onerror|onclick|onload|<script|<svg|<img/);
});

test("print templates keep layout and remove scripts, event handlers and navigation", () => {
  const html = sanitizePrintHTML('<html><head><style>@page {size:A4}</style><meta http-equiv="refresh" content="0;url=https://example.com"></head><body onload="alert(1)"><p>简历</p><iframe srcdoc="bad"></iframe><script>alert(1)</script><img src="javascript:alert(1)"></body></html>');
  assert.match(html, /@page/);
  assert.match(html, /<p>简历<\/p>/);
  assert.doesNotMatch(html, /onload|<script|<iframe|<meta|javascript:/);
});
