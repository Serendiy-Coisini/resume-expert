import assert from "node:assert/strict";
import { test } from "node:test";
import { aiErrorResponse } from "@/lib/ai/error-response";
import { LLMError } from "@/lib/ai/errors";
import { RequestValidationError } from "@/lib/request-error";

test("API errors retain actionable statuses and hide unexpected internal details", async () => {
  for (const status of [401, 403, 429, 503]) {
    assert.equal(aiErrorResponse(new LLMError("provider failure", status), "failed").status, status);
  }
  assert.equal(aiErrorResponse(new RequestValidationError("too large", 413), "failed").status, 413);
  assert.equal(aiErrorResponse(new DOMException("timeout", "TimeoutError"), "failed").status, 504);
  assert.equal(aiErrorResponse(new LLMError("network failure"), "failed").status, 502);
  const unexpected = aiErrorResponse(new Error("private internal details"), "操作失败");
  assert.equal(unexpected.status, 500);
  assert.deepEqual(await unexpected.json(), { error: "操作失败" });
});
