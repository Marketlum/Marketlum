'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface TaxonomyOption {
  id: string;
  name: string;
}

interface TaxonomyMultiComboboxProps {
  taxonomies: TaxonomyOption[];
  selected: string[];
  onSelectionChange: (ids: string[]) => void;
  placeholder: string;
  className?: string;
}

export function TaxonomyMultiCombobox({
  taxonomies,
  selected,
  onSelectionChange,
  placeholder,
  className,
}: TaxonomyMultiComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = taxonomies.filter((t) => {
    if (!search) return true;
    return t.name.toLowerCase().includes(search.toLowerCase());
  });

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onSelectionChange(selected.filter((s) => s !== id));
    } else {
      onSelectionChange([...selected, id]);
    }
  };

  const remove = (id: string) => {
    onSelectionChange(selected.filter((s) => s !== id));
  };

  const selectedNames = selected
    .map((id) => taxonomies.find((t) => t.id === id))
    .filter(Boolean) as TaxonomyOption[];

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('w-full justify-between font-normal', className)}
          >
            <span className="truncate">
              {selected.length > 0
                ? `${selected.length} selected`
                : placeholder}
            </span>
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
            {filtered.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer',
                  selected.includes(t.id) && 'bg-accent',
                )}
                onClick={() => toggle(t.id)}
              >
                <Check
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    selected.includes(t.id) ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className="truncate">{t.name}</span>
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
      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedNames.map((t) => (
            <Badge key={t.id} variant="secondary" className="gap-1 pr-1">
              {t.name}
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
