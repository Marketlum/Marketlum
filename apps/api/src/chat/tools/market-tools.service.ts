import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Agreement } from '../../agreements/entities/agreement.entity';
import { Exchange, ExchangeState } from '../../exchanges/entities/exchange.entity';
import { ExchangeFlow } from '../../exchanges/entities/exchange-flow.entity';
import { Offering, OfferingState } from '../../offerings/entities/offering.entity';
import { OfferingItem } from '../../offerings/entities/offering-item.entity';
import { User } from '../../users/entities/user.entity';
import { Agent } from '../../agents/entities/agent.entity';
import { Value } from '../../value/entities/value.entity';
import { ValueStream } from '../../value_streams/entities/value_stream.entity';
import { ToolDefinition } from '../llm/llm.interface';

@Injectable()
export class MarketToolsService {
  constructor(
    @InjectRepository(Agreement)
    private readonly agreementRepository: Repository<Agreement>,
    @InjectRepository(Exchange)
    private readonly exchangeRepository: Repository<Exchange>,
    @InjectRepository(ExchangeFlow)
    private readonly exchangeFlowRepository: Repository<ExchangeFlow>,
    @InjectRepository(Offering)
    private readonly offeringRepository: Repository<Offering>,
    @InjectRepository(OfferingItem)
    private readonly offeringItemRepository: Repository<OfferingItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: Repository<ValueStream>,
  ) {}

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'getAgreementsCountByStatus',
        description: 'Get the count of agreements grouped by their completion status (open or completed)',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'getUsersCount',
        description: 'Get the total count of users in the system',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'getAgentsCount',
        description: 'Get the count of agents, optionally filtered by type',
        parameters: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by agent type (individual, organization, team)',
              enum: ['individual', 'organization', 'team'],
            },
          },
        },
      },
      {
        name: 'getExchangesCountByStatus',
        description: 'Get the count of exchanges grouped by their state (open, completed, closed)',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'getOfferingsCountByState',
        description: 'Get the count of offerings grouped by their state (draft, live, archived)',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'getTopValuesByUsage',
        description: 'Get the most frequently used values across offerings, exchanges, and flows',
        parameters: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of values to return (default: 5)',
            },
          },
        },
      },
      {
        name: 'getValueStreamsOverview',
        description: 'Get an overview of all value streams with their exchange and offering counts',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'searchEntities',
        description: 'Search across multiple entity types (agents, values, offerings, exchanges) by name',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string',
            },
            entityTypes: {
              type: 'string',
              description: 'Comma-separated list of entity types to search (agents, values, offerings, exchanges). Default: all',
            },
            limit: {
              type: 'number',
              description: 'Maximum results per entity type (default: 5)',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'getAgreementsCountByStatus':
        return this.getAgreementsCountByStatus();
      case 'getUsersCount':
        return this.getUsersCount();
      case 'getAgentsCount':
        return this.getAgentsCount(args.type as string | undefined);
      case 'getExchangesCountByStatus':
        return this.getExchangesCountByStatus();
      case 'getOfferingsCountByState':
        return this.getOfferingsCountByState();
      case 'getTopValuesByUsage':
        return this.getTopValuesByUsage(args.limit as number | undefined);
      case 'getValueStreamsOverview':
        return this.getValueStreamsOverview();
      case 'searchEntities':
        return this.searchEntities(
          args.query as string,
          args.entityTypes as string | undefined,
          args.limit as number | undefined,
        );
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getAgreementsCountByStatus(): Promise<{
    openCount: number;
    completedCount: number;
    total: number;
  }> {
    const [openCount, completedCount] = await Promise.all([
      this.agreementRepository.count({ where: { completedAt: IsNull() } }),
      this.agreementRepository
        .createQueryBuilder('a')
        .where('a.completedAt IS NOT NULL')
        .getCount(),
    ]);

    return {
      openCount,
      completedCount,
      total: openCount + completedCount,
    };
  }

  private async getUsersCount(): Promise<{ count: number }> {
    const count = await this.userRepository.count();
    return { count };
  }

  private async getAgentsCount(type?: string): Promise<{
    count: number;
    byType?: Record<string, number>;
  }> {
    if (type) {
      const count = await this.agentRepository.count({ where: { type: type as any } });
      return { count };
    }

    const results = await this.agentRepository
      .createQueryBuilder('a')
      .select('a.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.type')
      .getRawMany();

    const byType: Record<string, number> = {};
    let total = 0;
    for (const row of results) {
      byType[row.type] = parseInt(row.count, 10);
      total += byType[row.type];
    }

    return { count: total, byType };
  }

  private async getExchangesCountByStatus(): Promise<{
    open: number;
    completed: number;
    closed: number;
    total: number;
  }> {
    const results = await this.exchangeRepository
      .createQueryBuilder('e')
      .select('e.state', 'state')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.state')
      .getRawMany();

    const counts = { open: 0, completed: 0, closed: 0 };
    for (const row of results) {
      counts[row.state as keyof typeof counts] = parseInt(row.count, 10);
    }

    return {
      ...counts,
      total: counts.open + counts.completed + counts.closed,
    };
  }

  private async getOfferingsCountByState(): Promise<{
    draft: number;
    live: number;
    archived: number;
    total: number;
  }> {
    const results = await this.offeringRepository
      .createQueryBuilder('o')
      .select('o.state', 'state')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.state')
      .getRawMany();

    const counts = { draft: 0, live: 0, archived: 0 };
    for (const row of results) {
      counts[row.state as keyof typeof counts] = parseInt(row.count, 10);
    }

    return {
      ...counts,
      total: counts.draft + counts.live + counts.archived,
    };
  }

  private async getTopValuesByUsage(limit = 5): Promise<{
    values: Array<{ valueId: string; name: string; type: string; usageCount: number }>;
  }> {
    // Count usage in offering items
    const offeringUsage = await this.offeringItemRepository
      .createQueryBuilder('oi')
      .select('oi.valueId', 'valueId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('oi.valueId')
      .getRawMany();

    // Count usage in exchange flows
    const flowUsage = await this.exchangeFlowRepository
      .createQueryBuilder('ef')
      .select('ef.valueId', 'valueId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ef.valueId')
      .getRawMany();

    // Combine counts
    const usageMap = new Map<string, number>();
    for (const row of offeringUsage) {
      usageMap.set(row.valueId, (usageMap.get(row.valueId) || 0) + parseInt(row.count, 10));
    }
    for (const row of flowUsage) {
      usageMap.set(row.valueId, (usageMap.get(row.valueId) || 0) + parseInt(row.count, 10));
    }

    // Sort by usage and take top N
    const sortedIds = Array.from(usageMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    if (sortedIds.length === 0) {
      return { values: [] };
    }

    // Fetch value details
    const values = await this.valueRepository
      .createQueryBuilder('v')
      .where('v.id IN (:...ids)', { ids: sortedIds })
      .getMany();

    const valueMap = new Map(values.map((v) => [v.id, v]));

    return {
      values: sortedIds.map((id) => ({
        valueId: id,
        name: valueMap.get(id)?.name || 'Unknown',
        type: valueMap.get(id)?.type || 'Unknown',
        usageCount: usageMap.get(id) || 0,
      })),
    };
  }

  private async getValueStreamsOverview(): Promise<{
    valueStreams: Array<{
      id: string;
      name: string;
      exchangeCount: number;
      offeringCount: number;
    }>;
  }> {
    const valueStreams = await this.valueStreamRepository.find();

    const exchangeCounts = await this.exchangeRepository
      .createQueryBuilder('e')
      .select('e.valueStreamId', 'valueStreamId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.valueStreamId')
      .getRawMany();

    const offeringCounts = await this.offeringRepository
      .createQueryBuilder('o')
      .select('o.valueStreamId', 'valueStreamId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.valueStreamId')
      .getRawMany();

    const exchangeMap = new Map(exchangeCounts.map((r) => [r.valueStreamId, parseInt(r.count, 10)]));
    const offeringMap = new Map(offeringCounts.map((r) => [r.valueStreamId, parseInt(r.count, 10)]));

    return {
      valueStreams: valueStreams.map((vs) => ({
        id: vs.id,
        name: vs.name,
        exchangeCount: exchangeMap.get(vs.id) || 0,
        offeringCount: offeringMap.get(vs.id) || 0,
      })),
    };
  }

  private async searchEntities(
    query: string,
    entityTypes?: string,
    limit = 5,
  ): Promise<{
    agents?: Array<{ id: string; name: string; type: string }>;
    values?: Array<{ id: string; name: string; type: string }>;
    offerings?: Array<{ id: string; name: string; state: string }>;
    exchanges?: Array<{ id: string; name: string; state: string }>;
  }> {
    const types = entityTypes?.split(',').map((t) => t.trim().toLowerCase()) || [
      'agents',
      'values',
      'offerings',
      'exchanges',
    ];
    const searchPattern = `%${query}%`;
    const result: Record<string, unknown[]> = {};

    if (types.includes('agents')) {
      const agents = await this.agentRepository
        .createQueryBuilder('a')
        .where('a.name ILIKE :pattern', { pattern: searchPattern })
        .take(limit)
        .getMany();
      result.agents = agents.map((a) => ({ id: a.id, name: a.name, type: a.type }));
    }

    if (types.includes('values')) {
      const values = await this.valueRepository
        .createQueryBuilder('v')
        .where('v.name ILIKE :pattern', { pattern: searchPattern })
        .take(limit)
        .getMany();
      result.values = values.map((v) => ({ id: v.id, name: v.name, type: v.type }));
    }

    if (types.includes('offerings')) {
      const offerings = await this.offeringRepository
        .createQueryBuilder('o')
        .where('o.name ILIKE :pattern', { pattern: searchPattern })
        .take(limit)
        .getMany();
      result.offerings = offerings.map((o) => ({ id: o.id, name: o.name, state: o.state }));
    }

    if (types.includes('exchanges')) {
      const exchanges = await this.exchangeRepository
        .createQueryBuilder('e')
        .where('e.name ILIKE :pattern', { pattern: searchPattern })
        .take(limit)
        .getMany();
      result.exchanges = exchanges.map((e) => ({ id: e.id, name: e.name, state: e.state }));
    }

    return result;
  }
}
