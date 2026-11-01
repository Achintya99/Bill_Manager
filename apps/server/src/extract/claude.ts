import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ExtractedReceiptSchema } from "@bill-manager/shared";
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_PROMPT } from "./prompt";
import { ExtractionError, type ExtractInput, type ExtractResult, type Extractor } from "./types";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export type ClaudeExtractorOptions = {
  model: string;
  effort: Effort;
  client?: Anthropic;
};

/** Reads receipts with a Claude vision model and structured outputs. */
export function createClaudeExtractor({ model, effort, client = new Anthropic() }: ClaudeExtractorOptions): Extractor {
  return {
    async extract({ imageBase64, mediaType }: ExtractInput): Promise<ExtractResult> {
      let response;
      try {
        response = await client.beta.messages.parse({
          model,
          max_tokens: 16000,
          // If a safety classifier declines, retry server-side on Anthropic's recommended fallback model.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: [{ type: "text", text: EXTRACTION_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
                { type: "text", text: EXTRACTION_USER_PROMPT },
              ],
            },
          ],
          output_config: { effort, format: betaZodOutputFormat(ExtractedReceiptSchema) },
        });
      } catch (error) {
        if (error instanceof Anthropic.RateLimitError) {
          throw new ExtractionError("The receipt reader is busy. Try again in a minute.", true);
        }
        if (error instanceof Anthropic.AuthenticationError) {
          throw new ExtractionError("The server's API key is missing or invalid.", false);
        }
        if (error instanceof Anthropic.BadRequestError) {
          throw new ExtractionError(`The image could not be processed: ${error.message}`, false);
        }
        if (error instanceof Anthropic.APIError) {
          throw new ExtractionError(`The receipt reader failed (status ${error.status}).`, true);
        }
        throw error;
      }

      if (response.stop_reason === "refusal") {
        throw new ExtractionError("The receipt reader declined this image.", false);
      }
      if (response.stop_reason === "max_tokens") {
        throw new ExtractionError("The receipt was too long to read in one go.", false);
      }
      if (!response.parsed_output) {
        throw new ExtractionError("The receipt reader returned data in an unexpected format.", true);
      }
      return { receipt: response.parsed_output, model: response.model };
    },
  };
}
