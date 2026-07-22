import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { getNextSnapshot } from 'xstate';
import {
  CreateOrderInput,
  UpdateOrderInput,
  OrderAddressInput,
  PaginationQuery,
  OrderState,
  OrderTransitionAction,
  ValueType,
  orderMachine,
  orderItemTotal,
} from '@marketlum/shared';
import { Order, OrderAddress } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Value } from '../values/entities/value.entity';
import { ValueInstance } from '../value-instances/entities/value-instance.entity';
import { Channel } from '../channels/channel.entity';
import { Pipeline } from '../pipelines/entities/pipeline.entity';
import { Locale } from '../locales/locale.entity';

type AddressPrefix = 'shipping' | 'billing';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly itemRepository: Repository<OrderItem>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    @InjectRepository(ValueInstance)
    private readonly valueInstanceRepository: Repository<ValueInstance>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(Pipeline)
    private readonly pipelineRepository: Repository<Pipeline>,
    @InjectRepository(Locale)
    private readonly localeRepository: Repository<Locale>,
  ) {}

  private async generateNumber(): Promise<string> {
    const result = await this.orderRepository.query(
      `SELECT nextval('orders_number_seq') AS seq`,
    );
    return `ORD-${String(result[0].seq).padStart(5, '0')}`;
  }

  private async validateReferences(input: {
    fromAgentId?: string;
    toAgentId?: string;
    currencyId?: string;
    channelId?: string | null;
    pipelineId?: string | null;
    localeId?: string | null;
  }): Promise<void> {
    if (input.fromAgentId !== undefined) {
      const agent = await this.agentRepository.findOne({
        where: { id: input.fromAgentId },
      });
      if (!agent) throw new NotFoundException('From agent not found');
    }
    if (input.toAgentId !== undefined) {
      const agent = await this.agentRepository.findOne({
        where: { id: input.toAgentId },
      });
      if (!agent) throw new NotFoundException('To agent not found');
    }
    if (input.currencyId !== undefined) {
      const currency = await this.valueRepository.findOne({
        where: { id: input.currencyId },
      });
      if (!currency) throw new NotFoundException('Currency not found');
      if (currency.type !== ValueType.CURRENCY) {
        throw new BadRequestException('Order currency must be a value of type currency');
      }
    }
    if (input.channelId !== undefined && input.channelId !== null) {
      const channel = await this.channelRepository.findOne({
        where: { id: input.channelId },
      });
      if (!channel) throw new NotFoundException('Channel not found');
    }
    if (input.pipelineId !== undefined && input.pipelineId !== null) {
      const pipeline = await this.pipelineRepository.findOne({
        where: { id: input.pipelineId },
      });
      if (!pipeline) throw new NotFoundException('Pipeline not found');
    }
    if (input.localeId !== undefined && input.localeId !== null) {
      const locale = await this.localeRepository.findOne({
        where: { id: input.localeId },
      });
      if (!locale) throw new NotFoundException('Locale not found');
    }
  }

  private applyAddress(
    order: Order,
    prefix: AddressPrefix,
    address: OrderAddressInput | null | undefined,
  ): void {
    if (address === undefined) return;
    order[`${prefix}CountryCode`] = address?.countryCode ?? null;
    order[`${prefix}Line1`] = address?.line1 ?? null;
    order[`${prefix}Line2`] = address?.line2 ?? null;
    order[`${prefix}City`] = address?.city ?? null;
    order[`${prefix}PostalCode`] = address?.postalCode ?? null;
  }

  private readAddress(order: Order, prefix: AddressPrefix): OrderAddress | null {
    const countryCode = order[`${prefix}CountryCode`];
    const line1 = order[`${prefix}Line1`];
    const city = order[`${prefix}City`];
    const postalCode = order[`${prefix}PostalCode`];
    if (!countryCode || !line1 || !city || !postalCode) return null;
    return {
      countryCode,
      line1,
      line2: order[`${prefix}Line2`] ?? null,
      city,
      postalCode,
    };
  }

  private decorate(order: Order): Order {
    order.total = Number(order.total).toFixed(2);
    order.shippingAddress = this.readAddress(order, 'shipping');
    order.billingAddress = this.readAddress(order, 'billing');
    if (order.items) {
      order.items.sort((a, b) => a.position - b.position);
    }
    return order;
  }

  async create(input: CreateOrderInput): Promise<Order> {
    const { shippingAddress, billingAddress, items, ...refs } = input;
    await this.validateReferences(refs);

    const order = this.orderRepository.create({
      number: await this.generateNumber(),
      state: OrderState.DRAFT,
      fromAgentId: refs.fromAgentId,
      toAgentId: refs.toAgentId,
      currencyId: refs.currencyId,
      channelId: refs.channelId ?? null,
      pipelineId: refs.pipelineId ?? null,
      localeId: refs.localeId ?? null,
    });
    this.applyAddress(order, 'shipping', shippingAddress);
    this.applyAddress(order, 'billing', billingAddress);

    const saved = await this.orderRepository.save(order);

    if (items && items.length > 0) {
      await this.replaceItems(saved.id, items);
    }

    return this.findOne(saved.id);
  }

  async search(
    query: PaginationQuery & {
      state?: string;
      fromAgentId?: string;
      toAgentId?: string;
      agentId?: string;
      channelId?: string;
      pipelineId?: string;
      currencyId?: string;
    },
  ) {
    const {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      state,
      fromAgentId,
      toAgentId,
      agentId,
      channelId,
      pipelineId,
      currencyId,
    } = query;
    const skip = (page - 1) * limit;

    const applyFilters = (qb: ReturnType<Repository<Order>['createQueryBuilder']>) => {
      if (state) qb.andWhere('order.state = :state', { state });
      if (fromAgentId) qb.andWhere('order.fromAgentId = :fromAgentId', { fromAgentId });
      if (toAgentId) qb.andWhere('order.toAgentId = :toAgentId', { toAgentId });
      if (agentId) {
        qb.andWhere('(order.fromAgentId = :agentId OR order.toAgentId = :agentId)', {
          agentId,
        });
      }
      if (channelId) qb.andWhere('order.channelId = :channelId', { channelId });
      if (pipelineId) qb.andWhere('order.pipelineId = :pipelineId', { pipelineId });
      if (currencyId) qb.andWhere('order.currencyId = :currencyId', { currencyId });
      if (search) {
        qb.andWhere(
          '(order.number ILIKE :search OR fromAgent.name ILIKE :search OR toAgent.name ILIKE :search)',
          { search: `%${search}%` },
        );
      }
    };

    const qb = this.orderRepository.createQueryBuilder('order');
    qb.leftJoinAndSelect('order.fromAgent', 'fromAgent');
    qb.leftJoinAndSelect('order.toAgent', 'toAgent');
    qb.leftJoinAndSelect('order.currency', 'currency');
    qb.leftJoinAndSelect('order.channel', 'channel');
    qb.leftJoinAndSelect('order.pipeline', 'pipeline');
    qb.leftJoinAndSelect('order.locale', 'locale');
    applyFilters(qb);

    if (sortBy) {
      qb.orderBy(`order.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('order.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const entities = await qb.getMany();
    for (const order of entities) {
      this.decorate(order);
    }

    const countQb = this.orderRepository.createQueryBuilder('order');
    countQb.leftJoin('order.fromAgent', 'fromAgent');
    countQb.leftJoin('order.toAgent', 'toAgent');
    applyFilters(countQb);
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

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        'fromAgent',
        'toAgent',
        'currency',
        'channel',
        'pipeline',
        'locale',
        'items',
        'items.value',
        'items.valueInstance',
      ],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.decorate(order);

    const result = await this.orderRepository.query(
      `SELECT COUNT(*) AS invoice_count, COALESCE(SUM("total"), 0) AS invoiced_total
       FROM "invoices" WHERE "orderId" = $1`,
      [id],
    );
    order.invoicedTotal =
      Number(result[0].invoice_count) === 0
        ? null
        : Number(result[0].invoiced_total).toFixed(2);

    return order;
  }

  private async findOneRaw(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async update(id: string, input: UpdateOrderInput): Promise<Order> {
    const order = await this.findOneRaw(id);
    if (order.state !== OrderState.DRAFT) {
      throw new ConflictException('Only draft orders can be updated');
    }

    const { shippingAddress, billingAddress, items, ...refs } = input;
    await this.validateReferences(refs);

    if (refs.fromAgentId !== undefined) order.fromAgentId = refs.fromAgentId;
    if (refs.toAgentId !== undefined) order.toAgentId = refs.toAgentId;
    if (refs.currencyId !== undefined) order.currencyId = refs.currencyId;
    if (refs.channelId !== undefined) order.channelId = refs.channelId ?? null;
    if (refs.pipelineId !== undefined) order.pipelineId = refs.pipelineId ?? null;
    if (refs.localeId !== undefined) order.localeId = refs.localeId ?? null;
    this.applyAddress(order, 'shipping', shippingAddress);
    this.applyAddress(order, 'billing', billingAddress);

    delete (order as Partial<Order>).total;
    await this.orderRepository.save(order);

    if (items !== undefined) {
      await this.replaceItems(id, items);
    }

    return this.findOne(id);
  }

  async transition(id: string, action: OrderTransitionAction): Promise<Order> {
    const order = await this.findOneRaw(id);

    const nextSnapshot = getNextSnapshot(
      orderMachine,
      orderMachine.resolveState({ value: order.state, context: {} }),
      { type: action },
    );

    if (nextSnapshot.value === order.state) {
      throw new ConflictException(
        `Cannot transition from ${order.state} using action "${action}"`,
      );
    }

    order.state = nextSnapshot.value as OrderState;
    if (order.state === OrderState.NEW) order.placedAt = new Date();
    if (order.state === OrderState.COMPLETED) order.completedAt = new Date();
    if (order.state === OrderState.CANCELLED) order.cancelledAt = new Date();

    delete (order as Partial<Order>).total;
    await this.orderRepository.save(order);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const order = await this.findOneRaw(id);
    if (order.state !== OrderState.DRAFT && order.state !== OrderState.CANCELLED) {
      throw new ConflictException('Only draft or cancelled orders can be deleted');
    }
    await this.orderRepository.remove(order);
  }

  private async replaceItems(
    orderId: string,
    items: {
      valueId?: string | null;
      valueInstanceId?: string | null;
      quantity: string;
      unitPrice: string;
    }[],
  ): Promise<void> {
    await this.itemRepository.delete({ orderId });

    if (items.length > 0) {
      const valueIdSet = [
        ...new Set(items.filter((i) => i.valueId).map((i) => i.valueId as string)),
      ];
      if (valueIdSet.length > 0) {
        const values = await this.valueRepository.findBy({ id: In(valueIdSet) });
        if (values.length !== valueIdSet.length) {
          throw new NotFoundException('One or more values not found');
        }
      }

      const viIdSet = [
        ...new Set(
          items.filter((i) => i.valueInstanceId).map((i) => i.valueInstanceId as string),
        ),
      ];
      if (viIdSet.length > 0) {
        const instances = await this.valueInstanceRepository.findBy({ id: In(viIdSet) });
        if (instances.length !== viIdSet.length) {
          throw new NotFoundException('One or more value instances not found');
        }
      }

      const entities = items.map((item, index) =>
        this.itemRepository.create({
          orderId,
          valueId: item.valueId ?? null,
          valueInstanceId: item.valueInstanceId ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: orderItemTotal(item.quantity, item.unitPrice),
          position: index,
        }),
      );
      await this.itemRepository.save(entities);
    }

    await this.orderRepository.query(
      `UPDATE "orders" SET "total" = COALESCE((
        SELECT SUM(oi."total") FROM "order_items" oi WHERE oi."orderId" = $1
      ), 0) WHERE "id" = $1`,
      [orderId],
    );
  }
}
