import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Value } from '../values/entities/value.entity';
import { ValueInstance } from '../value-instances/entities/value-instance.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import { Channel } from '../channels/channel.entity';
import { File } from '../files/entities/file.entity';
import {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  PaginationQuery,
} from '@marketlum/shared';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly itemRepository: Repository<InvoiceItem>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    @InjectRepository(ValueInstance)
    private readonly valueInstanceRepository: Repository<ValueInstance>,
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: Repository<ValueStream>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
  ) {}

  async create(input: CreateInvoiceInput): Promise<Invoice> {
    const {
      fromAgentId,
      toAgentId,
      currencyId,
      fileId,
      valueStreamId,
      channelId,
      items,
      ...rest
    } = input;

    // Validate fromAgent
    const fromAgent = await this.agentRepository.findOne({
      where: { id: fromAgentId },
    });
    if (!fromAgent) throw new NotFoundException('From agent not found');

    // Validate toAgent
    const toAgent = await this.agentRepository.findOne({
      where: { id: toAgentId },
    });
    if (!toAgent) throw new NotFoundException('To agent not found');

    // Validate currency
    const currency = await this.valueRepository.findOne({
      where: { id: currencyId },
    });
    if (!currency) throw new NotFoundException('Currency not found');

    // Validate file if provided
    if (fileId) {
      const file = await this.fileRepository.findOne({ where: { id: fileId } });
      if (!file) throw new NotFoundException('File not found');
    }

    // Validate valueStream if provided
    if (valueStreamId) {
      const vs = await this.valueStreamRepository.findOne({
        where: { id: valueStreamId },
      });
      if (!vs) throw new NotFoundException('Value stream not found');
    }

    // Validate channel if provided
    if (channelId) {
      const ch = await this.channelRepository.findOne({
        where: { id: channelId },
      });
      if (!ch) throw new NotFoundException('Channel not found');
    }

    // Check unique constraint (fromAgentId, number)
    const existing = await this.invoiceRepository.findOne({
      where: { fromAgentId, number: rest.number },
    });
    if (existing) {
      throw new ConflictException(
        'Invoice number already exists for this agent',
      );
    }

    const invoice = this.invoiceRepository.create({
      ...rest,
      fromAgentId,
      toAgentId,
      currencyId,
      issuedAt: new Date(rest.issuedAt),
      dueAt: new Date(rest.dueAt),
      link: rest.link ?? null,
      fileId: fileId ?? null,
      valueStreamId: valueStreamId ?? null,
      channelId: channelId ?? null,
    });

    const saved = await this.invoiceRepository.save(invoice);

    if (items && items.length > 0) {
      await this.replaceItems(saved.id, items);
    }

    return this.findOne(saved.id);
  }

  async search(
    query: PaginationQuery & {
      fromAgentId?: string;
      toAgentId?: string;
      paid?: string;
      currencyId?: string;
      channelId?: string;
    },
  ) {
    const {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      fromAgentId,
      toAgentId,
      paid,
      currencyId,
      channelId,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.invoiceRepository.createQueryBuilder('invoice');

    qb.leftJoinAndSelect('invoice.fromAgent', 'fromAgent');
    qb.leftJoinAndSelect('invoice.toAgent', 'toAgent');
    qb.leftJoinAndSelect('invoice.currency', 'currency');
    qb.leftJoinAndSelect('invoice.file', 'file');
    qb.leftJoinAndSelect('invoice.valueStream', 'valueStream');
    qb.leftJoinAndSelect('invoice.channel', 'channel');

    // Computed total subquery
    qb.addSelect(
      `(SELECT COALESCE(SUM(ii.total), 0) FROM invoice_items ii WHERE ii."invoiceId" = invoice.id)`,
      'invoice_total',
    );

    if (fromAgentId) {
      qb.andWhere('invoice.fromAgentId = :fromAgentId', { fromAgentId });
    }

    if (toAgentId) {
      qb.andWhere('invoice.toAgentId = :toAgentId', { toAgentId });
    }

    if (paid !== undefined) {
      qb.andWhere('invoice.paid = :paid', { paid: paid === 'true' });
    }

    if (currencyId) {
      qb.andWhere('invoice.currencyId = :currencyId', { currencyId });
    }

    if (channelId) {
      qb.andWhere('invoice.channelId = :channelId', { channelId });
    }

    if (search) {
      qb.andWhere(
        '(invoice.number ILIKE :search OR fromAgent.name ILIKE :search OR toAgent.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      if (sortBy === 'total') {
        qb.orderBy('invoice_total', sortOrder || 'ASC');
      } else {
        qb.orderBy(`invoice.${sortBy}`, sortOrder || 'ASC');
      }
    } else {
      qb.orderBy('invoice.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const { raw, entities } = await qb.getRawAndEntities();

    // Map computed total onto entities
    for (let i = 0; i < entities.length; i++) {
      entities[i].total = Number(raw[i].invoice_total).toFixed(2);
    }

    // Get total count
    const countQb = this.invoiceRepository.createQueryBuilder('invoice');
    countQb.leftJoin('invoice.fromAgent', 'fromAgent');
    countQb.leftJoin('invoice.toAgent', 'toAgent');

    if (fromAgentId) {
      countQb.andWhere('invoice.fromAgentId = :fromAgentId', { fromAgentId });
    }
    if (toAgentId) {
      countQb.andWhere('invoice.toAgentId = :toAgentId', { toAgentId });
    }
    if (paid !== undefined) {
      countQb.andWhere('invoice.paid = :paid', { paid: paid === 'true' });
    }
    if (currencyId) {
      countQb.andWhere('invoice.currencyId = :currencyId', { currencyId });
    }
    if (channelId) {
      countQb.andWhere('invoice.channelId = :channelId', { channelId });
    }
    if (search) {
      countQb.andWhere(
        '(invoice.number ILIKE :search OR fromAgent.name ILIKE :search OR toAgent.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await countQb.getCount();

    return {
      data: entities,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: [
        'fromAgent',
        'toAgent',
        'currency',
        'file',
        'valueStream',
        'channel',
        'items',
        'items.value',
        'items.valueInstance',
      ],
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Compute total from items
    const result = await this.invoiceRepository.query(
      `SELECT COALESCE(SUM(total), 0) as total FROM invoice_items WHERE "invoiceId" = $1`,
      [id],
    );
    invoice.total = Number(result[0].total).toFixed(2);

    return invoice;
  }

  async update(id: string, input: UpdateInvoiceInput): Promise<Invoice> {
    const invoice = await this.findOne(id);
    const {
      fromAgentId,
      toAgentId,
      currencyId,
      fileId,
      valueStreamId,
      channelId,
      items,
      ...rest
    } = input;

    if (rest.number !== undefined) invoice.number = rest.number;
    if (rest.issuedAt !== undefined)
      invoice.issuedAt = new Date(rest.issuedAt);
    if (rest.dueAt !== undefined) invoice.dueAt = new Date(rest.dueAt);
    if (rest.paid !== undefined) invoice.paid = rest.paid;
    if (rest.link !== undefined) invoice.link = rest.link ?? null;

    if (fromAgentId !== undefined) {
      const agent = await this.agentRepository.findOne({
        where: { id: fromAgentId },
      });
      if (!agent) throw new NotFoundException('From agent not found');
      invoice.fromAgentId = fromAgentId;
    }

    if (toAgentId !== undefined) {
      const agent = await this.agentRepository.findOne({
        where: { id: toAgentId },
      });
      if (!agent) throw new NotFoundException('To agent not found');
      invoice.toAgentId = toAgentId;
    }

    if (currencyId !== undefined) {
      const currency = await this.valueRepository.findOne({
        where: { id: currencyId },
      });
      if (!currency) throw new NotFoundException('Currency not found');
      invoice.currencyId = currencyId;
    }

    if (fileId !== undefined) {
      if (fileId === null) {
        invoice.file = null;
        invoice.fileId = null;
      } else {
        const file = await this.fileRepository.findOne({
          where: { id: fileId },
        });
        if (!file) throw new NotFoundException('File not found');
        invoice.fileId = fileId;
      }
    }

    if (valueStreamId !== undefined) {
      if (valueStreamId === null) {
        invoice.valueStream = null;
        invoice.valueStreamId = null;
      } else {
        const vs = await this.valueStreamRepository.findOne({
          where: { id: valueStreamId },
        });
        if (!vs) throw new NotFoundException('Value stream not found');
        invoice.valueStreamId = valueStreamId;
      }
    }

    if (channelId !== undefined) {
      if (channelId === null) {
        invoice.channel = null;
        invoice.channelId = null;
      } else {
        const ch = await this.channelRepository.findOne({
          where: { id: channelId },
        });
        if (!ch) throw new NotFoundException('Channel not found');
        invoice.channelId = channelId;
      }
    }

    // Check unique constraint on update
    const effectiveFromAgentId = fromAgentId ?? invoice.fromAgentId;
    const effectiveNumber = rest.number ?? invoice.number;
    const existing = await this.invoiceRepository.findOne({
      where: { fromAgentId: effectiveFromAgentId, number: effectiveNumber },
    });
    if (existing && existing.id !== id) {
      throw new ConflictException(
        'Invoice number already exists for this agent',
      );
    }

    // Delete items relation before save to avoid cascade inserting malformed rows
    delete (invoice as any).items;
    delete (invoice as any).fromAgent;
    delete (invoice as any).toAgent;
    delete (invoice as any).currency;
    delete (invoice as any).file;
    delete (invoice as any).valueStream;
    delete (invoice as any).channel;
    delete (invoice as any).total;
    await this.invoiceRepository.save(invoice);

    if (items !== undefined) {
      await this.replaceItems(id, items);
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    await this.invoiceRepository.remove(invoice);
  }

  private async replaceItems(
    invoiceId: string,
    items: {
      valueId?: string | null;
      valueInstanceId?: string | null;
      quantity: string;
      unitPrice: string;
      total: string;
    }[],
  ): Promise<void> {
    // Delete existing items
    await this.itemRepository.delete({ invoiceId });

    if (items.length === 0) return;

    // Validate value FKs (deduplicate to avoid false mismatch)
    const valueIdSet = [...new Set(items.filter((i) => i.valueId).map((i) => i.valueId as string))];
    if (valueIdSet.length > 0) {
      const values = await this.valueRepository.findBy({
        id: In(valueIdSet),
      });
      if (values.length !== valueIdSet.length) {
        throw new NotFoundException('One or more values not found');
      }
    }

    // Validate valueInstance FKs (deduplicate)
    const viIdSet = [...new Set(items.filter((i) => i.valueInstanceId).map((i) => i.valueInstanceId as string))];
    if (viIdSet.length > 0) {
      const instances = await this.valueInstanceRepository.findBy({
        id: In(viIdSet),
      });
      if (instances.length !== viIdSet.length) {
        throw new NotFoundException('One or more value instances not found');
      }
    }

    // Bulk create new items
    const entities = items.map((item) =>
      this.itemRepository.create({
        invoiceId,
        valueId: item.valueId ?? null,
        valueInstanceId: item.valueInstanceId ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      }),
    );
    await this.itemRepository.save(entities);
  }
}
