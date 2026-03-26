'use client';

import { useTranslations } from 'next-intl';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';

interface DataTableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onCreateClick: () => void;
  createLabel: string;
  filterButton?: React.ReactNode;
  children?: React.ReactNode;
}

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  onCreateClick,
  createLabel,
  filterButton,
  children,
}: DataTableToolbarProps) {
  const t = useTranslations('common');

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder={t('search')}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full sm:max-w-sm"
        />
        {filterButton}
        {children}
      </div>
      <Button onClick={onCreateClick} className="w-full sm:w-auto">
        <Plus className="mr-2 h-4 w-4" />
        {createLabel}
      </Button>
    </div>
  );
}
