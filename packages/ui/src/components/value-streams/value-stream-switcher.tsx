'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronsUpDown, Workflow } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ValueStreamResponse } from '@marketlum/shared';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { FileImagePreview } from '../shared/file-image-preview';
import { useValueStreams } from '../../hooks/use-value-streams';
import { cn } from '../../lib/utils';

export function ValueStreamSwitcher() {
  const router = useRouter();
  const t = useTranslations('valueStreams');
  const tNav = useTranslations('nav');
  const { valueStreams } = useValueStreams();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = valueStreams.filter((vs) => {
    if (!search) return true;
    return vs.name.toLowerCase().includes(search.toLowerCase());
  });
  // Roots first, then children — sort by level then name.
  const sorted = [...filtered].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.name.localeCompare(b.name);
  });

  const handleSelect = (id: string) => {
    setOpen(false);
    router.push(`/admin/value-streams/${id}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between text-sm font-normal sm:w-56"
        >
          <span className="flex items-center gap-2 truncate">
            <Workflow className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{tNav('valueStreams')}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="mb-2 h-8 text-sm"
        />
        <div className="max-h-80 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              {t('noResults')}
            </div>
          ) : (
            sorted.map((vs) => (
              <button
                key={vs.id}
                type="button"
                onClick={() => handleSelect(vs.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                )}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted/40"
                  style={{ marginLeft: vs.level > 0 ? vs.level * 8 : 0 }}
                >
                  {vs.image ? (
                    <FileImagePreview
                      fileId={vs.image.id}
                      mimeType={vs.image.mimeType}
                      alt={vs.name}
                      iconClassName="h-3.5 w-3.5 text-muted-foreground/60"
                      imgClassName="h-full w-full object-cover"
                    />
                  ) : (
                    <Workflow className="h-3.5 w-3.5 text-muted-foreground/60" />
                  )}
                </span>
                <span className="truncate">{vs.name}</span>
              </button>
            ))
          )}
        </div>
        <div className="mt-2 border-t pt-2">
          <Link
            href="/admin/value-streams"
            onClick={() => setOpen(false)}
            className="block rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          >
            {t('viewAll')}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
