import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Invoice, Value } from '@marketlum/core';
import { RdhyVamAgreement } from './rdhy-vam-agreement.entity';
import { RdhyVamMilestone } from './rdhy-vam-milestone.entity';
import { RdhyVamItem } from './rdhy-vam-item.entity';
import {
  addMonths,
  attainmentPct,
  cumulativeTargets,
  milestoneStatus,
  proRataTarget,
  RdhyVamComparability,
  RdhyVamMilestoneStatus,
  RdhyVamMonthlyActual,
  RdhyVamPerformanceResponse,
} from '../shared/vam-performance';

interface InvoiceRow {
  issued_at: Date | string;
  total: string | null;
}

/**
 * Plan-vs-actual for a VAM agreement (spec 018): cumulative DIRECT_VALUE
 * targets per milestone against the agent's issued-invoice revenue, computed
 * from per-agent snapshot amounts with the spec-010/016 NULL-propagation
 * rule. Read-only — nothing is persisted.
 */
@Injectable()
export class VamPerformanceService {
  constructor(
    @InjectRepository(RdhyVamAgreement)
    private readonly agreements: Repository<RdhyVamAgreement>,
    @InjectRepository(RdhyVamMilestone)
    private readonly milestones: Repository<RdhyVamMilestone>,
    @InjectRepository(RdhyVamItem)
    private readonly items: Repository<RdhyVamItem>,
    @InjectRepository(Invoice)
    private readonly invoices: Repository<Invoice>,
    @InjectRepository(Value)
    private readonly values: Repository<Value>,
  ) {}

