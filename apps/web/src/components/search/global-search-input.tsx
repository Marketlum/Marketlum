'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function GlobalSearchInput({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const t = useTranslations('search');
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback(() => {
    if (query.trim()) {
      router.push(`/app/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/app/search');
    }
  }, [query, router]);

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-full text-sidebar-muted-foreground hover:text-sidebar-foreground"
            onClick={() => router.push('/app/search')}
          >
            <Search className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{t('title')}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
        }}
        placeholder={t('placeholder')}
        className="h-8 pl-8 text-xs bg-sidebar-secondary border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-muted-foreground"
      />
    </div>
  );
}
