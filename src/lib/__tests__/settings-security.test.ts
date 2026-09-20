import assert from "node:assert/strict";
import { test } from "node:test";
import { DELETE } from "@/app/api/settings/route";
import { getAIConfig } from "@/lib/ai/config";

test("public reset cannot mutate the server configuration", async () => {
  const before = { ...process.env };
  const response = await DELETE();
  assert.equal(response.status, 405);
  assert.deepEqual({ ...process.env }, before);
});

test("explicit browser mock selection never uses server credentials", () => {
  const config = getAIConfig(new Request("http://localhost/api/analyze", {
    headers: { "x-ai-mode": "mock" },
  }));
  assert.equal(config.mode, "mock");
  assert.equal(config.apiKey, "");
});
