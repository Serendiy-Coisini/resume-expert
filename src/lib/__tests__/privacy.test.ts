import assert from "node:assert/strict";
import { test } from "node:test";
import { anonymizePayload, restoreAnalysisResult } from "@/lib/privacy/pii";

test("mask nested follow-up text, Chinese names and strip media metadata", () => {
  const original = { input: { originalResume: "张三\n姓名：李四\n13800138000", avatarUrl: "data:image/png;base64,secret" }, userAnswer: "联系 test@example.com", bullets: [{ bullet: "电话 13800138000" }] };
  const { value, piiMap } = anonymizePayload(original);
  assert.doesNotMatch(JSON.stringify(value), /张三|李四|13800138000|test@example.com|secret/);
  assert.equal(restoreAnalysisResult(value, piiMap).userAnswer, original.userAnswer);
});

test("restoration handles quotes and backslashes without corrupting JSON", () => {
  assert.deepEqual(restoreAnalysisResult({ text: "[PII_NAME_1]" }, new Map([["[PII_NAME_1]", 'a"\\b']])), { text: 'a"\\b' });
});
