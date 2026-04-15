import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

export interface ExtractedReceiptData {
  merchantName: string | null;
  amount: string | null;
  currency: string | null;
  transactionDate: string | null;
}

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);
  private openai?: OpenAI;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>("openai.apiKey");
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async extractFromReceipt(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<ExtractedReceiptData> {
    if (!this.openai) {
      this.logger.warn("OPENAI_API_KEY not set — skipping AI extraction");
      return {
        merchantName: null,
        amount: null,
        currency: null,
        transactionDate: null,
      };
    }

    try {
      const base64 = fileBuffer.toString("base64");
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract the following from this receipt and return ONLY valid JSON with these keys:
                  merchantName (string or null),
                  amount (decimal string or null),
                  currency (ISO 4217 code or null),
                  transactionDate (ISO 8601 date string or null).
                  Do not include any explanation outside the JSON.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
        max_tokens: 200,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content ?? "{}";
      return JSON.parse(content) as ExtractedReceiptData;
    } catch (err) {
      this.logger.error("Receipt extraction failed", err);
      return {
        merchantName: null,
        amount: null,
        currency: null,
        transactionDate: null,
      };
    }
  }
}
