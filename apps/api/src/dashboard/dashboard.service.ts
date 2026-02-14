import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../invoices/entities/invoice.entity';
import type {
  DashboardQuery,
  DashboardSummaryResponse,
  DashboardTimeSeriesPoint,
} from '@marketlum/shared';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async getSummary(query: DashboardQuery): Promise<DashboardSummaryResponse> {
    const { agentId, valueStreamId, channelId, fromDate, toDate } = query;

    if (agentId) {
      return this.getSummaryByAgent(agentId, valueStreamId, channelId, fromDate, toDate);
    }

    return this.getSummaryAll(valueStreamId, channelId, fromDate, toDate);
  }

  private async getSummaryByAgent(
    agentId: string,
    valueStreamId?: string,
    channelId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<DashboardSummaryResponse> {
    const revenueRows = await this.queryTimeSeries(
      'i."fromAgentId" = $1',
      [agentId],
      valueStreamId,
      channelId,
      fromDate,
      toDate,
    );

    const expenseRows = await this.queryTimeSeries(
      'i."toAgentId" = $1',
      [agentId],
      valueStreamId,
      channelId,
      fromDate,
      toDate,
    );

    const periodMap = new Map<string, DashboardTimeSeriesPoint>();

    for (const row of revenueRows) {
      periodMap.set(row.period, {
        period: row.period,
        revenue: Number(row.amount).toFixed(2),
        expenses: '0.00',
      });
    }

    for (const row of expenseRows) {
      const existing = periodMap.get(row.period);
      if (existing) {
        existing.expenses = Number(row.amount).toFixed(2);
      } else {
        periodMap.set(row.period, {
          period: row.period,
          revenue: '0.00',
          expenses: Number(row.amount).toFixed(2),
        });
      }
    }

    const timeSeries = Array.from(periodMap.values()).sort((a, b) =>
      a.period.localeCompare(b.period),
    );

    const totalRevenue = timeSeries
      .reduce((sum, p) => sum + parseFloat(p.revenue), 0)
      .toFixed(2);
    const totalExpenses = timeSeries
      .reduce((sum, p) => sum + parseFloat(p.expenses), 0)
      .toFixed(2);
    const invoiceCount = revenueRows.reduce((s, r) => s + parseInt(r.count), 0) +
      expenseRows.reduce((s, r) => s + parseInt(r.count), 0);

    return { totalRevenue, totalExpenses, invoiceCount, timeSeries };
  }

  private async getSummaryAll(
    valueStreamId?: string,
    channelId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<DashboardSummaryResponse> {
    const rows = await this.queryTimeSeries('1=1', [], valueStreamId, channelId, fromDate, toDate);

    const timeSeries: DashboardTimeSeriesPoint[] = rows.map((row) => ({
      period: row.period,
      revenue: Number(row.amount).toFixed(2),
      expenses: '0.00',
    }));

    const totalRevenue = timeSeries
      .reduce((sum, p) => sum + parseFloat(p.revenue), 0)
      .toFixed(2);
    const invoiceCount = rows.reduce((s, r) => s + parseInt(r.count), 0);

    return {
      totalRevenue,
      totalExpenses: '0.00',
      invoiceCount,
      timeSeries,
    };
  }

  private async queryTimeSeries(
    agentCondition: string,
    agentParams: string[],
    valueStreamId?: string,
    channelId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<{ period: string; amount: string; count: string }[]> {
    const conditions = [agentCondition];
    const params = [...agentParams];
    let paramIndex = params.length + 1;

    if (valueStreamId) {
      conditions.push(`i."valueStreamId" = $${paramIndex}`);
      params.push(valueStreamId);
      paramIndex++;
    }

    if (channelId) {
      conditions.push(`i."channelId" = $${paramIndex}`);
      params.push(channelId);
      paramIndex++;
    }

    if (fromDate) {
      conditions.push(`i."issuedAt" >= $${paramIndex}`);
      params.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      conditions.push(`i."issuedAt" < ($${paramIndex}::date + interval '1 day')`);
      params.push(toDate);
      paramIndex++;
    }

    const where = conditions.join(' AND ');

    const sql = `
      SELECT
        TO_CHAR(i."issuedAt", 'YYYY-MM') AS period,
        COALESCE(SUM(ii.total), 0) AS amount,
        COUNT(DISTINCT i.id) AS count
      FROM invoices i
      LEFT JOIN invoice_items ii ON ii."invoiceId" = i.id
      WHERE ${where}
      GROUP BY period
      ORDER BY period
    `;

    return this.invoiceRepository.query(sql, params);
  }
}
