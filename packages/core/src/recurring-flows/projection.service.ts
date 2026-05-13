import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  occurrencesInMonth,
  RecurringFlowDirection,
  RecurringFlowProjection,
  RecurringFlowStatus,
} from '@marketlum/shared';
import { RecurringFlow } from './entities/recurring-flow.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';

@Injectable()
export class RecurringFlowsProjectionService {
  constructor(
    @InjectRepository(RecurringFlow)
    private readonly flowRepository: Repository<RecurringFlow>,
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: Repository<ValueStream>,
  ) {}

  async forValueStream(valueStreamId: string, horizonMonths: number): Promise<RecurringFlowProjection> {
    const exists = await this.valueStreamRepository.exist({ where: { id: valueStreamId } });
    if (!exists) throw new NotFoundException('Value stream not found');

    const horizon = Math.min(Math.max(horizonMonths, 1), 36);

    const flows = await this.flowRepository.find({
      where: { valueStreamId, status: RecurringFlowStatus.ACTIVE },
    });

    const today = new Date();
    const months: RecurringFlowProjection['months'] = [];

    for (let i = 0; i < horizon; i++) {
      const target = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + i, 1));
      const year = target.getUTCFullYear();
      const month = target.getUTCMonth() + 1;
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;

      const totalsByDirection: Record<RecurringFlowDirection, Map<string, number>> = {
        [RecurringFlowDirection.INBOUND]: new Map(),
        [RecurringFlowDirection.OUTBOUND]: new Map(),
      };

      for (const flow of flows) {
        const count = occurrencesInMonth(
          { frequency: flow.frequency, interval: flow.interval, startDate: flow.startDate, endDate: flow.endDate },
          { year, month },
        );
        if (count === 0) continue;
        const amount = Number(flow.amount) * count;
        const bucket = totalsByDirection[flow.direction];
        bucket.set(flow.unit, (bucket.get(flow.unit) ?? 0) + amount);
      }

      months.push({
        month: monthStr,
        byDirection: Object.values(RecurringFlowDirection).map((direction) => ({
          direction,
          totals: Array.from(totalsByDirection[direction].entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([unit, amount]) => ({ unit, amount: amount.toFixed(4) })),
        })),
      });
    }

    return { valueStreamId, horizonMonths: horizon, months };
  }
}
