'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { useIsMobile } from '../../hooks/use-mobile';

interface DataTableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  /** Omit (or pass undefined) to hide the Create button, e.g. without `<resource>:write`. */
  onCreateClick?: () => void;
  createLabel?: string;
  filterButton?: React.ReactNode;
  children?: React.ReactNode;
  /** Rendered immediately before the Create button on the right side. */
  primaryActions?: React.ReactNode;
}

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  onCreateClick,
  createLabel,
  filterButton,
  children,
  primaryActions,
}: DataTableToolbarProps) {
  const t = useTranslations('common');
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);

  if (isMobile) {
    // On phones the full toolbar would push the table below the fold —
    // keep search, filters and Create visible and fold the rest into a
    // bottom sheet.
    const hasMore = Boolean(children || primaryActions);
    return (
      <div className="flex flex-col gap-2 py-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder={t('search')}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1"
          />
          {filterButton}
          {hasMore && (
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => setMoreOpen(true)}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">{t('moreActions')}</span>
            </Button>
          )}
        </div>
        {onCreateClick && createLabel && (
          <Button onClick={onCreateClick} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            {createLabel}
          </Button>
        )}
        {hasMore && (
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
              <SheetHeader className="text-left">
                <SheetTitle>{t('moreActions')}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 flex flex-col gap-2 [&>*]:w-full">
                {primaryActions}
                {children}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder={t('search')}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full sm:max-w-sm"
        />
        {filterButton}
        {children}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {primaryActions}
        {onCreateClick && createLabel && (
          <Button onClick={onCreateClick} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            {createLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
