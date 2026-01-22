import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreateInvoiceItemDto } from './dto/create-invoice-item.dto';
import { UpdateInvoiceItemDto } from './dto/update-invoice-item.dto';
import { Agent } from '../agents/entities/agent.entity';
import { FileUpload } from '../files/entities/file-upload.entity';
import { Value, ValueType } from '../value/entities/value.entity';
import { ValueInstance } from '../value-instances/entities/value-instance.entity';

interface FindAllOptions {
  q?: string;
  fromAgentId?: string;
  toAgentId?: string;
  issuedFrom?: string;
  issuedTo?: string;
  dueFrom?: string;
  dueTo?: string;
  hasFile?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly itemRepository: Repository<InvoiceItem>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    @InjectRepository(ValueInstance)
    private readonly valueInstanceRepository: Repository<ValueInstance>,
  ) {}

  async findAll(options: FindAllOptions): Promise<{ data: Invoice[]; total: number; page: number; pageSize: number }> {
    const {
      q,
      fromAgentId,
      toAgentId,
      issuedFrom,
      issuedTo,
      dueFrom,
      dueTo,
      hasFile,
      sort = 'issuedAt_desc',
      page = 1,
      pageSize = 20,
    } = options;

    const qb = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.fromAgent', 'fromAgent')
      .leftJoinAndSelect('invoice.toAgent', 'toAgent')
      .leftJoinAndSelect('invoice.file', 'file')
      .loadRelationCountAndMap('invoice.itemsCount', 'invoice.items');

    if (q) {
      qb.andWhere('(invoice.number ILIKE :q OR invoice.note ILIKE :q)', { q: `%${q}%` });
    }

    if (fromAgentId) {
      qb.andWhere('invoice.fromAgentId = :fromAgentId', { fromAgentId });
    }

    if (toAgentId) {
      qb.andWhere('invoice.toAgentId = :toAgentId', { toAgentId });
    }

    if (issuedFrom) {
      qb.andWhere('invoice.issuedAt >= :issuedFrom', { issuedFrom });
    }

    if (issuedTo) {
      qb.andWhere('invoice.issuedAt <= :issuedTo', { issuedTo });
    }

    if (dueFrom) {
      qb.andWhere('invoice.dueAt >= :dueFrom', { dueFrom });
    }

    if (dueTo) {
      qb.andWhere('invoice.dueAt <= :dueTo', { dueTo });
    }

    if (hasFile !== undefined) {
      if (hasFile) {
        qb.andWhere('invoice.fileId IS NOT NULL');
      } else {
        qb.andWhere('invoice.fileId IS NULL');
      }
    }

    // Sorting
    const [sortField, sortDir] = sort.split('_');
    const orderDir = sortDir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    switch (sortField) {
      case 'number':
        qb.orderBy('invoice.number', orderDir);
        break;
      case 'dueAt':
        qb.orderBy('invoice.dueAt', orderDir);
        break;
      case 'updatedAt':
        qb.orderBy('invoice.updatedAt', orderDir);
        break;
      default:
        qb.orderBy('invoice.issuedAt', orderDir);
    }

    const [data, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { data, total, page, pageSize };
  }

  async findOne(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: [
        'fromAgent',
        'toAgent',
        'file',
        'items',
        'items.value',
        'items.valueInstance',
        'items.valueInstance.value',
      ],
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async create(dto: CreateInvoiceDto): Promise<Invoice> {
    // Validate agents exist
    const fromAgent = await this.agentRepository.findOne({ where: { id: dto.fromAgentId } });
    if (!fromAgent) {
      throw new BadRequestException('From Agent not found');
    }

    const toAgent = await this.agentRepository.findOne({ where: { id: dto.toAgentId } });
    if (!toAgent) {
      throw new BadRequestException('To Agent not found');
    }

    // Validate dates
    const issuedAt = new Date(dto.issuedAt);
    const dueAt = new Date(dto.dueAt);
    if (dueAt < issuedAt) {
      throw new BadRequestException('Due date cannot be before issue date');
    }

    // Validate file exists
    if (dto.fileId) {
      const file = await this.fileRepository.findOne({ where: { id: dto.fileId } });
      if (!file) {
        throw new BadRequestException('File not found');
      }
    }

    // Check number uniqueness within fromAgent
    const existingInvoice = await this.invoiceRepository.findOne({
      where: { fromAgentId: dto.fromAgentId, number: dto.number },
    });
    if (existingInvoice) {
      throw new BadRequestException('Invoice number already exists for this agent');
    }

    const invoice = this.invoiceRepository.create({
      fromAgentId: dto.fromAgentId,
      toAgentId: dto.toAgentId,
      number: dto.number,
      issuedAt: issuedAt,
      dueAt: dueAt,
      link: dto.link || null,
      fileId: dto.fileId || null,
      note: dto.note || null,
    });

    return this.invoiceRepository.save(invoice);
  }

  async update(id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    const invoice = await this.findOne(id);

    // Validate agents if being changed
    if (dto.fromAgentId && dto.fromAgentId !== invoice.fromAgentId) {
      const fromAgent = await this.agentRepository.findOne({ where: { id: dto.fromAgentId } });
      if (!fromAgent) {
        throw new BadRequestException('From Agent not found');
      }
    }

    if (dto.toAgentId && dto.toAgentId !== invoice.toAgentId) {
      const toAgent = await this.agentRepository.findOne({ where: { id: dto.toAgentId } });
      if (!toAgent) {
        throw new BadRequestException('To Agent not found');
      }
    }

    // Validate dates
    const issuedAt = dto.issuedAt ? new Date(dto.issuedAt) : invoice.issuedAt;
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : invoice.dueAt;
    if (dueAt < issuedAt) {
      throw new BadRequestException('Due date cannot be before issue date');
    }

    // Validate file exists
    if (dto.fileId) {
      const file = await this.fileRepository.findOne({ where: { id: dto.fileId } });
      if (!file) {
        throw new BadRequestException('File not found');
      }
    }

    // Check number uniqueness if being changed
    if (dto.number && (dto.number !== invoice.number || dto.fromAgentId !== invoice.fromAgentId)) {
      const checkFromAgentId = dto.fromAgentId || invoice.fromAgentId;
      const existingInvoice = await this.invoiceRepository.findOne({
        where: { fromAgentId: checkFromAgentId, number: dto.number },
      });
      if (existingInvoice && existingInvoice.id !== id) {
        throw new BadRequestException('Invoice number already exists for this agent');
      }
    }

    // Update fields
    if (dto.fromAgentId !== undefined) invoice.fromAgentId = dto.fromAgentId;
    if (dto.toAgentId !== undefined) invoice.toAgentId = dto.toAgentId;
    if (dto.number !== undefined) invoice.number = dto.number;
    if (dto.issuedAt !== undefined) invoice.issuedAt = new Date(dto.issuedAt);
    if (dto.dueAt !== undefined) invoice.dueAt = new Date(dto.dueAt);
    if (dto.link !== undefined) invoice.link = dto.link || null;
    if (dto.fileId !== undefined) invoice.fileId = dto.fileId || null;
    if (dto.note !== undefined) invoice.note = dto.note || null;

    return this.invoiceRepository.save(invoice);
  }

  async delete(id: string): Promise<void> {
    const invoice = await this.findOne(id);
    await this.invoiceRepository.remove(invoice);
  }

  // Invoice Items
  async addItem(invoiceId: string, dto: CreateInvoiceItemDto): Promise<InvoiceItem> {
    const invoice = await this.findOne(invoiceId);

    // Validate XOR rule
    if (!dto.valueId && !dto.valueInstanceId) {
      throw new BadRequestException('Either valueId or valueInstanceId must be provided');
    }
    if (dto.valueId && dto.valueInstanceId) {
      throw new BadRequestException('Only one of valueId or valueInstanceId can be provided');
    }

    // Validate value or valueInstance exists
    if (dto.valueId) {
      const value = await this.valueRepository.findOne({ where: { id: dto.valueId } });
      if (!value) {
        throw new BadRequestException('Value not found');
      }

      // Check for duplicates
      const existing = await this.itemRepository.findOne({
        where: { invoiceId, valueId: dto.valueId },
      });
      if (existing) {
        throw new BadRequestException('This value is already in the invoice');
      }
    }

    if (dto.valueInstanceId) {
      const instance = await this.valueInstanceRepository.findOne({ where: { id: dto.valueInstanceId } });
      if (!instance) {
        throw new BadRequestException('Value Instance not found');
      }

      // Check for duplicates
      const existing = await this.itemRepository.findOne({
        where: { invoiceId, valueInstanceId: dto.valueInstanceId },
      });
      if (existing) {
        throw new BadRequestException('This value instance is already in the invoice');
      }
    }

    const item = this.itemRepository.create({
      invoiceId,
      valueId: dto.valueId || null,
      valueInstanceId: dto.valueInstanceId || null,
      quantity: dto.quantity,
      description: dto.description || null,
    });

    return this.itemRepository.save(item);
  }

  async updateItem(invoiceId: string, itemId: string, dto: UpdateInvoiceItemDto): Promise<InvoiceItem> {
    const item = await this.itemRepository.findOne({
      where: { id: itemId, invoiceId },
    });

    if (!item) {
      throw new NotFoundException('Invoice item not found');
    }

    // Validate XOR rule if changing references
    const newValueId = dto.valueId !== undefined ? dto.valueId : item.valueId;
    const newValueInstanceId = dto.valueInstanceId !== undefined ? dto.valueInstanceId : item.valueInstanceId;

    if (!newValueId && !newValueInstanceId) {
      throw new BadRequestException('Either valueId or valueInstanceId must be provided');
    }
    if (newValueId && newValueInstanceId) {
      throw new BadRequestException('Only one of valueId or valueInstanceId can be provided');
    }

    // Validate and check duplicates if changing value reference
    if (dto.valueId !== undefined && dto.valueId !== item.valueId) {
      if (dto.valueId) {
        const value = await this.valueRepository.findOne({ where: { id: dto.valueId } });
        if (!value) {
          throw new BadRequestException('Value not found');
        }

        const existing = await this.itemRepository.findOne({
          where: { invoiceId, valueId: dto.valueId },
        });
        if (existing && existing.id !== itemId) {
          throw new BadRequestException('This value is already in the invoice');
        }
      }
    }

    if (dto.valueInstanceId !== undefined && dto.valueInstanceId !== item.valueInstanceId) {
      if (dto.valueInstanceId) {
        const instance = await this.valueInstanceRepository.findOne({ where: { id: dto.valueInstanceId } });
        if (!instance) {
          throw new BadRequestException('Value Instance not found');
        }

        const existing = await this.itemRepository.findOne({
          where: { invoiceId, valueInstanceId: dto.valueInstanceId },
        });
        if (existing && existing.id !== itemId) {
          throw new BadRequestException('This value instance is already in the invoice');
        }
      }
    }

    // Update fields
    if (dto.valueId !== undefined) item.valueId = dto.valueId || null;
    if (dto.valueInstanceId !== undefined) item.valueInstanceId = dto.valueInstanceId || null;
    if (dto.quantity !== undefined) item.quantity = dto.quantity;
    if (dto.description !== undefined) item.description = dto.description || null;

    return this.itemRepository.save(item);
  }

  async removeItem(invoiceId: string, itemId: string): Promise<void> {
    const item = await this.itemRepository.findOne({
      where: { id: itemId, invoiceId },
    });

    if (!item) {
      throw new NotFoundException('Invoice item not found');
    }

    await this.itemRepository.remove(item);
  }

  async seed(): Promise<{ created: number }> {
    // Check if already seeded
    const existingCount = await this.invoiceRepository.count();
    if (existingCount > 0) {
      return { created: 0 };
    }

    // Get or create agents
    let marketlum = await this.agentRepository.findOne({ where: { name: 'Marketlum' } });
    if (!marketlum) {
      marketlum = await this.agentRepository.save(
        this.agentRepository.create({ name: 'Marketlum' }),
      );
    }

    let xyzInc = await this.agentRepository.findOne({ where: { name: 'XYZ Inc.' } });
    if (!xyzInc) {
      xyzInc = await this.agentRepository.save(
        this.agentRepository.create({ name: 'XYZ Inc.' }),
      );
    }

    // Get or create values
    let coachingValue = await this.valueRepository.findOne({ where: { name: 'Coaching Session' } });
    if (!coachingValue) {
      coachingValue = await this.valueRepository.save(
        this.valueRepository.create({ name: 'Coaching Session', type: ValueType.SERVICE }),
      );
    }

    let consultingValue = await this.valueRepository.findOne({ where: { name: 'Consulting' } });
    if (!consultingValue) {
      consultingValue = await this.valueRepository.save(
        this.valueRepository.create({ name: 'Consulting', type: ValueType.SERVICE }),
      );
    }

    const invoices: Invoice[] = [];

    // Invoice 1
    const invoice1 = await this.invoiceRepository.save(
      this.invoiceRepository.create({
        fromAgentId: marketlum.id,
        toAgentId: xyzInc.id,
        number: 'FV/2026/01/001',
        issuedAt: new Date('2026-01-10'),
        dueAt: new Date('2026-01-24'),
        note: 'January coaching services',
      }),
    );
    invoices.push(invoice1);

    // Add items to invoice 1
    await this.itemRepository.save(
      this.itemRepository.create({
        invoiceId: invoice1.id,
        valueId: coachingValue.id,
        quantity: 6,
        description: 'Executive coaching sessions',
      }),
    );

    // Invoice 2
    const invoice2 = await this.invoiceRepository.save(
      this.invoiceRepository.create({
        fromAgentId: marketlum.id,
        toAgentId: xyzInc.id,
        number: 'FV/2026/01/002',
        issuedAt: new Date('2026-01-15'),
        dueAt: new Date('2026-01-29'),
        note: 'Consulting engagement',
      }),
    );
    invoices.push(invoice2);

    // Add item to invoice 2
    await this.itemRepository.save(
      this.itemRepository.create({
        invoiceId: invoice2.id,
        valueId: consultingValue.id,
        quantity: 8,
        description: 'Strategic consulting hours',
      }),
    );

    return { created: invoices.length };
  }
}
