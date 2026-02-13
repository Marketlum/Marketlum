'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import type { ValueResponse } from '@marketlum/shared';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ValueComboboxProps {
  values: ValueResponse[];
  value: string | null;
  onSelect: (id: string | null) => void;
  placeholder: string;
  noneLabel?: string;
  excludeId?: string;
  className?: string;
}

export function ValueCombobox({
  values,
  value,
  onSelect,
  placeholder,
  noneLabel,
  excludeId,
  className,
}: ValueComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = values.filter((v) => {
    if (excludeId && v.id === excludeId) return false;
    if (!search) return true;
    return v.name.toLowerCase().includes(search.toLowerCase());
  });

  const selectedName = value
    ? values.find((v) => v.id === value)?.name ?? placeholder
    : placeholder;

  const handleSelect = (id: string | null) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="truncate">{selectedName}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-2" align="start">
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="mb-2 h-8 text-sm"
        />
        <div className="max-h-60 overflow-y-auto">
          {noneLabel && (
            <div
              className={cn(
                'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer',
                !value && 'bg-accent',
              )}
              onClick={() => handleSelect(null)}
            >
              <Check
                className={cn('h-3.5 w-3.5 shrink-0', !value ? 'opacity-100' : 'opacity-0')}
              />
              <span>{noneLabel}</span>
            </div>
          )}
          {filtered.map((v) => (
            <div
              key={v.id}
              className={cn(
                'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer',
                value === v.id && 'bg-accent',
              )}
              onClick={() => handleSelect(v.id)}
            >
              <Check
                className={cn('h-3.5 w-3.5 shrink-0', value === v.id ? 'opacity-100' : 'opacity-0')}
              />
              <span className="truncate">{v.name}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
