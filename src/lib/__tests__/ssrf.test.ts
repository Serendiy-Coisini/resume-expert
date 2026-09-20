import assert from "node:assert/strict";
import { test, mock } from "node:test";
import dns from "node:dns/promises";
import { validateAndSanitizeBaseUrl } from "@/lib/ai/ssrf";
import { safeAIFetch } from "@/lib/ai/safe-fetch";

test("reject internal, encoded, mapped and reserved addresses", () => {
  for (const address of ["localhost.", "127.1", "2130706433", "10.1.2.3", "169.254.169.254", "[::ffff:127.0.0.1]", "[fe81::1]", "[::1]", "[fd00::1]", "198.18.0.1"]) {
    assert.throws(() => validateAndSanitizeBaseUrl(`https://${address}`), address);
  }
  assert.equal(validateAndSanitizeBaseUrl("https://api.deepseek.com/v1/"), "https://api.deepseek.com/v1");
});

test("DNS answers are checked before opening a connection", async () => {
  const stub = mock.method(dns, "lookup", async () => [{ address: "127.0.0.1", family: 4 }]);
  try {
    await assert.rejects(safeAIFetch("https://example.com/v1/chat/completions", { method: "POST", body: "{}" }), /安全限制/);
  } finally { stub.mock.restore(); }
});
