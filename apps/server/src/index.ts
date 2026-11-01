import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createClaudeExtractor, type Effort } from "./extract/claude";
import { createMockExtractor } from "./extract/mock";
import type { Extractor } from "./extract/types";

// Load apps/server/.env if present (Node's built-in loader; no dotenv dependency).
try {
  process.loadEnvFile(new URL("../.env", import.meta.url));
} catch {
  // No .env file: rely on the real environment.
}

const EFFORTS: Effort[] = ["low", "medium", "high", "xhigh", "max"];
const port = Number(process.env.PORT ?? 8787);
const model = process.env.EXTRACTION_MODEL || "claude-opus-5-5";
const effort = (process.env.EXTRACTION_EFFORT || "medium") as Effort;
if (!EFFORTS.includes(effort)) {
  throw new Error(`EXTRACTION_EFFORT must be one of ${EFFORTS.join(", ")}`);
}

let extractor: Extractor;
if (process.env.EXTRACTOR === "mock") {
  extractor = createMockExtractor();
  console.log("Using the MOCK extractor: every scan returns the sample Mercadona receipt.");
} else {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("ANTHROPIC_API_KEY is not set. Scans will fail. Set it in apps/server/.env, or use EXTRACTOR=mock.");
  }
  extractor = createClaudeExtractor({ model, effort });
  console.log(`Using ${model} (effort: ${effort}) to read receipts.`);
}

const appToken = process.env.APP_TOKEN || undefined;
if (!appToken) {
  console.warn("APP_TOKEN is not set: anyone who can reach this server can use your API key.");
}

serve({ fetch: createApp({ extractor, appToken }).fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`Receipt server listening on http://0.0.0.0:${info.port}`);
});
