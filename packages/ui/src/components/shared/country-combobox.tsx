'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import type { GeographyResponse } from '@marketlum/shared';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';

interface CountryComboboxProps {
  countries: GeographyResponse[];
  value: string | null;
  onSelect: (id: string | null) => void;
  placeholder: string;
  className?: string;
}

export function CountryCombobox({
  countries,
  value,
  onSelect,
  placeholder,
  className,
}: CountryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = countries.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  const selected = value ? countries.find((c) => c.id === value) : undefined;
  const display = selected ? `${selected.name} (${selected.code})` : placeholder;

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
          <span className="truncate">{display}</span>
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
          {filtered.map((c) => (
            <div
              key={c.id}
              className={cn(
                'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer',
                value === c.id && 'bg-accent',
              )}
              onClick={() => handleSelect(c.id)}
            >
              <Check
                className={cn('h-3.5 w-3.5 shrink-0', value === c.id ? 'opacity-100' : 'opacity-0')}
              />
              <span className="truncate">
                {c.name} <span className="text-muted-foreground">({c.code})</span>
              </span>
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
