import Anthropic from '@anthropic-ai/sdk';

export const ANTHROPIC_CLIENT = Symbol('ANTHROPIC_CLIENT');

const DEFAULT_MODEL = 'claude-opus-4-7';

export interface AnthropicClient {
  /**
   * Sends a PDF to Claude with a strict-JSON system prompt and returns
   * the parsed (but un-validated) assistant reply. Validation is the
   * caller's responsibility — keeps this client a thin SDK wrapper.
   *
   * Throws:
   *  - `Error("ANTHROPIC_API_KEY not configured")` if env is missing.
   *  - `Error("Extraction service unavailable")` on SDK / network failure.
   *  - `InvoiceExtractionParseError` with `rawText` if the assistant's
   *    reply isn't valid JSON.
   */
  extractInvoice(pdfBuffer: Buffer): Promise<unknown>;
}

export class InvoiceExtractionParseError extends Error {
  constructor(public readonly rawText: string) {
    super("Couldn't parse PDF");
    this.name = 'InvoiceExtractionParseError';
  }
}

const INVOICE_SYSTEM_PROMPT = `You are an invoice extraction service. Given a PDF invoice, return a single JSON
object that EXACTLY matches this TypeScript shape. Do NOT include markdown, prose,
or any text outside the JSON.

{
  "number": string | null,                  // invoice number / id
  "issuedAt": string | null,                // ISO date "YYYY-MM-DD"
  "dueAt": string | null,                   // ISO date "YYYY-MM-DD"
  "fromAgent": { "name": string },          // seller / issuer
  "toAgent":   { "name": string },          // buyer / recipient
  "currency":  { "name": string },          // ISO code (USD, EUR, …) or full name
  "items": Array<{
    "description": string,
    "valueName": string | undefined,        // optional — if a SKU/product name is present
    "quantity":  string,                    // decimal, up to 2 fractional digits
    "unitPrice": string,
    "total":     string
  }>,
  "notes": string | null
}

Rules:
- If you cannot find a field, use null (or omit "valueName" for items).
- All money amounts: decimal strings, 2 dp, no thousands separators.
- All dates: ISO "YYYY-MM-DD". Convert from any other format you see.
- Use the currency symbol/code as it appears on the invoice (e.g. "USD" not "$").
- Output ONLY the JSON. No commentary, no markdown fences.`;

export class RealAnthropicClient implements AnthropicClient {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (this.client) return this.client;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    this.client = new Anthropic({ apiKey });
    return this.client;
  }

  private getModel(): string {
    return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  }

  async extractInvoice(pdfBuffer: Buffer): Promise<unknown> {
    const client = this.getClient();
    const model = this.getModel();

    let response;
    try {
      // The PDF `document` content block isn't in this SDK's TypeScript
      // definitions yet, but is supported at the API level. Cast through
      // unknown to keep the call site honest about the workaround.
      const messages = [
        {
          role: 'user' as const,
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBuffer.toString('base64'),
              },
            },
            {
              type: 'text',
              text: 'Extract the invoice fields and return the JSON object described in the system prompt.',
            },
          ],
        },
      ];
      response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: INVOICE_SYSTEM_PROMPT,
        messages: messages as unknown as Anthropic.Messages.MessageParam[],
      });
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('ANTHROPIC_API_KEY')) throw err;
      const message = err instanceof Error ? err.message : 'unknown error';
      throw new Error(`Extraction service unavailable: ${message}`);
    }

    const textBlock = response.content.find((c) => c.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new InvoiceExtractionParseError('');
    }
    const raw = textBlock.text.trim();

    // Strip leading/trailing markdown fences if Claude ignored the rule
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      throw new InvoiceExtractionParseError(raw);
    }
  }
}
