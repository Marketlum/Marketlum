'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Settings2 } from 'lucide-react';
import type { AgentFinancialsResponse } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Can } from '../../permissions/can';
import { YearSelector } from '../financials/year-selector';
import { FinancialsSummaryCards } from '../financials/financials-summary-cards';
import { FinancialsChart } from '../financials/financials-chart';
import { FinancialsBreakdownTable } from '../financials/financials-breakdown-table';
import { FinancialsEmptyStates } from '../financials/financials-empty-states';
import type { FinancialsView } from '../financials/financials-view';

interface AgentFinancialsTabProps {
  agentId: string;
  /** Opens the agent edit dialog so a functional currency can be set. */
  onSetCurrency: () => void;
}

/** Agent P&L (spec 016): issued invoices as revenue, received as expense,
 * in the agent's functional currency. With the consolidated toggle (spec
 * 022) the whole subtree is included and intercompany internal invoices are
 * eliminated. */
export function AgentFinancialsTab({ agentId, onSetCurrency }: AgentFinancialsTabProps) {
  const t = useTranslations('agents.financials');
  const tc = useTranslations('common');
  const [year, setYear] = useState(() => new Date().getUTCFullYear());
  const [consolidated, setConsolidated] = useState(false);
  const [hasDescendants, setHasDescendants] = useState(false);
  const [financials, setFinancials] = useState<AgentFinancialsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFinancials = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<AgentFinancialsResponse>(
        `/agents/${agentId}/financials?year=${year}${consolidated ? '&consolidated=true' : ''}`,
      );
      setFinancials(result);
    } catch {
      setFinancials(null);
    } finally {
      setLoading(false);
    }
  }, [agentId, year, consolidated]);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  // The consolidated toggle only makes sense for agents with sub-agents.
  useEffect(() => {
    api
      .get<unknown[]>(`/agents/${agentId}/children`)
      .then((children) => setHasDescendants(children.length > 0))
      .catch(() => setHasDescendants(false));
  }, [agentId]);

  if (loading && !financials) {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        {tc('loading')}
      </div>
    );
  }

  if (!financials) {
    return <p className="text-sm text-muted-foreground">{t('failedToLoad')}</p>;
  }

  const view: FinancialsView = {
    year: financials.year,
    currencyName: financials.functionalCurrency?.name ?? null,
    summary: financials.summary,
    byMonth: financials.byMonth,
    byQuarter: financials.byQuarter,
    invoiceCount: financials.invoiceCount,
    notConvertedCount: financials.notConvertedCount,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-4">
        {hasDescendants && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={consolidated}
              onChange={(e) => setConsolidated(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span>{t('consolidated')}</span>
            {consolidated && (
              <span className="text-xs text-muted-foreground">
                ({t('consolidatedHint')})
              </span>
            )}
          </label>
        )}
        <YearSelector year={year} onYearChange={setYear} />
      </div>
      <FinancialsEmptyStates
        financials={view}
        missingCurrency={{
          title: t('noCurrencyTitle'),
          body: t('noCurrencyBody'),
          action: (
            <Can resource="agents" action="write">
              <Button variant="outline" size="sm" onClick={onSetCurrency}>
                <Settings2 className="mr-1 h-3.5 w-3.5" />
                {t('noCurrencyAction')}
              </Button>
            </Can>
          ),
        }}
        noInvoices={{
          title: t('noInvoicesTitle'),
          body: t('noInvoicesBody'),
        }}
        notConverted={{
          title: t('notConvertedTitle', { count: financials.notConvertedCount }),
          body: t('notConvertedBody'),
        }}
      />
      {view.currencyName !== null && (
        <>
          <FinancialsSummaryCards financials={view} />
          <FinancialsChart financials={view} />
          <FinancialsBreakdownTable financials={view} />
        </>
      )}
    </div>
  );
}
