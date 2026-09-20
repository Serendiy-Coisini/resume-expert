import assert from "node:assert/strict";
import { test } from "node:test";
import { jsPDF } from "jspdf";
// Use the same side-effect-free entry point as the parsing routes.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const parsePdf = require("pdf-parse/lib/pdf-parse.js") as (data: { data: Uint8Array; isEvalSupported: boolean }) => Promise<{ text: string }>;

test("server PDF text extraction works with dynamic evaluation disabled", async () => {
  const doc = new jsPDF();
  doc.text("Resume security regression", 10, 10);
  const result = await parsePdf({ data: new Uint8Array(doc.output("arraybuffer")), isEvalSupported: false });
  assert.match(result.text, /Resume security regression/);
});
