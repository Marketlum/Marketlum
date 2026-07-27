import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Value } from '../values/entities/value.entity';
import { ValueInstance } from '../value-instances/entities/value-instance.entity';
import { Channel } from '../channels/channel.entity';
import { File } from '../files/entities/file.entity';
import { Order } from '../orders/entities/order.entity';
import {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  PaginationQuery,
  OrderState,
  AgentType,
  InvoiceMarket,
  convertAmount,
  formatPresentationAmount,
  IDENTITY_RATE,
} from '@marketlum/shared';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

interface SnapshotInput {
  nativeValueId: string | null;
  nativeAmount: string;
}

interface PerspectiveSnapshot {
  rate: string | null;
  amount: string | null;
}

interface InvoiceItemSnapshot {
  presentationRate: string | null;
  presentationAmount: string | null;
  fromAgentRate: string | null;
  fromAgentAmount: string | null;
  toAgentRate: string | null;
  toAgentAmount: string | null;
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
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    @InjectRepository(ValueInstance)
    private readonly valueInstanceRepository: Repository<ValueInstance>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly systemSettingsService: SystemSettingsService,
  ) {}

  private async snapshotPerspective(
    sourceCurrencyId: string | null,
    targetCurrencyId: string | null,
    nativeAmount: string,
    at: Date,
  ): Promise<PerspectiveSnapshot> {
    if (!sourceCurrencyId || !targetCurrencyId) return { rate: null, amount: null };
    if (sourceCurrencyId === targetCurrencyId) {
      return { rate: IDENTITY_RATE, amount: formatPresentationAmount(nativeAmount) };
    }
    const lookup = await this.exchangeRatesService.lookup(
      sourceCurrencyId,
      targetCurrencyId,
      at,
    );
    if (!lookup) return { rate: null, amount: null };
    return { rate: lookup.rate, amount: convertAmount(nativeAmount, lookup.rate) };
  }

  private async snapshotItem(
    sourceCurrencyId: string,
    nativeAmount: string,
    fromAgentCurrencyId: string | null,
    toAgentCurrencyId: string | null,
    at: Date,
  ): Promise<InvoiceItemSnapshot> {
    const presentationCurrencyId =
      await this.systemSettingsService.getPresentationCurrencyId();
    const [presentation, fromAgent, toAgent] = await Promise.all([
      this.snapshotPerspective(sourceCurrencyId, presentationCurrencyId, nativeAmount, at),
      this.snapshotPerspective(sourceCurrencyId, fromAgentCurrencyId, nativeAmount, at),
      this.snapshotPerspective(sourceCurrencyId, toAgentCurrencyId, nativeAmount, at),
    ]);
    return {
      presentationRate: presentation.rate,
      presentationAmount: presentation.amount,
      fromAgentRate: fromAgent.rate,
      fromAgentAmount: fromAgent.amount,
      toAgentRate: toAgent.rate,
      toAgentAmount: toAgent.amount,
    };
  }

  private async resolveAgentCurrency(agentId: string): Promise<string | null> {
    const agent = await this.agentRepository.findOne({
      where: { id: agentId },
      select: ['id', 'functionalCurrencyId'],
    });
    return agent?.functionalCurrencyId ?? null;
  }

  /** I1 (spec 022): only legal entities (non-VIRTUAL agents) issue external invoices. */
  private assertLegalIssuer(fromAgentType: AgentType, market: InvoiceMarket): void {
    if (market === InvoiceMarket.EXTERNAL && fromAgentType === AgentType.VIRTUAL) {
      throw new UnprocessableEntityException(
        'Only legal entities can issue external invoices',
      );
    }
  }

  /** I2–I4 (spec 022): on-behalf-of is external-only, targets a VIRTUAL strict descendant. */
  private async validateOnBehalf(
    fromAgentId: string,
    onBehalfOfAgentId: string,
    market: InvoiceMarket,
  ): Promise<void> {
    if (market !== InvoiceMarket.EXTERNAL) {
      throw new UnprocessableEntityException(
        'On-behalf-of is only allowed on external invoices',
      );
    }
    const agent = await this.agentRepository.findOne({
      where: { id: onBehalfOfAgentId },
    });
    if (!agent) throw new NotFoundException('On-behalf-of agent not found');
    if (agent.type !== AgentType.VIRTUAL) {
      throw new UnprocessableEntityException(
        'On-behalf-of agent must not be a legal entity',
      );
    }
    const rows: unknown[] = await this.invoiceRepository.query(
      `SELECT 1 FROM "agents_closure"
       WHERE "id_ancestor" = $1 AND "id_descendant" = $2 AND "id_ancestor" <> "id_descendant"`,
      [fromAgentId, onBehalfOfAgentId],
    );
    if (rows.length === 0) {
      throw new UnprocessableEntityException(
        'On-behalf-of agent must be a descendant of the issuing agent',
      );
    }
  }

  /** The invoice that owns `invoiceId` as its mirror — non-null means `invoiceId` IS a mirror. */
  private async findSourceOf(invoiceId: string): Promise<Invoice | null> {
    return this.invoiceRepository.findOne({
      where: { mirrorInvoiceId: invoiceId },
      relations: ['fromAgent'],
    });
  }

  private mirrorNumberFor(sourceNumber: string): string {
    return `MIR-${sourceNumber}`;
  }

  /**
   * Q9 (spec 022): the mirror is system-owned and regenerated wholesale.
   * Deletes the previous mirror (if any), then — when on-behalf is set —
   * creates a fresh INTERNAL invoice from the on-behalf agent to the issuer
   * copying dates, currency, paid and items; document/workflow fields stay
   * on the source. Item snapshots run through the normal replaceItems path,
   * so the mirror's per-agent amounts land in the sub-agent's functional
   * currency.
   */
  private async regenerateMirror(sourceId: string): Promise<void> {
    const source = await this.invoiceRepository.findOne({
      where: { id: sourceId },
      relations: ['items'],
    });
    if (!source) throw new NotFoundException('Invoice not found');

    if (source.onBehalfOfAgentId) {
      const mirrorNumber = this.mirrorNumberFor(source.number);
      const collision = await this.invoiceRepository.findOne({
        where: { fromAgentId: source.onBehalfOfAgentId, number: mirrorNumber },
      });
      if (collision && collision.id !== source.mirrorInvoiceId) {
        throw new ConflictException('Invoice number already exists for this agent');
      }
    }

    if (source.mirrorInvoiceId) {
      const oldMirror = await this.invoiceRepository.findOne({
        where: { id: source.mirrorInvoiceId },
      });
      // FK is ON DELETE SET NULL, so removing the mirror clears the pointer.
      if (oldMirror) await this.invoiceRepository.remove(oldMirror);
    }

    if (!source.onBehalfOfAgentId) return;

    const mirror = this.invoiceRepository.create({
      number: this.mirrorNumberFor(source.number),
      fromAgentId: source.onBehalfOfAgentId,
      toAgentId: source.fromAgentId,
      market: InvoiceMarket.INTERNAL,
      issuedAt: source.issuedAt,
      dueAt: source.dueAt,
      currencyId: source.currencyId,
      paid: source.paid,
      link: null,
      fileId: null,
      channelId: null,
      orderId: null,
    });
    const savedMirror = await this.invoiceRepository.save(mirror);

    if (source.items && source.items.length > 0) {
      await this.replaceItems(
        savedMirror.id,
        source.items.map((item) => ({
          valueId: item.valueId,
          valueInstanceId: item.valueInstanceId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        source.currencyId,
      );
    }

    await this.invoiceRepository.update(source.id, {
      mirrorInvoiceId: savedMirror.id,
    });
  }

  private async validateOrderLink(
    orderId: string,
    invoiceCurrencyId: string,
  ): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.state === OrderState.COMPLETED || order.state === OrderState.CANCELLED) {
      throw new ConflictException(
        'Cannot link an invoice to a completed or cancelled order',
      );
    }
    if (order.currencyId !== invoiceCurrencyId) {
      throw new ConflictException('Invoice currency must match the order currency');
    }
  }

  async create(input: CreateInvoiceInput): Promise<Invoice> {
    const {
      fromAgentId,
      toAgentId,
      currencyId,
      fileId,
      channelId,
      orderId,
      onBehalfOfAgentId,
      items,
      ...rest
    } = input;

    // Validate fromAgent
    const fromAgent = await this.agentRepository.findOne({
      where: { id: fromAgentId },
    });
    if (!fromAgent) throw new NotFoundException('From agent not found');

    this.assertLegalIssuer(fromAgent.type, rest.market);

    if (onBehalfOfAgentId) {
      await this.validateOnBehalf(fromAgentId, onBehalfOfAgentId, rest.market);
      // Reject the whole create up front if the mirror number is taken, so a
      // 409 never leaves a mirror-less on-behalf invoice behind.
      const mirrorCollision = await this.invoiceRepository.findOne({
        where: {
          fromAgentId: onBehalfOfAgentId,
          number: this.mirrorNumberFor(rest.number),
        },
      });
      if (mirrorCollision) {
        throw new ConflictException('Invoice number already exists for this agent');
      }
    }

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

    // Validate channel if provided
    if (channelId) {
      const ch = await this.channelRepository.findOne({
        where: { id: channelId },
      });
      if (!ch) throw new NotFoundException('Channel not found');
    }

    // Validate order link if provided
    if (orderId) {
      await this.validateOrderLink(orderId, currencyId);
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
      onBehalfOfAgentId: onBehalfOfAgentId ?? null,
      issuedAt: new Date(rest.issuedAt),
      dueAt: new Date(rest.dueAt),
      link: rest.link ?? null,
      fileId: fileId ?? null,
      channelId: channelId ?? null,
      orderId: orderId ?? null,
    });

    const saved = await this.invoiceRepository.save(invoice);

    if (items && items.length > 0) {
      await this.replaceItems(saved.id, items, currencyId);
    }

    if (onBehalfOfAgentId) {
      await this.regenerateMirror(saved.id);
    }

    return this.findOne(saved.id);
  }

  async search(
    query: PaginationQuery & {
      fromAgentId?: string;
      toAgentId?: string;
      agentId?: string;
      market?: string;
      paid?: string;
      currencyId?: string;
      channelId?: string;
      orderId?: string;
      mirror?: string;
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
      agentId,
      market,
      paid,
      currencyId,
      channelId,
      orderId,
      mirror,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.invoiceRepository.createQueryBuilder('invoice');

    qb.leftJoinAndSelect('invoice.fromAgent', 'fromAgent');
    qb.leftJoinAndSelect('invoice.toAgent', 'toAgent');
    qb.leftJoinAndSelect('invoice.currency', 'currency');
    qb.leftJoinAndSelect('invoice.file', 'file');
    qb.leftJoinAndSelect('invoice.channel', 'channel');
    qb.leftJoinAndSelect('invoice.order', 'order');
    qb.leftJoinAndSelect('invoice.onBehalfOfAgent', 'onBehalfOfAgent');

    // Per-perspective totals (presentation / from-agent / to-agent) are
    // still computed at read time. NULL when any item is missing a snapshot
    // — mirrors the rule used by findOne so list and detail agree. The base
    // `total` column is denormalised on the invoice row.
    const perspectiveTotalSelect = (column: string) => `(
      SELECT CASE
        WHEN COUNT(*) = 0 THEN NULL
        WHEN COUNT(ii."${column}") < COUNT(*) THEN NULL
        ELSE SUM(ii."${column}")
      END
      FROM invoice_items ii WHERE ii."invoiceId" = invoice.id
    )`;
    qb.addSelect(perspectiveTotalSelect('presentationAmount'), 'invoice_presentation_total');
    qb.addSelect(perspectiveTotalSelect('fromAgentAmount'), 'invoice_from_agent_total');
    qb.addSelect(perspectiveTotalSelect('toAgentAmount'), 'invoice_to_agent_total');

    if (fromAgentId) {
      qb.andWhere('invoice.fromAgentId = :fromAgentId', { fromAgentId });
    }

    if (toAgentId) {
      qb.andWhere('invoice.toAgentId = :toAgentId', { toAgentId });
    }

    if (agentId) {
      qb.andWhere('(invoice.fromAgentId = :agentId OR invoice.toAgentId = :agentId)', { agentId });
    }

    if (market) {
      qb.andWhere('invoice.market = :market', { market });
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

    if (orderId) {
      qb.andWhere('invoice.orderId = :orderId', { orderId });
    }

    if (mirror === 'exclude') {
      qb.andWhere(
        'NOT EXISTS (SELECT 1 FROM invoices s WHERE s."mirrorInvoiceId" = invoice.id)',
      );
    } else if (mirror === 'only') {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM invoices s WHERE s."mirrorInvoiceId" = invoice.id)',
      );
    }

    if (search) {
      qb.andWhere(
        '(invoice.number ILIKE :search OR fromAgent.name ILIKE :search OR toAgent.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sortBy) {
      qb.orderBy(`invoice.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('invoice.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const { raw, entities } = await qb.getRawAndEntities();

    // Map per-perspective totals onto entities. NULL when any item is
    // unsnapshotted; format others as fixed(2). The base `total` is loaded
    // from the column directly by TypeORM but may come back as a raw
    // postgres-stringified decimal (e.g. "1234.5"), so normalise it.
    const formatNullable = (v: unknown): string | null =>
      v === null || v === undefined ? null : Number(v).toFixed(2);
    for (let i = 0; i < entities.length; i++) {
      entities[i].total = Number(entities[i].total).toFixed(2);
      entities[i].presentationTotal = formatNullable(raw[i].invoice_presentation_total);
      entities[i].fromAgentTotal = formatNullable(raw[i].invoice_from_agent_total);
      entities[i].toAgentTotal = formatNullable(raw[i].invoice_to_agent_total);
    }

    // Mirror/source links, trimmed to summaries (same shapes as findOne).
    const pageIds = entities.map((e) => e.id);
    const mirrorIds = entities
      .map((e) => e.mirrorInvoiceId)
      .filter((v): v is string => v !== null);
    const [sources, mirrors] = await Promise.all([
      pageIds.length > 0
        ? this.invoiceRepository.find({
            where: { mirrorInvoiceId: In(pageIds) },
            relations: ['fromAgent'],
          })
        : Promise.resolve([] as Invoice[]),
      mirrorIds.length > 0
        ? this.invoiceRepository.find({
            where: { id: In(mirrorIds) },
            select: ['id', 'number'],
          })
        : Promise.resolve([] as Invoice[]),
    ]);
    const sourceByMirrorId = new Map(sources.map((s) => [s.mirrorInvoiceId, s]));
    const mirrorById = new Map(mirrors.map((m) => [m.id, m]));
    for (const entity of entities) {
      const source = sourceByMirrorId.get(entity.id);
      entity.sourceInvoice = source
        ? ({
            id: source.id,
            number: source.number,
            fromAgent: { id: source.fromAgent.id, name: source.fromAgent.name },
          } as Invoice)
        : null;
      const mirrorInvoice = entity.mirrorInvoiceId
        ? mirrorById.get(entity.mirrorInvoiceId)
        : undefined;
      entity.mirrorInvoice = mirrorInvoice
        ? ({ id: mirrorInvoice.id, number: mirrorInvoice.number } as Invoice)
        : null;
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
    if (agentId) {
      countQb.andWhere('(invoice.fromAgentId = :agentId OR invoice.toAgentId = :agentId)', {
        agentId,
      });
    }
    if (market) {
      countQb.andWhere('invoice.market = :market', { market });
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
    if (orderId) {
      countQb.andWhere('invoice.orderId = :orderId', { orderId });
    }
    if (mirror === 'exclude') {
      countQb.andWhere(
        'NOT EXISTS (SELECT 1 FROM invoices s WHERE s."mirrorInvoiceId" = invoice.id)',
      );
    } else if (mirror === 'only') {
      countQb.andWhere(
        'EXISTS (SELECT 1 FROM invoices s WHERE s."mirrorInvoiceId" = invoice.id)',
      );
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
        'channel',
        'order',
        'onBehalfOfAgent',
        'items',
        'items.value',
        'items.valueInstance',
      ],
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Mirror link (source side) and source link (mirror side), trimmed to
    // summaries — returning full invoice entities here would nest the whole
    // counterpart document into every response.
    if (invoice.mirrorInvoiceId) {
      const mirror = await this.invoiceRepository.findOne({
        where: { id: invoice.mirrorInvoiceId },
        select: ['id', 'number'],
      });
      invoice.mirrorInvoice = mirror
        ? ({ id: mirror.id, number: mirror.number } as Invoice)
        : null;
    } else {
      invoice.mirrorInvoice = null;
    }
    const source = await this.findSourceOf(id);
    invoice.sourceInvoice = source
      ? ({
          id: source.id,
          number: source.number,
          fromAgent: { id: source.fromAgent.id, name: source.fromAgent.name },
        } as Invoice)
      : null;

    // The base `total` is denormalised on the invoice row. Per-perspective
    // totals still depend on item snapshots and are computed here.
    invoice.total = Number(invoice.total).toFixed(2);
    const result = await this.invoiceRepository.query(
      `SELECT
         COUNT(*) AS item_count,
         COUNT("presentationAmount") AS presentation_amount_count,
         COALESCE(SUM("presentationAmount"), 0) AS presentation_total,
         COUNT("fromAgentAmount") AS from_agent_amount_count,
         COALESCE(SUM("fromAgentAmount"), 0) AS from_agent_total,
         COUNT("toAgentAmount") AS to_agent_amount_count,
         COALESCE(SUM("toAgentAmount"), 0) AS to_agent_total
       FROM invoice_items WHERE "invoiceId" = $1`,
      [id],
    );
    const itemCount = Number(result[0].item_count);
    const presentationCount = Number(result[0].presentation_amount_count);
    const fromAgentCount = Number(result[0].from_agent_amount_count);
    const toAgentCount = Number(result[0].to_agent_amount_count);
    invoice.presentationTotal =
      itemCount === 0 || presentationCount < itemCount
        ? null
        : Number(result[0].presentation_total).toFixed(2);
    invoice.fromAgentTotal =
      itemCount === 0 || fromAgentCount < itemCount
        ? null
        : Number(result[0].from_agent_total).toFixed(2);
    invoice.toAgentTotal =
      itemCount === 0 || toAgentCount < itemCount
        ? null
        : Number(result[0].to_agent_total).toFixed(2);

    return invoice;
  }

  async update(id: string, input: UpdateInvoiceInput): Promise<Invoice> {
    const invoice = await this.findOne(id);

    // I6 (spec 022): mirrors are system-managed.
    if (await this.findSourceOf(id)) {
      throw new UnprocessableEntityException(
        'Mirror invoices are system-managed; edit the source invoice',
      );
    }

    const {
      fromAgentId,
      toAgentId,
      currencyId,
      fileId,
      channelId,
      orderId,
      onBehalfOfAgentId,
      items,
      ...rest
    } = input;

    if (rest.number !== undefined) invoice.number = rest.number;
    if (rest.issuedAt !== undefined)
      invoice.issuedAt = new Date(rest.issuedAt);
    if (rest.dueAt !== undefined) invoice.dueAt = new Date(rest.dueAt);
    if (rest.market !== undefined) invoice.market = rest.market;
    if (rest.paid !== undefined) invoice.paid = rest.paid;
    if (rest.link !== undefined) invoice.link = rest.link ?? null;

    let effectiveFromAgentType = invoice.fromAgent.type;
    if (fromAgentId !== undefined) {
      const agent = await this.agentRepository.findOne({
        where: { id: fromAgentId },
      });
      if (!agent) throw new NotFoundException('From agent not found');
      invoice.fromAgentId = fromAgentId;
      effectiveFromAgentType = agent.type;
    }

    // I1 (spec 022) is re-checked only when the update touches issuer or
    // market — legacy violating rows stay untouched until then (Q19).
    if (rest.market !== undefined || fromAgentId !== undefined) {
      this.assertLegalIssuer(effectiveFromAgentType, invoice.market);
    }

    const effectiveOnBehalfId =
      onBehalfOfAgentId !== undefined
        ? onBehalfOfAgentId
        : invoice.onBehalfOfAgentId;
    if (effectiveOnBehalfId) {
      await this.validateOnBehalf(
        invoice.fromAgentId,
        effectiveOnBehalfId,
        invoice.market,
      );
      const mirrorCollision = await this.invoiceRepository.findOne({
        where: {
          fromAgentId: effectiveOnBehalfId,
          number: this.mirrorNumberFor(invoice.number),
        },
      });
      if (mirrorCollision && mirrorCollision.id !== invoice.mirrorInvoiceId) {
        throw new ConflictException('Invoice number already exists for this agent');
      }
    }
    if (onBehalfOfAgentId !== undefined) {
      invoice.onBehalfOfAgentId = onBehalfOfAgentId ?? null;
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

    if (orderId !== undefined) {
      if (orderId === null) {
        invoice.order = null;
        invoice.orderId = null;
      } else {
        await this.validateOrderLink(orderId, invoice.currencyId);
        invoice.orderId = orderId;
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
    delete (invoice as any).channel;
    delete (invoice as any).order;
    delete (invoice as any).onBehalfOfAgent;
    delete (invoice as any).mirrorInvoice;
    delete (invoice as any).sourceInvoice;
    delete (invoice as any).total;
    await this.invoiceRepository.save(invoice);

    if (items !== undefined) {
      await this.replaceItems(id, items, invoice.currencyId);
    } else if (currencyId !== undefined) {
      // Currency changed but items not re-sent — re-snapshot existing items
      await this.resnapshotItems(id, invoice.currencyId);
    }

    // Q9 (spec 022): any source change regenerates the mirror wholesale;
    // clearing on-behalf (or having had a mirror) removes the stale one.
    if (effectiveOnBehalfId || invoice.mirrorInvoiceId) {
      await this.regenerateMirror(id);
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // I6 (spec 022): mirrors are system-managed.
    if (await this.findSourceOf(id)) {
      throw new UnprocessableEntityException(
        'Mirror invoices are system-managed; edit the source invoice',
      );
    }

    // Deleting a source removes its mirror too. The mirror goes first — its
    // FK from the source is ON DELETE SET NULL, so order is safe either way.
    if (invoice.mirrorInvoiceId) {
      const mirror = await this.invoiceRepository.findOne({
        where: { id: invoice.mirrorInvoiceId },
      });
      if (mirror) await this.invoiceRepository.remove(mirror);
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
    currencyId: string,
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

    const invoice = await this.invoiceRepository.findOne({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const [fromAgentCurrencyId, toAgentCurrencyId] = await Promise.all([
      this.resolveAgentCurrency(invoice.fromAgentId),
      this.resolveAgentCurrency(invoice.toAgentId),
    ]);

    // Bulk create new items, snapshotting each against the invoice currency
    const entities: InvoiceItem[] = [];
    for (const item of items) {
      const snap = await this.snapshotItem(
        currencyId,
        item.total,
        fromAgentCurrencyId,
        toAgentCurrencyId,
        invoice.issuedAt,
      );
      entities.push(
        this.itemRepository.create({
          invoiceId,
          valueId: item.valueId ?? null,
          valueInstanceId: item.valueInstanceId ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          ...snap,
        }),
      );
    }
    await this.itemRepository.save(entities);
    await this.recomputeTotal(invoiceId);
  }

  private async recomputeTotal(invoiceId: string): Promise<void> {
    await this.invoiceRepository.query(
      `UPDATE "invoices" SET "total" = COALESCE((
        SELECT SUM(ii."total") FROM "invoice_items" ii WHERE ii."invoiceId" = $1
      ), 0) WHERE "id" = $1`,
      [invoiceId],
    );
  }

  private async resnapshotItems(invoiceId: string, currencyId: string): Promise<void> {
    const items = await this.itemRepository.find({ where: { invoiceId } });
    if (items.length === 0) return;
    const invoice = await this.invoiceRepository.findOne({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const [fromAgentCurrencyId, toAgentCurrencyId] = await Promise.all([
      this.resolveAgentCurrency(invoice.fromAgentId),
      this.resolveAgentCurrency(invoice.toAgentId),
    ]);
    for (const item of items) {
      const snap = await this.snapshotItem(
        currencyId,
        item.total,
        fromAgentCurrencyId,
        toAgentCurrencyId,
        invoice.issuedAt,
      );
      item.presentationRate = snap.presentationRate;
      item.presentationAmount = snap.presentationAmount;
      item.fromAgentRate = snap.fromAgentRate;
      item.fromAgentAmount = snap.fromAgentAmount;
      item.toAgentRate = snap.toAgentRate;
      item.toAgentAmount = snap.toAgentAmount;
    }
    await this.itemRepository.save(items);
  }
}
