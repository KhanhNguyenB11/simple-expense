import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ExtractedReceiptData {
  merchantName: string | null;
  amount: string | null;
  currency: string | null;
  transactionDate: string | null;
}

type GeminiJson = Partial<{
  merchantName: unknown;
  amount: unknown;
  currency: unknown;
  transactionDate: unknown;
}>;

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);
  private gemini?: GoogleGenerativeAI;
  private modelName: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>("gemini.apiKey");
    this.modelName =
      this.config.get<string>("gemini.model") ?? "gemini-2.5-flash-lite";
    if (apiKey) this.gemini = new GoogleGenerativeAI(apiKey);
  }

  private empty(): ExtractedReceiptData {
    return {
      merchantName: null,
      amount: null,
      currency: null,
      transactionDate: null,
    };
  }

  private safeString(v: unknown): string | null {
    if (typeof v !== "string") return null;
    const s = v.trim();
    return s.length ? s : null;
  }

  private normalizeCurrency(v: unknown): string | null {
    const s = this.safeString(v);
    if (!s) return null;
    const up = s.toUpperCase();
    // Keep simple: accept 3-letter currency code, else null.
    return /^[A-Z]{3}$/.test(up) ? up : null;
  }

  private normalizeAmount(v: unknown): string | null {
    const s = this.safeString(v);
    if (!s) return null;
    // Allow "12.34" or "12,34" etc. Normalize to dot.
    const cleaned = s.replace(/,/g, ".").replace(/[^\d.]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n.toFixed(2);
  }

  private normalizeDate(v: unknown): string | null {
    const s = this.safeString(v);
    if (!s) return null;
    // Expect ISO date or a parseable date; return YYYY-MM-DD.
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  private parseFirstJsonObject(text: string): GeminiJson | null {
    const trimmed = text.trim();
    if (!trimmed) return null;

    // Common Gemini responses sometimes include markdown fences. Strip them.
    const noFences = trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    // Try direct parse first.
    try {
      const parsed = JSON.parse(noFences);
      if (parsed && typeof parsed === "object") return parsed as GeminiJson;
    } catch {
      // fallthrough
    }

    // Fallback: extract first {...} substring.
    const start = noFences.indexOf("{");
    const end = noFences.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    const candidate = noFences.slice(start, end + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed as GeminiJson;
    } catch {
      return null;
    }
    return null;
  }

  async extractFromReceipt(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<ExtractedReceiptData> {
    if (!this.gemini) {
      this.logger.warn("GEMINI_API_KEY not set — skipping AI extraction");
      return this.empty();
    }

    try {
      const base64 = fileBuffer.toString("base64");
      const model = this.gemini.getGenerativeModel({ model: this.modelName });
      const result = await model.generateContent([
        {
          text: [
            "You are extracting structured data from a receipt image.",
            "Return ONLY a JSON object (no markdown, no prose) with these keys:",
            "",
            '  {',
            '    "merchantName": string | null,',
            '    "amount": string | null,',
            '    "currency": string | null,',
            '    "transactionDate": string | null',
            "  }",
            "",
            "- merchantName: the store / company name at the top of the receipt.",
            "  It may be labelled as the business name, store name, or appear as a big title.",
            "",
            "- amount: the TOTAL amount the customer paid for the receipt (including tax if shown).",
            "  Prefer a line labelled like 'Total', 'Amount Due', 'Total Paid', or similar.",
            "  If both subtotal and total are present, use the grand total.",
            "",
            "- currency: a 3-letter ISO 4217 code (e.g. USD, EUR, GBP, JPY) inferred from the receipt.",
            "  If the symbol is $, assume USD unless the country clearly indicates a different currency.",
            "",
            "- transactionDate: the purchase date, ideally in YYYY-MM-DD.",
            "  If the receipt shows a date and time, use the date portion.",
            "",
            "If you cannot confidently find a field, set it to null.",
            "Do not include any explanation or text outside the JSON.",
          ].join("\n"),
        },
        {
          inlineData: {
            mimeType,
            data: base64,
          },
        },
      ]);

      const text = result.response.text();
      const json = this.parseFirstJsonObject(text);
      if (!json) return this.empty();

      return {
        merchantName: this.safeString(json.merchantName),
        amount: this.normalizeAmount(json.amount),
        currency: this.normalizeCurrency(json.currency),
        transactionDate: this.normalizeDate(json.transactionDate),
      };
    } catch (err) {
      this.logger.error("Receipt extraction failed", err);
      return this.empty();
    }
  }
}