  async forAgreement(id: string): Promise<RdhyVamPerformanceResponse> {
    const agreement = await this.agreements.findOne({
      where: { id },
      relations: { agent: true, currency: true },
    });
    if (!agreement) throw new NotFoundException('VAM agreement not found');
    if (agreement.status === 'DRAFT') {
      throw new ConflictException('Performance is not available for a DRAFT agreement');
    }

    const milestoneRows = await this.milestones.find({
      where: { agreementId: id },
      order: { offsetMonths: 'ASC' },
    });
    const itemRows = milestoneRows.length
      ? await this.items.find({
          where: { milestoneId: In(milestoneRows.map((m) => m.id)) },
          order: { position: 'ASC' },
        })
      : [];
    const itemsByMilestone = new Map<string, RdhyVamItem[]>();
    for (const item of itemRows) {
      const list = itemsByMilestone.get(item.milestoneId) ?? [];
      list.push(item);
      itemsByMilestone.set(item.milestoneId, list);
    }

    const functionalCurrency = agreement.agent.functionalCurrencyId
      ? await this.values.findOne({ where: { id: agreement.agent.functionalCurrencyId } })
      : null;

    const targets = cumulativeTargets(
      milestoneRows.map((m) => ({ items: itemsByMilestone.get(m.id) ?? [] })),
    );
    const hasMeasurableTargets = targets.some((t) => t.increment !== null);

    let comparability: RdhyVamComparability;
    if (!agreement.currencyId) comparability = 'NO_AGREEMENT_CURRENCY';
    else if (!functionalCurrency) comparability = 'NO_AGENT_CURRENCY';
    else if (agreement.currencyId !== functionalCurrency.id) comparability = 'CURRENCY_MISMATCH';
    else if (!hasMeasurableTargets) comparability = 'NO_MEASURABLE_TARGETS';
    else comparability = 'COMPARABLE';

    // Non-DRAFT agreements always have startedAt; ended ones have endedAt (Q6).
    const windowStart = agreement.startedAt!;
    const windowEnd = agreement.status === 'ACTIVE' ? new Date() : agreement.endedAt!;

    // One pass per invoice; the LATERAL total mirrors AgentFinancialsService:
    // NULL when any item lacks a fromAgent snapshot — that invoice is
    // excluded from sums and counted in notConvertedCount (Q10).
    const rows: InvoiceRow[] = await this.invoices.query(
      `SELECT i."issuedAt" AS issued_at, t.total
       FROM invoices i,
       LATERAL (
         SELECT CASE
           WHEN COUNT(*) = 0 THEN NULL
           WHEN COUNT(ii."fromAgentAmount") < COUNT(*) THEN NULL
           ELSE SUM(ii."fromAgentAmount")
         END AS total
         FROM invoice_items ii WHERE ii."invoiceId" = i.id
       ) t
       WHERE i."fromAgentId" = $1
         AND i."issuedAt" >= $2
         AND i."issuedAt" <= $3
       ORDER BY i."issuedAt" ASC`,
      [agreement.agentId, windowStart, windowEnd],
    );
    const converted = rows
      .filter((r) => r.total !== null)
      .map((r) => ({ issuedAt: new Date(r.issued_at), total: Number(r.total) }));
    const actualAt = (cutoff: Date, inclusive: boolean): number =>
      converted
        .filter((r) =>
          inclusive ? r.issuedAt.getTime() <= cutoff.getTime() : r.issuedAt.getTime() < cutoff.getTime(),
        )
        .reduce((sum, r) => sum + r.total, 0);

    const monthlyActuals = functionalCurrency
      ? this.buildMonthlySeries(converted, windowStart, windowEnd)
      : null;

    const dueDates = milestoneRows.map((m) => addMonths(windowStart, m.offsetMonths));
    const isActive = agreement.status === 'ACTIVE';
    // Ended agreements have no "current" milestone: everything due after
    // endedAt was never reached and stays UPCOMING (Q6).
    const currentIndex = isActive
      ? dueDates.findIndex((d) => d.getTime() > windowEnd.getTime())
      : -1;
    const comparable = comparability === 'COMPARABLE';

    const milestoneStatuses: Array<RdhyVamMilestoneStatus | null> = [];
    const milestonesOut = milestoneRows.map((milestone, i) => {
      const due = dueDates[i];
      const { increment, cumulative } = targets[i];
      const phase: 'PAST_DUE' | 'CURRENT' | 'FUTURE' =
        due.getTime() <= windowEnd.getTime()
          ? 'PAST_DUE'
          : i === currentIndex
            ? 'CURRENT'
            : 'FUTURE';

      let actual: number | null = null;
      let status: RdhyVamMilestoneStatus | null = null;
      if (comparable) {
        // Past-due milestones count revenue strictly before the due date;
        // later ones show progress up to the evaluation cutoff.
        actual = phase === 'PAST_DUE' ? actualAt(due, false) : actualAt(windowEnd, true);
        const proRata =
          phase === 'CURRENT'
            ? proRataTarget(
                i > 0 ? targets[i - 1].cumulative : 0,
                cumulative,
                i > 0 ? dueDates[i - 1] : windowStart,
                due,
                windowEnd,
              )
            : null;
        status = milestoneStatus({ targetCumulative: cumulative, phase, actual, proRata });
      }
      milestoneStatuses.push(status);

      return {
        id: milestone.id,
        offsetMonths: milestone.offsetMonths,
        label: milestone.label,
        dueDate: due.toISOString(),
        targetIncrement: increment === null ? null : increment.toFixed(2),
        targetCumulative: cumulative.toFixed(2),
        actualCumulative: actual === null ? null : actual.toFixed(2),
        attainmentPct: actual === null ? null : attainmentPct(actual, cumulative),
        status,
        items: (itemsByMilestone.get(milestone.id) ?? []).map((item) => ({
          id: item.id,
          track: item.track,
          description: item.description,
          amount: item.amount,
          measured: item.track === 'DIRECT_VALUE' && item.amount !== null,
        })),
      };
    });

    let summary: RdhyVamPerformanceResponse['summary'] = {
      targetToDate: null,
      actualToDate: null,
      attainmentPct: null,
      overallStatus: null,
    };
    if (comparable && targets.length > 0) {
      let prevIndex = -1;
      for (let i = 0; i < dueDates.length; i++) {
        if (dueDates[i].getTime() <= windowEnd.getTime()) prevIndex = i;
      }
      const nextIndex = dueDates.findIndex((d) => d.getTime() > windowEnd.getTime());
      const targetToDate =
        nextIndex === -1
          ? targets[targets.length - 1].cumulative
          : proRataTarget(
              prevIndex >= 0 ? targets[prevIndex].cumulative : 0,
              targets[nextIndex].cumulative,
              prevIndex >= 0 ? dueDates[prevIndex] : windowStart,
              dueDates[nextIndex],
              windowEnd,
            );
      const actualToDate = actualAt(windowEnd, true);
      // Overall verdict: the current milestone when it is judged, otherwise
      // the most recent past-due judgment (Q17).
      let overallStatus: RdhyVamMilestoneStatus | null =
        currentIndex >= 0 ? milestoneStatuses[currentIndex] : null;
      if (!overallStatus) {
        for (let i = milestoneStatuses.length - 1; i >= 0; i--) {
          const s = milestoneStatuses[i];
          if (s === 'ACHIEVED' || s === 'MISSED') {
            overallStatus = s;
            break;
          }
        }
      }
      summary = {
        targetToDate: targetToDate.toFixed(2),
        actualToDate: actualToDate.toFixed(2),
        attainmentPct: attainmentPct(actualToDate, targetToDate),
        overallStatus,
      };
    }

    return {
      agreementId: agreement.id,
      agreementStatus: agreement.status,
      comparability,
      currency: agreement.currency
        ? { id: agreement.currency.id, code: agreement.currency.code, name: agreement.currency.name }
        : null,
      agentFunctionalCurrency: functionalCurrency
        ? { id: functionalCurrency.id, code: functionalCurrency.code, name: functionalCurrency.name }
        : null,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      summary,
      milestones: milestonesOut,
      monthlyActuals,
      invoiceCount: rows.length,
      notConvertedCount: functionalCurrency ? rows.filter((r) => r.total === null).length : 0,
    };
  }

  private buildMonthlySeries(
    converted: Array<{ issuedAt: Date; total: number }>,
    windowStart: Date,
    windowEnd: Date,
  ): RdhyVamMonthlyActual[] {
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const revenues = new Map<string, number>();
    const series: Array<{ month: string }> = [];
    let cursor = new Date(windowStart.getFullYear(), windowStart.getMonth(), 1);
    const lastMonth = new Date(windowEnd.getFullYear(), windowEnd.getMonth(), 1);
    while (cursor.getTime() <= lastMonth.getTime()) {
      const key = monthKey(cursor);
      series.push({ month: key });
      revenues.set(key, 0);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    for (const row of converted) {
      const key = monthKey(row.issuedAt);
      if (revenues.has(key)) revenues.set(key, revenues.get(key)! + row.total);
    }
    let cumulative = 0;
    return series.map(({ month }) => {
      const revenue = revenues.get(month) ?? 0;
      cumulative += revenue;
      return { month, revenue: revenue.toFixed(2), cumulative: cumulative.toFixed(2) };
    });
  }
}
