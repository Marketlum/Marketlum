import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, TreeRepository } from 'typeorm';
import {
  RecurringFlowDirection,
  RecurringFlowStatus,
  ValueStreamBudgetQuery,
  ValueStreamBudgetResponse,
  occurrencesInMonth,
} from '@marketlum/shared';
import { RecurringFlow } from './entities/recurring-flow.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import { Value } from '../values/entities/value.entity';
import { SystemSettingsService } from '../system-settings/system-settings.service';

interface MonthAccumulator {
  revenue: number;
  expense: number;
}

@Injectable()
export class RecurringFlowsBudgetService {
  constructor(
    @InjectRepository(RecurringFlow)
    private readonly flowRepository: Repository<RecurringFlow>,
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: TreeRepository<ValueStream>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    private readonly systemSettingsService: SystemSettingsService,
  ) {}

  async forValueStream(
    valueStreamId: string,
    query: ValueStreamBudgetQuery,
  ): Promise<ValueStreamBudgetResponse> {
    const valueStream = await this.valueStreamRepository.findOne({
      where: { id: valueStreamId },
    });
    if (!valueStream) throw new NotFoundException('Value stream not found');

    const scopeIds = query.directOnly
      ? [valueStreamId]
      : (await this.valueStreamRepository.findDescendants(valueStream)).map((vs) => vs.id);

    const flows = await this.flowRepository.find({
      where: {
        valueStreamId: In(scopeIds),
        status: RecurringFlowStatus.ACTIVE,
      },
    });

    const baseValueId = await this.systemSettingsService.getBaseValueId();
    const baseValue = baseValueId
      ? await this.valueRepository.findOne({ where: { id: baseValueId } })
      : null;

    const monthKey = (m: number) =>
      `${query.year}-${String(m).padStart(2, '0')}`;
    const quarterKey = (q: number) => `${query.year}-Q${q}`;

    if (!baseValueId || !baseValue) {
      return {
        valueStreamId,
        year: query.year,
        directOnly: query.directOnly,
        baseValue: null,
        summary: {
          revenue: { monthly: null, quarterly: null, annual: null },
          expense: { monthly: null, quarterly: null, annual: null },
          net: { monthly: null, quarterly: null, annual: null },
        },
        byMonth: Array.from({ length: 12 }, (_, i) => ({
          month: monthKey(i + 1),
          revenue: null,
          expense: null,
          net: null,
        })),
        byQuarter: Array.from({ length: 4 }, (_, i) => ({
          quarter: quarterKey(i + 1),
          revenue: null,
          expense: null,
          net: null,
        })),
        activeFlowCount: flows.length,
        skippedFlows: flows.filter((f) => f.baseAmount === null).length,
      };
    }

    const months: MonthAccumulator[] = Array.from({ length: 12 }, () => ({
      revenue: 0,
      expense: 0,
    }));
    let skippedFlows = 0;

    for (const flow of flows) {
      if (flow.baseAmount === null) {
        skippedFlows++;
        continue;
      }
      const baseAmount = Number(flow.baseAmount);
      for (let m = 1; m <= 12; m++) {
        const count = occurrencesInMonth(
          {
            frequency: flow.frequency,
            interval: flow.interval,
            startDate: flow.startDate,
            endDate: flow.endDate,
          },
          { year: query.year, month: m },
        );
        if (count === 0) continue;
        const contribution = baseAmount * count;
        if (flow.direction === RecurringFlowDirection.INBOUND) {
          months[m - 1].revenue += contribution;
        } else {
          months[m - 1].expense += contribution;
        }
      }
    }

    const byMonth = months.map((acc, i) => ({
      month: monthKey(i + 1),
      revenue: acc.revenue.toFixed(2),
      expense: acc.expense.toFixed(2),
      net: (acc.revenue - acc.expense).toFixed(2),
    }));

    const byQuarter = Array.from({ length: 4 }, (_, q) => {
      const slice = months.slice(q * 3, q * 3 + 3);
      const revenue = slice.reduce((sum, m) => sum + m.revenue, 0);
      const expense = slice.reduce((sum, m) => sum + m.expense, 0);
      return {
        quarter: quarterKey(q + 1),
        revenue: revenue.toFixed(2),
        expense: expense.toFixed(2),
        net: (revenue - expense).toFixed(2),
      };
    });

    const annualRevenue = months.reduce((sum, m) => sum + m.revenue, 0);
    const annualExpense = months.reduce((sum, m) => sum + m.expense, 0);
    const annualNet = annualRevenue - annualExpense;

    const summary = {
      revenue: {
        monthly: (annualRevenue / 12).toFixed(2),
        quarterly: (annualRevenue / 4).toFixed(2),
        annual: annualRevenue.toFixed(2),
      },
      expense: {
        monthly: (annualExpense / 12).toFixed(2),
        quarterly: (annualExpense / 4).toFixed(2),
        annual: annualExpense.toFixed(2),
      },
      net: {
        monthly: (annualNet / 12).toFixed(2),
        quarterly: (annualNet / 4).toFixed(2),
        annual: annualNet.toFixed(2),
      },
    };

    return {
      valueStreamId,
      year: query.year,
      directOnly: query.directOnly,
      baseValue: { id: baseValue.id, name: baseValue.name },
      summary,
      byMonth,
      byQuarter,
      activeFlowCount: flows.length,
      skippedFlows,
    };
  }
}
