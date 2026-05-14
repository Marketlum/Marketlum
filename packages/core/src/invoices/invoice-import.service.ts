import {
  BadGatewayException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  PayloadTooLargeException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { PDFDocument } from 'pdf-lib';
import { ZodError } from 'zod';
import {
  ClaudeInvoiceExtraction,
  InvoiceImportResponse,
  claudeInvoiceExtractionSchema,
} from '@marketlum/shared';
import {
  ANTHROPIC_CLIENT,
  AnthropicClient,
  InvoiceExtractionParseError,
} from '../ai/anthropic.client';
import { FilesService } from '../files/files.service';
import { Agent } from '../agents/entities/agent.entity';
import { Value } from '../values/entities/value.entity';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_PAGES = 50;

@Injectable()
export class InvoiceImportService {
  private readonly logger = new Logger(InvoiceImportService.name);

  constructor(
    @Inject(ANTHROPIC_CLIENT)
    private readonly anthropic: AnthropicClient,
    private readonly filesService: FilesService,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
  ) {}

  async import(
    pdfBuffer: Buffer,
    mimetype: string,
    filename: string,
    sizeBytes: number,
  ): Promise<InvoiceImportResponse> {
    // 1. Gate: mimetype + size + page count
    if (mimetype !== 'application/pdf') {
      throw new UnsupportedMediaTypeException('Only application/pdf is supported');
    }
    if (sizeBytes > MAX_BYTES) {
      throw new PayloadTooLargeException('PDF exceeds 10 MB');
    }
    let pageCount = 0;
    try {
      const pdf = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      pageCount = pdf.getPageCount();
    } catch {
      throw new UnprocessableEntityException("Couldn't read the PDF");
    }
    if (pageCount > MAX_PAGES) {
      throw new UnprocessableEntityException(`PDF exceeds ${MAX_PAGES} pages`);
    }

    // 2. Extract via Claude
    let raw: unknown;
    try {
      raw = await this.anthropic.extractInvoice(pdfBuffer);
    } catch (err) {
      if (err instanceof InvoiceExtractionParseError) {
        throw new UnprocessableEntityException({
          message: "Couldn't parse the PDF",
          rawText: err.rawText,
        });
      }
      if (err instanceof Error && err.message.includes('ANTHROPIC_API_KEY')) {
        throw new InternalServerErrorException(
          'PDF import is not configured (missing ANTHROPIC_API_KEY)',
        );
      }
      const message = err instanceof Error ? err.message : 'unknown error';
      throw new BadGatewayException(`Extraction service unavailable: ${message}`);
    }

    // 3. Validate
    let extracted: ClaudeInvoiceExtraction;
    try {
      extracted = claudeInvoiceExtractionSchema.parse(raw);
    } catch (err) {
      const rawText = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
      const detail = err instanceof ZodError ? err.message : 'validation failed';
      this.logger.warn(`Invoice extraction validation failed: ${detail}`);
      throw new UnprocessableEntityException({
        message: "Couldn't parse the PDF",
        rawText,
      });
    }

    // 4. Persist PDF (only on extraction success)
    const fileRow = await this.filesService.upload({
      originalname: filename,
      mimetype,
      size: sizeBytes,
      buffer: pdfBuffer,
    });

    // 5. Resolve names (case-insensitive trimmed exact match)
    const fromAgentId = await this.findAgentByName(extracted.fromAgent.name);
    const toAgentId = await this.findAgentByName(extracted.toAgent.name);
    const currencyId = await this.findValueByName(extracted.currency.name);

    const itemsWithValue = await Promise.all(
      extracted.items.map(async (item) => {
        let value: { name: string; id: string | null } | null = null;
        if (item.valueName && item.valueName.trim()) {
          const id = await this.findValueByName(item.valueName);
          value = { name: item.valueName, id };
        }
        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          value,
        };
      }),
    );

    // 6. Compose warnings
    const warnings: string[] = [];
    if (fromAgentId === null) {
      warnings.push(`From agent "${extracted.fromAgent.name}" was not found.`);
    }
    if (toAgentId === null) {
      warnings.push(`To agent "${extracted.toAgent.name}" was not found.`);
    }
    if (currencyId === null) {
      warnings.push(`Currency "${extracted.currency.name}" was not found.`);
    }
    const itemsMissingValue = itemsWithValue.filter(
      (it) => it.value !== null && it.value.id === null,
    ).length;
    if (itemsMissingValue > 0) {
      warnings.push(
        `${itemsMissingValue} item${itemsMissingValue === 1 ? '' : 's'} without a matching Value.`,
      );
    }

    // 7. Log (token usage is opaque from the thin client wrapper today;
    //    log the result shape so we have a breadcrumb).
    this.logger.log(
      `invoice-import: pages=${pageCount} size=${sizeBytes} items=${extracted.items.length} ` +
        `warnings=${warnings.length} fileId=${fileRow.id}`,
    );

    // 8. Return
    return {
      fileId: fileRow.id,
      extracted: {
        number: extracted.number,
        issuedAt: extracted.issuedAt,
        dueAt: extracted.dueAt,
        fromAgent: { name: extracted.fromAgent.name, id: fromAgentId },
        toAgent: { name: extracted.toAgent.name, id: toAgentId },
        currency: { name: extracted.currency.name, id: currencyId },
        items: itemsWithValue,
        notes: extracted.notes,
      },
      warnings,
    };
  }

  private async findAgentByName(name: string): Promise<string | null> {
    if (!name || !name.trim()) return null;
    const row = await this.agentRepository.findOne({
      where: { name: ILike(name.trim()) },
    });
    return row ? row.id : null;
  }

  private async findValueByName(name: string): Promise<string | null> {
    if (!name || !name.trim()) return null;
    const row = await this.valueRepository.findOne({
      where: { name: ILike(name.trim()) },
    });
    return row ? row.id : null;
  }
}
