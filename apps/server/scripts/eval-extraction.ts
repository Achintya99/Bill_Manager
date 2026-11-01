/**
 * Runs the real extractor on local receipt photos and compares the result with the hand-checked fixtures.
 *
 * Photos are personal data and are not committed. Put them in <repo>/samples/receipts/ named after the
 * fixture keys, e.g. samples/receipts/mercadona-2026-10-30.jpg, then run:
 *   ANTHROPIC_API_KEY=... npm run eval -w server
 * Each run calls the API once per photo, which costs money.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { checkReceipt, toCents, type ExtractedReceipt } from "@bill-manager/shared";
import { RECEIPT_FIXTURES } from "@bill-manager/shared/fixtures";
import { createClaudeExtractor, type Effort } from "../src/extract/claude";

const here = path.dirname(fileURLToPath(import.meta.url));
const samplesDir = path.resolve(here, "../../../samples/receipts");
const extractor = createClaudeExtractor({
  model: process.env.EXTRACTION_MODEL || "claude-opus-5-5",
  effort: (process.env.EXTRACTION_EFFORT || "medium") as Effort,
});

function compare(expected: ExtractedReceipt, actual: ExtractedReceipt): string[] {
  const problems: string[] = [];
  for (const field of ["store", "date", "total"] as const) {
    if (String(expected[field]).toLowerCase() !== String(actual[field]).toLowerCase()) {
      problems.push(`${field}: expected ${expected[field]}, got ${actual[field]}`);
    }
  }
  if (expected.items.length !== actual.items.length) {
    problems.push(`item count: expected ${expected.items.length}, got ${actual.items.length}`);
  }
  expected.items.forEach((e, i) => {
    const a = actual.items[i];
    if (!a) return;
    if (toCents(e.price) !== toCents(a.price)) problems.push(`item ${i + 1} "${e.name_original}": price ${e.price} vs ${a.price} ("${a.name_original}")`);
    if (e.quantity !== a.quantity) problems.push(`item ${i + 1} "${e.name_original}": quantity ${e.quantity} vs ${a.quantity}`);
  });
  return problems;
}

let failures = 0;
for (const [key, expected] of Object.entries(RECEIPT_FIXTURES)) {
  const file = [".jpg", ".jpeg", ".png"].map((ext) => path.join(samplesDir, key + ext)).find(existsSync);
  if (!file) {
    console.log(`SKIP ${key}: no photo in samples/receipts/`);
    continue;
  }
  const mediaType = file.endsWith(".png") ? "image/png" : "image/jpeg";
  const started = Date.now();
  const { receipt, model } = await extractor.extract({ imageBase64: readFileSync(file).toString("base64"), mediaType });
  const problems = compare(expected, receipt);
  const status = problems.length === 0 ? "PASS" : "FAIL";
  if (problems.length) failures++;
  console.log(`${status} ${key} (${model}, ${((Date.now() - started) / 1000).toFixed(1)}s)`);
  for (const p of problems) console.log(`   - ${p}`);
  for (const w of checkReceipt(receipt)) console.log(`   warning: ${w.message}`);
  receipt.items.forEach((item) => console.log(`   ${item.name_original} -> ${item.name_en}`));
}
process.exitCode = failures ? 1 : 0;
