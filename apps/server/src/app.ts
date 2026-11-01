import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import type { ExtractResponse } from "@bill-manager/shared";
import { ExtractionError, SUPPORTED_MEDIA_TYPES, type Extractor } from "./extract/types";

/** Base64 of a ~7.5 MB image. The app resizes photos well below this before upload. */
const MAX_BODY_BYTES = 10 * 1024 * 1024;

const ExtractRequestSchema = z.object({
  image: z.string().min(1),
  mediaType: z.enum(SUPPORTED_MEDIA_TYPES),
});

export type AppOptions = {
  extractor: Extractor;
  /** If set, requests to /extract must send it in the x-app-token header. */
  appToken?: string;
};

function tokensMatch(given: string | undefined, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createApp({ extractor, appToken }: AppOptions) {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));

  app.post(
    "/extract",
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) => c.json({ error: "Image is too large." }, 413),
    }),
    async (c) => {
      if (appToken && !tokensMatch(c.req.header("x-app-token"), appToken)) {
        return c.json({ error: "Unauthorized." }, 401);
      }

      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: "Body must be JSON." }, 400);
      }
      const parsed = ExtractRequestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: `Expected { image: base64 string, mediaType: one of ${SUPPORTED_MEDIA_TYPES.join(", ")} }.` }, 400);
      }

      try {
        const result = await extractor.extract({ imageBase64: parsed.data.image, mediaType: parsed.data.mediaType });
        const response: ExtractResponse = { receipt: result.receipt, model: result.model };
        return c.json(response);
      } catch (error) {
        if (error instanceof ExtractionError) {
          return c.json({ error: error.message, retryable: error.retryable }, error.retryable ? 503 : 422);
        }
        console.error("Unexpected extraction failure", error);
        return c.json({ error: "Something went wrong while reading the receipt.", retryable: true }, 500);
      }
    },
  );

  return app;
}
