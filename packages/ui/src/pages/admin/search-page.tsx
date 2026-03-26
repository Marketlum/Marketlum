'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Gem, Bot, User, Layers, Workflow, Flame, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '../../lib/api-client';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import type { SearchResponse, SearchResult } from '@marketlum/shared';

const typeConfig: Record<
  SearchResult['type'],
  { icon: typeof Gem; variant: 'default' | 'secondary' | 'outline' }
> = {
  value: { icon: Gem, variant: 'default' },
  agent: { icon: Bot, variant: 'secondary' },
  user: { icon: User, variant: 'outline' },
  value_instance: { icon: Layers, variant: 'secondary' },
  value_stream: { icon: Workflow, variant: 'secondary' },
  tension: { icon: Flame, variant: 'default' },
};

function resultHref(result: SearchResult): string {
  switch (result.type) {
    case 'value':
      return `/admin/values/${result.id}`;
    case 'agent':
      return `/admin/agents/${result.id}`;
    case 'user':
      return '/admin/users';
    case 'value_instance':
      return `/admin/value-instances/${result.id}`;
    case 'tension':
      return `/admin/tensions/${result.id}`;
    case 'value_stream':
      return '/admin/value-streams';
  }
}

export function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('search');
  const tc = useTranslations('common');
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<SearchResponse>(
        `/search?q=${encodeURIComponent(q.trim())}&limit=20`,
      );
      setResults(res.data);
      setSearched(true);
    } catch {
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      doSearch(initialQuery);
    }
  }, [initialQuery, doSearch]);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.replace(`/admin/search?q=${encodeURIComponent(value)}`);
      doSearch(value);
    }, 300);
  };

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin">{tc('home')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t('title')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
        <Search className="h-6 w-6" />
        {t('title')}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">{t('description')}</p>

      <div className="relative mb-6 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={t('placeholder')}
          className="pl-9"
          autoFocus
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tc('loading')}
        </div>
      )}

      {!loading && !searched && !query && (
        <p className="text-sm text-muted-foreground">{t('emptyState')}</p>
      )}

      {!loading && searched && results.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('noResults')}</p>
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('resultsCount', { count: results.length, query: query.trim() })}
          </p>
          <div className="space-y-2 max-w-2xl">
            {results.map((result) => {
              const config = typeConfig[result.type];
              const Icon = config.icon;
              return (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={resultHref(result)}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{result.name}</span>
                      <Badge variant={config.variant} className="shrink-0 text-xs">
                        {t(`type.${result.type}`)}
                      </Badge>
                    </div>
                    {result.subtitle && (
                      <p className="truncate text-sm text-muted-foreground">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
