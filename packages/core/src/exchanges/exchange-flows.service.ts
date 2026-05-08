import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangeFlow } from './entities/exchange-flow.entity';
import { Exchange } from './entities/exchange.entity';
import { Value } from '../values/entities/value.entity';
import { ValueInstance } from '../value-instances/entities/value-instance.entity';
import { ExchangesService } from './exchanges.service';
import { UpdateExchangeFlowInput } from '@marketlum/shared';

@Injectable()
export class ExchangeFlowsService {
  constructor(
    @InjectRepository(ExchangeFlow)
    private readonly flowRepository: Repository<ExchangeFlow>,
    @InjectRepository(Exchange)
    private readonly exchangeRepository: Repository<Exchange>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    @InjectRepository(ValueInstance)
    private readonly valueInstanceRepository: Repository<ValueInstance>,
    private readonly exchangesService: ExchangesService,
  ) {}

  async create(
    exchangeId: string,
    input: {
      valueId?: string | null;
      valueInstanceId?: string | null;
      fromAgentId: string;
      toAgentId: string;
      quantity: string;
    },
  ): Promise<ExchangeFlow> {
    // Verify exchange exists
    const exchange = await this.exchangeRepository.findOne({ where: { id: exchangeId } });
    if (!exchange) throw new NotFoundException('Exchange not found');

    // Verify from/to agents are parties
    const partyAgentIds = await this.exchangesService.getPartyAgentIds(exchangeId);
    if (!partyAgentIds.includes(input.fromAgentId)) {
      throw new BadRequestException('fromAgent is not a party of this exchange');
    }
    if (!partyAgentIds.includes(input.toAgentId)) {
      throw new BadRequestException('toAgent is not a party of this exchange');
    }

    // Validate value FK
    if (input.valueId) {
      const value = await this.valueRepository.findOne({ where: { id: input.valueId } });
      if (!value) throw new NotFoundException('Value not found');
    }

    // Validate valueInstance FK
    if (input.valueInstanceId) {
      const vi = await this.valueInstanceRepository.findOne({ where: { id: input.valueInstanceId } });
      if (!vi) throw new NotFoundException('Value instance not found');
    }

    const flow = this.flowRepository.create({
      exchangeId,
      valueId: input.valueId ?? null,
      valueInstanceId: input.valueInstanceId ?? null,
      fromAgentId: input.fromAgentId,
      toAgentId: input.toAgentId,
      quantity: input.quantity,
    });

    const saved = await this.flowRepository.save(flow);
    return this.findOne(exchangeId, saved.id);
  }

  private flattenValueInstanceType(flow: ExchangeFlow): ExchangeFlow {
    if (flow.valueInstance) {
      const parentValue = (flow.valueInstance as any).value;
      (flow.valueInstance as any).type = parentValue?.type ?? null;
      delete (flow.valueInstance as any).value;
    }
    return flow;
  }

  async findAll(exchangeId: string): Promise<ExchangeFlow[]> {
    // Verify exchange exists
    const exchange = await this.exchangeRepository.findOne({ where: { id: exchangeId } });
    if (!exchange) throw new NotFoundException('Exchange not found');

    const flows = await this.flowRepository.find({
      where: { exchangeId },
      relations: ['value', 'valueInstance', 'valueInstance.value', 'fromAgent', 'toAgent'],
    });
    return flows.map((f) => this.flattenValueInstanceType(f));
  }

  async findOne(exchangeId: string, flowId: string): Promise<ExchangeFlow> {
    const flow = await this.flowRepository.findOne({
      where: { id: flowId, exchangeId },
      relations: ['value', 'valueInstance', 'valueInstance.value', 'fromAgent', 'toAgent'],
    });
    if (!flow) {
      throw new NotFoundException('Exchange flow not found');
    }
    return this.flattenValueInstanceType(flow);
  }

  async update(
    exchangeId: string,
    flowId: string,
    input: UpdateExchangeFlowInput,
  ): Promise<ExchangeFlow> {
    const flow = await this.findOne(exchangeId, flowId);

    if (input.fromAgentId !== undefined || input.toAgentId !== undefined) {
      const partyAgentIds = await this.exchangesService.getPartyAgentIds(exchangeId);
      if (input.fromAgentId && !partyAgentIds.includes(input.fromAgentId)) {
        throw new BadRequestException('fromAgent is not a party of this exchange');
      }
      if (input.toAgentId && !partyAgentIds.includes(input.toAgentId)) {
        throw new BadRequestException('toAgent is not a party of this exchange');
      }
    }

    if (input.valueId !== undefined) {
      if (input.valueId) {
        const value = await this.valueRepository.findOne({ where: { id: input.valueId } });
        if (!value) throw new NotFoundException('Value not found');
      }
      flow.valueId = input.valueId ?? null;
    }

    if (input.valueInstanceId !== undefined) {
      if (input.valueInstanceId) {
        const vi = await this.valueInstanceRepository.findOne({ where: { id: input.valueInstanceId } });
        if (!vi) throw new NotFoundException('Value instance not found');
      }
      flow.valueInstanceId = input.valueInstanceId ?? null;
    }

    if (input.fromAgentId !== undefined) flow.fromAgentId = input.fromAgentId;
    if (input.toAgentId !== undefined) flow.toAgentId = input.toAgentId;
    if (input.quantity !== undefined) flow.quantity = input.quantity;

    // Delete relations before save
    delete (flow as any).value;
    delete (flow as any).valueInstance;
    delete (flow as any).fromAgent;
    delete (flow as any).toAgent;
    delete (flow as any).exchange;
    await this.flowRepository.save(flow);

    return this.findOne(exchangeId, flowId);
  }

  async remove(exchangeId: string, flowId: string): Promise<void> {
    const flow = await this.flowRepository.findOne({
      where: { id: flowId, exchangeId },
    });
    if (!flow) {
      throw new NotFoundException('Exchange flow not found');
    }
    await this.flowRepository.remove(flow);
  }
}
