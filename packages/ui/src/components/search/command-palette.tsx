'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, Loader2, CornerDownLeft, type LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { api } from '../../lib/api-client';
import type { SearchResponse, SearchResult } from '@marketlum/shared';
import { typeConfig, resultHref } from './search-result-meta';
import { cn } from '../../lib/utils';

export interface PaletteNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface PaletteNavGroup {
  label: string;
  items: PaletteNavItem[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navGroups: PaletteNavGroup[];
  /** Entity search requires the `search` permission; navigation always works. */
  canSearchEntities: boolean;
}

interface PaletteEntry {
  key: string;
  href: string;
  render: (active: boolean) => React.ReactNode;
}

/**
 * One ⌘K palette covering both worlds: navigation (the sidebar menu) and
 * entity search (the /search API). Replaces the separate sidebar menu
 * filter and top-bar search popover.
 */
export function CommandPalette({
  open,
  onOpenChange,
  navGroups,
  canSearchEntities,
}: CommandPaletteProps) {
  const router = useRouter();
  const t = useTranslations('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!canSearchEntities || !query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get<SearchResponse>(
          `/search?q=${encodeURIComponent(query.trim())}&limit=8`,
        );
        setResults(res.data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, canSearchEntities]);

  const navMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return navGroups
      .map((group) => ({
        ...group,
        items: q
          ? group.items.filter((item) => item.label.toLowerCase().includes(q))
          : group.items,
      }))
      .filter((group) => group.items.length > 0);
  }, [navGroups, query]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const list: PaletteEntry[] = [];
    for (const group of navMatches) {
      for (const item of group.items) {
        const Icon = item.icon;
        list.push({
          key: `nav-${item.href}`,
          href: item.href,
          render: (active) => (
            <>
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {active && <CornerDownLeft className="h-3 w-3 shrink-0 text-muted-foreground" />}
            </>
          ),
        });
      }
    }
    for (const result of results) {
      const config = typeConfig[result.type];
      const Icon = config.icon;
      list.push({
        key: `result-${result.type}-${result.id}`,
        href: resultHref(result),
        render: (active) => (
          <>
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{result.name}</span>
            <Badge variant={config.variant} className="shrink-0 px-1.5 py-0 text-[10px]">
              {t(`type.${result.type}`)}
            </Badge>
            {active && <CornerDownLeft className="h-3 w-3 shrink-0 text-muted-foreground" />}
          </>
        ),
      });
    }
    if (canSearchEntities && query.trim()) {
      list.push({
        key: 'view-all',
        href: `/admin/search?q=${encodeURIComponent(query.trim())}`,
        render: () => (
          <span className="w-full text-center text-xs text-muted-foreground">
            {t('viewAll')}
          </span>
        ),
      });
    }
    return list;
  }, [navMatches, results, canSearchEntities, query, t]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, results.length]);

  const navigate = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, entries.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = entries[activeIndex];
      if (entry) navigate(entry.href);
    }
  };

  // Keep the active row visible while arrowing through a long list.
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Rows keyed by running index so nav sections and results share one
  // keyboard-navigable list.
  let runningIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">{t('placeholder')}</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('palettePlaceholder')}
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {navMatches.map((group) => (
            <div key={group.label || '_top'}>
              {group.label && (
                <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                runningIndex++;
                const index = runningIndex;
                const active = index === activeIndex;
                return (
                  <button
                    key={`nav-${item.href}`}
                    type="button"
                    data-active={active}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => navigate(item.href)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm',
                      active ? 'bg-accent text-accent-foreground' : 'text-foreground',
                    )}
                  >
                    {entries[index]?.render(active)}
                  </button>
                );
              })}
            </div>
          ))}
          {results.length > 0 && (
            <div>
              <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('resultsSection')}
              </div>
              {results.map((result) => {
                runningIndex++;
                const index = runningIndex;
                const active = index === activeIndex;
                return (
                  <button
                    key={`result-${result.type}-${result.id}`}
                    type="button"
                    data-active={active}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => navigate(entries[index]!.href)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm',
                      active ? 'bg-accent text-accent-foreground' : 'text-foreground',
                    )}
                  >
                    {entries[index]?.render(active)}
                  </button>
                );
              })}
            </div>
          )}
          {canSearchEntities && query.trim() && (
            (() => {
              runningIndex++;
              const index = runningIndex;
              const active = index === activeIndex;
              return (
                <button
                  type="button"
                  data-active={active}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => navigate(entries[index]!.href)}
                  className={cn(
                    'mt-1 flex w-full items-center rounded-md border-t px-2 py-2',
                    active && 'bg-accent',
                  )}
                >
                  {entries[index]?.render(active)}
                </button>
              );
            })()
          )}
          {entries.length === 0 && !loading && (
            <p className="p-3 text-center text-sm text-muted-foreground">{t('noResults')}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
