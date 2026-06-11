import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import {
  InvoiceDirection,
  ValueStreamFinancialsQuery,
  ValueStreamFinancialsResponse,
} from '@marketlum/shared';
import { Invoice } from './entities/invoice.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import { Value } from '../values/entities/value.entity';
import { SystemSettingsService } from '../system-settings/system-settings.service';

interface MonthAccumulator {
  revenue: number;
  expense: number;
}

interface AggregateRow {
  month: string;
  direction: InvoiceDirection;
  amount: string;
}

@Injectable()
export class ValueStreamFinancialsService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(ValueStream)
    private readonly valueStreamRepository: TreeRepository<ValueStream>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    private readonly systemSettingsService: SystemSettingsService,
  ) {}

  async forValueStream(
    valueStreamId: string,
    query: ValueStreamFinancialsQuery,
  ): Promise<ValueStreamFinancialsResponse> {
    const valueStream = await this.valueStreamRepository.findOne({
      where: { id: valueStreamId },
    });
    if (!valueStream) throw new NotFoundException('Value stream not found');

    const scopeIds = query.directOnly
      ? [valueStreamId]
      : (await this.valueStreamRepository.findDescendants(valueStream)).map((vs) => vs.id);

    const fromDate = `${query.year}-01-01`;
    const toDate = `${query.year + 1}-01-01`;

    // Invoice + not-converted counts over the scope/year (computed regardless of
    // whether a presentation currency is configured — mirrors budget's counts).
    const countRows: { invoice_count: string; not_converted_count: string }[] =
      await this.invoiceRepository.query(
        `SELECT
           COUNT(DISTINCT i.id) AS invoice_count,
           COUNT(ii.*) FILTER (WHERE ii."presentationAmount" IS NULL) AS not_converted_count
         FROM invoices i
         LEFT JOIN invoice_items ii ON ii."invoiceId" = i.id
         WHERE i."valueStreamId" = ANY($1)
           AND i."issuedAt" >= $2
           AND i."issuedAt" < $3`,
        [scopeIds, fromDate, toDate],
      );
    const invoiceCount = Number(countRows[0]?.invoice_count ?? 0);
    const notConvertedCount = Number(countRows[0]?.not_converted_count ?? 0);

    const presentationCurrencyId =
      await this.systemSettingsService.getPresentationCurrencyId();
    const presentationCurrency = presentationCurrencyId
      ? await this.valueRepository.findOne({ where: { id: presentationCurrencyId } })
      : null;

    const monthKey = (m: number) => `${query.year}-${String(m).padStart(2, '0')}`;
    const quarterKey = (q: number) => `${query.year}-Q${q}`;

    if (!presentationCurrencyId || !presentationCurrency) {
      return {
        valueStreamId,
        year: query.year,
        directOnly: query.directOnly,
        presentationCurrency: null,
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
        invoiceCount,
        notConvertedCount,
      };
    }

    const rows: AggregateRow[] = await this.invoiceRepository.query(
      `SELECT
         EXTRACT(MONTH FROM i."issuedAt")::int AS month,
         i.direction AS direction,
         COALESCE(SUM(ii."presentationAmount"), 0) AS amount
       FROM invoices i
       LEFT JOIN invoice_items ii ON ii."invoiceId" = i.id
       WHERE i."valueStreamId" = ANY($1)
         AND i."issuedAt" >= $2
         AND i."issuedAt" < $3
       GROUP BY month, direction`,
      [scopeIds, fromDate, toDate],
    );

    const months: MonthAccumulator[] = Array.from({ length: 12 }, () => ({
      revenue: 0,
      expense: 0,
    }));

    for (const row of rows) {
      const idx = Number(row.month) - 1;
      if (idx < 0 || idx > 11) continue;
      const amount = Number(row.amount);
      if (row.direction === InvoiceDirection.REVENUE) {
        months[idx].revenue += amount;
      } else {
        months[idx].expense += amount;
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
      presentationCurrency: {
        id: presentationCurrency.id,
        name: presentationCurrency.name,
        code: presentationCurrency.code,
      },
      summary,
      byMonth,
      byQuarter,
      invoiceCount,
      notConvertedCount,
    };
  }
}
