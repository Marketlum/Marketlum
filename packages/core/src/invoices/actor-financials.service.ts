import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentFinancialsQuery, AgentFinancialsResponse } from '@marketlum/shared';
import { Invoice } from './entities/invoice.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Value } from '../values/entities/value.entity';

interface MonthAccumulator {
  revenue: number;
  expense: number;
}

interface AggregateRow {
  month: string;
  side: 'revenue' | 'expense';
  amount: string | null;
  not_converted: string;
}

/**
 * Agent P&L (spec 016): invoices the agent issued are revenue, invoices it
 * received are expense. Amounts come from the per-agent snapshot totals
 * (spec 010) in the agent's functional currency; an invoice whose relevant
 * per-agent total is NULL is excluded from sums and counted in
 * notConvertedCount. A self-invoice contributes to both sides (net zero).
 *
 * Consolidated mode (spec 022): the subtree (agent + closure-table
 * descendants) is treated as one unit — descendants' invoices are included
 * and INTERNAL invoices between subtree members are eliminated. Figures stay
 * in the consolidating agent's functional currency: a subtree invoice whose
 * own side-agent uses a different functional currency cannot be summed and
 * is counted in notConvertedCount instead (same graceful degradation as a
 * missing snapshot).
 */
@Injectable()
export class AgentFinancialsService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
  ) {}

  async forAgent(
    agentId: string,
    query: AgentFinancialsQuery,
  ): Promise<AgentFinancialsResponse> {
    const agent = await this.agentRepository.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');

    const fromDate = `${query.year}-01-01`;
    const toDate = `${query.year + 1}-01-01`;
    const consolidated = query.consolidated;

    // Subtree membership (agent + all descendants) via the closure table.
    const subtree = `SELECT "id_descendant" FROM "agents_closure" WHERE "id_ancestor" = $1`;
    // An INTERNAL invoice fully inside the subtree is intercompany
    // bookkeeping (e.g. an on-behalf mirror) and is eliminated.
    const eliminated = `(i."market" = 'internal'
      AND i."fromAgentId" IN (${subtree}) AND i."toAgentId" IN (${subtree}))`;

    const countRows: { invoice_count: string }[] = await this.invoiceRepository.query(
      consolidated
        ? `SELECT COUNT(*) AS invoice_count
           FROM invoices i
           WHERE (i."fromAgentId" IN (${subtree}) OR i."toAgentId" IN (${subtree}))
             AND NOT ${eliminated}
             AND i."issuedAt" >= $2
             AND i."issuedAt" < $3`
        : `SELECT COUNT(*) AS invoice_count
           FROM invoices i
           WHERE (i."fromAgentId" = $1 OR i."toAgentId" = $1)
             AND i."issuedAt" >= $2
             AND i."issuedAt" < $3`,
      [agentId, fromDate, toDate],
    );
    const invoiceCount = Number(countRows[0]?.invoice_count ?? 0);

    const monthKey = (m: number) => `${query.year}-${String(m).padStart(2, '0')}`;
    const quarterKey = (q: number) => `${query.year}-Q${q}`;

    const functionalCurrency = agent.functionalCurrencyId
      ? await this.valueRepository.findOne({ where: { id: agent.functionalCurrencyId } })
      : null;

    if (!functionalCurrency) {
      return {
        agentId,
        year: query.year,
        consolidated,
        functionalCurrency: null,
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
        notConvertedCount: 0,
      };
    }

    // One pass per side; the LATERAL total mirrors the NULL-when-any-item-
    // unsnapshotted rule used by InvoicesService.search perspective totals.
    const sideQuery = (agentColumn: string, amountColumn: string, side: string) => `
      SELECT
        EXTRACT(MONTH FROM i."issuedAt")::int AS month,
        '${side}' AS side,
        SUM(t.total) AS amount,
        COUNT(*) FILTER (WHERE t.total IS NULL) AS not_converted
      FROM invoices i,
      LATERAL (
        SELECT CASE
          WHEN COUNT(*) = 0 THEN NULL
          WHEN COUNT(ii."${amountColumn}") < COUNT(*) THEN NULL
          ELSE SUM(ii."${amountColumn}")
        END AS total
        FROM invoice_items ii WHERE ii."invoiceId" = i.id
      ) t
      WHERE i."${agentColumn}" = $1
        AND i."issuedAt" >= $2
        AND i."issuedAt" < $3
      GROUP BY 1`;

    // Consolidated variant: subtree-wide, intercompany-eliminated, and the
    // per-agent snapshot is only summable when the invoice's own side-agent
    // shares the consolidating agent's functional currency ($4) — otherwise
    // the LATERAL nulls it into not_converted.
    const consolidatedSideQuery = (
      agentColumn: string,
      otherColumn: string,
      amountColumn: string,
      side: string,
    ) => `
      SELECT
        EXTRACT(MONTH FROM i."issuedAt")::int AS month,
        '${side}' AS side,
        SUM(eff.total) AS amount,
        COUNT(*) FILTER (WHERE eff.total IS NULL) AS not_converted
      FROM invoices i
      JOIN agents side_agent ON side_agent.id = i."${agentColumn}",
      LATERAL (
        SELECT CASE
          WHEN COUNT(*) = 0 THEN NULL
          WHEN COUNT(ii."${amountColumn}") < COUNT(*) THEN NULL
          ELSE SUM(ii."${amountColumn}")
        END AS total
        FROM invoice_items ii WHERE ii."invoiceId" = i.id
      ) t,
      LATERAL (
        SELECT CASE
          WHEN side_agent."functionalCurrencyId" IS DISTINCT FROM $4 THEN NULL
          ELSE t.total
        END AS total
      ) eff
      WHERE i."${agentColumn}" IN (${subtree})
        AND NOT (i."market" = 'internal' AND i."${otherColumn}" IN (${subtree}))
        AND i."issuedAt" >= $2
        AND i."issuedAt" < $3
      GROUP BY 1`;

    const rows: AggregateRow[] = await this.invoiceRepository.query(
      consolidated
        ? `${consolidatedSideQuery('fromAgentId', 'toAgentId', 'fromAgentAmount', 'revenue')}
           UNION ALL
           ${consolidatedSideQuery('toAgentId', 'fromAgentId', 'toAgentAmount', 'expense')}`
        : `${sideQuery('fromAgentId', 'fromAgentAmount', 'revenue')}
           UNION ALL
           ${sideQuery('toAgentId', 'toAgentAmount', 'expense')}`,
      consolidated
        ? [agentId, fromDate, toDate, functionalCurrency.id]
        : [agentId, fromDate, toDate],
    );

    const months: MonthAccumulator[] = Array.from({ length: 12 }, () => ({
      revenue: 0,
      expense: 0,
    }));
    let notConvertedCount = 0;

    for (const row of rows) {
      const idx = Number(row.month) - 1;
      if (idx < 0 || idx > 11) continue;
      notConvertedCount += Number(row.not_converted);
      const amount = row.amount === null ? 0 : Number(row.amount);
      if (row.side === 'revenue') {
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

    return {
      agentId,
      year: query.year,
      consolidated,
      functionalCurrency: {
        id: functionalCurrency.id,
        name: functionalCurrency.name,
        code: functionalCurrency.code,
      },
      summary: {
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
      },
      byMonth,
      byQuarter,
      invoiceCount,
      notConvertedCount,
    };
  }
}
