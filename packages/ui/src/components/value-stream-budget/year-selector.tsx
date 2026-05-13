'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface YearSelectorProps {
  year: number;
  directOnly: boolean;
  onYearChange: (year: number) => void;
  onDirectOnlyChange: (directOnly: boolean) => void;
}

export function YearSelector({
  year,
  directOnly,
  onYearChange,
  onDirectOnlyChange,
}: YearSelectorProps) {
  const t = useTranslations('valueStreamBudget');
  const currentYear = new Date().getUTCFullYear();
  const years: number[] = [];
  for (let y = currentYear - 3; y <= currentYear + 3; y++) years.push(y);
  if (!years.includes(year)) years.push(year);
  years.sort((a, b) => a - b);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onYearChange(year - 1)}
          aria-label={t('previousYear')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Select value={String(year)} onValueChange={(v) => onYearChange(parseInt(v, 10))}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onYearChange(year + 1)}
          aria-label={t('nextYear')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={directOnly}
          onChange={(e) => onDirectOnlyChange(e.target.checked)}
        />
        <span>{t('directOnly')}</span>
      </label>
    </div>
  );
}
