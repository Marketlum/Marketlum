'use client';

import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface ActiveFilter {
  key: string;
  label: string;
  displayValue: string;
  onClear: () => void;
}

interface ActiveFiltersProps {
  filters: ActiveFilter[];
}

export function ActiveFilters({ filters }: ActiveFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pb-3">
      {filters.map((filter) => (
        <Badge key={filter.key} variant="secondary" className="gap-1 pr-1">
          {filter.label}: {filter.displayValue}
          <button
            onClick={filter.onClear}
            className="ml-1 rounded-full p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
