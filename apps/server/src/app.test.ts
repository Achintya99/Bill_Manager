import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createMockExtractor } from "./extract/mock";
import { ExtractionError, type Extractor } from "./extract/types";

const body = JSON.stringify({ image: "aGVsbG8=", mediaType: "image/jpeg" });
const post = (app: ReturnType<typeof createApp>, init: RequestInit = {}) =>
  app.request("/extract", { method: "POST", body, headers: { "content-type": "application/json" }, ...init });

describe("POST /extract", () => {
  it("returns the extracted receipt", async () => {
    const res = await post(createApp({ extractor: createMockExtractor() }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.model).toBe("mock");
    expect(json.receipt.store).toBe("Mercadona");
    expect(json.receipt.items).toHaveLength(15);
  });

  it("rejects requests without the app token when one is configured", async () => {
    const app = createApp({ extractor: createMockExtractor(), appToken: "secret" });
    expect((await post(app)).status).toBe(401);
    const ok = await post(app, { headers: { "content-type": "application/json", "x-app-token": "secret" } });
    expect(ok.status).toBe(200);
  });

  it("validates the request body", async () => {
    const app = createApp({ extractor: createMockExtractor() });
    const res = await post(app, { body: JSON.stringify({ image: "x", mediaType: "application/pdf" }) });
    expect(res.status).toBe(400);
    expect((await post(app, { body: "not json" })).status).toBe(400);
  });

  it("maps extraction errors to clear responses", async () => {
    const failing = (retryable: boolean): Extractor => ({
      extract: async () => {
        throw new ExtractionError("nope", retryable);
      },
    });
    const notRetryable = await post(createApp({ extractor: failing(false) }));
    expect(notRetryable.status).toBe(422);
    expect(await notRetryable.json()).toEqual({ error: "nope", retryable: false });
    expect((await post(createApp({ extractor: failing(true) }))).status).toBe(503);
  });
});

describe("GET /health", () => {
  it("responds ok", async () => {
    const res = await createApp({ extractor: createMockExtractor() }).request("/health");
    expect(await res.json()).toEqual({ ok: true });
  });
});
