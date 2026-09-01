'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { TensionHistoryEntry } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface HistoryResponse {
  data: TensionHistoryEntry[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const PAGE_SIZE = 10;

/**
 * The tension's event stream, newest first (spec 027 Q21).
 *
 * Entries are localised from `summaryKey`/`summaryParams`, falling back to the
 * server-rendered English `summary` if a key is missing — so a new event type
 * shipped by the API never renders as a raw translation key.
 */
export function TensionHistory({ tensionId }: { tensionId: string }) {
  const t = useTranslations('tensions');
  const [entries, setEntries] = useState<TensionHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      try {
        const result = await api.get<HistoryResponse>(
          `/tensions/${tensionId}/history?page=${nextPage}&limit=${PAGE_SIZE}`,
        );
        setEntries((prev) => (nextPage === 1 ? result.data : [...prev, ...result.data]));
        setTotal(result.meta.total);
        setPage(nextPage);
      } finally {
        setLoading(false);
      }
    },
    [tensionId],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const label = (entry: TensionHistoryEntry): string => {
    const key = entry.summaryKey;
    return t.has(key) ? t(key, entry.summaryParams as never) : entry.summary;
  };

  const actorName = (entry: TensionHistoryEntry): string =>
    entry.actor.userName ?? entry.actor.apiKeyName ?? t('history.system');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('history.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">{t('history.empty')}</p>
        ) : (
          <ol className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.version}
                className="flex items-start gap-3 border-b pb-3 last:border-b-0 last:pb-0"
              >
                <Badge variant="outline" className="shrink-0 font-mono text-xs">
                  v{entry.version}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{label(entry)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.occurredAt).toLocaleString()} · {actorName(entry)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {entries.length < total && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => load(page + 1)}
            disabled={loading}
          >
            {t('history.loadMore')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
