'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Gem, Bot, User, Layers, Workflow, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { api } from '@/lib/api-client';
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
    case 'value_stream':
      return '/admin/value-streams';
  }
}

export function GlobalSearchInput() {
  const router = useRouter();
  const t = useTranslations('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<SearchResponse>(
        `/search?q=${encodeURIComponent(q.trim())}&limit=5`,
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

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setSearched(false);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setOpen(true);
      doSearch(value);
    }, 300);
  };

  const navigateToSearch = useCallback(() => {
    if (query.trim()) {
      router.push(`/admin/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/admin/search');
    }
    setOpen(false);
  }, [query, router]);

  const handleResultClick = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setSearched(false);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                navigateToSearch();
              }
              if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            onFocus={() => {
              if (query.trim() && searched) setOpen(true);
            }}
            placeholder={t('placeholder')}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {loading && (
          <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">{t('noResults')}</p>
        )}

        {!loading && results.length > 0 && (
          <div className="py-1">
            {results.map((result) => {
              const config = typeConfig[result.type];
              const Icon = config.icon;
              return (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={resultHref(result)}
                  onClick={handleResultClick}
                  className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-accent"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm">{result.name}</span>
                  <Badge variant={config.variant} className="shrink-0 text-[10px] px-1.5 py-0">
                    {t(`type.${result.type}`)}
                  </Badge>
                </Link>
              );
            })}
            <div className="border-t">
              <Link
                href={`/admin/search?q=${encodeURIComponent(query.trim())}`}
                onClick={handleResultClick}
                className="flex items-center justify-center px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {t('viewAll')}
              </Link>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
