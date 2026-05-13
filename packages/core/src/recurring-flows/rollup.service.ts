import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  monthlyEquivalent,
  RecurringFlowDirection,
  RecurringFlowRollup,
  RecurringFlowStatus,
} from '@marketlum/shared';
import { RecurringFlow } from './entities/recurring-flow.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';

@Injectable()
export class RecurringFlowsRollupService {
  constructor(
    @InjectRepository(RecurringFlow)
    private readonly flowRepository: Repository<RecurringFlow>,
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: Repository<ValueStream>,
  ) {}

  async forValueStream(valueStreamId: string): Promise<RecurringFlowRollup> {
    const exists = await this.valueStreamRepository.exist({ where: { id: valueStreamId } });
    if (!exists) throw new NotFoundException('Value stream not found');

    const flows = await this.flowRepository.find({
      where: { valueStreamId, status: RecurringFlowStatus.ACTIVE },
      relations: ['currency'],
    });

    const totalsByDirection: Record<RecurringFlowDirection, Map<string, number>> = {
      [RecurringFlowDirection.INBOUND]: new Map(),
      [RecurringFlowDirection.OUTBOUND]: new Map(),
    };

    for (const flow of flows) {
      const monthly = monthlyEquivalent(Number(flow.amount), flow.frequency, flow.interval);
      const bucket = totalsByDirection[flow.direction];
      const unit = flow.currency?.name ?? '—';
      bucket.set(unit, (bucket.get(unit) ?? 0) + monthly);
    }

    const byDirection = Object.values(RecurringFlowDirection).map((direction) => ({
      direction,
      totals: Array.from(totalsByDirection[direction].entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([unit, monthly]) => ({
          unit,
          monthly: monthly.toFixed(4),
          annualized: (monthly * 12).toFixed(4),
        })),
    }));

    const allUnits = new Set<string>();
    for (const direction of Object.values(RecurringFlowDirection)) {
      for (const unit of totalsByDirection[direction].keys()) allUnits.add(unit);
    }

    const net = Array.from(allUnits)
      .sort((a, b) => a.localeCompare(b))
      .map((unit) => {
        const inbound = totalsByDirection[RecurringFlowDirection.INBOUND].get(unit) ?? 0;
        const outbound = totalsByDirection[RecurringFlowDirection.OUTBOUND].get(unit) ?? 0;
        const monthly = inbound - outbound;
        return { unit, monthly: monthly.toFixed(4), annualized: (monthly * 12).toFixed(4) };
      });

    return {
      valueStreamId,
      activeFlowCount: flows.length,
      byDirection,
      net,
    };
  }
}
