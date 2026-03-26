'use client';

import { useTranslations } from 'next-intl';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';

interface DataTableFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function DataTableFilterSheet({
  open,
  onOpenChange,
  children,
}: DataTableFilterSheetProps) {
  const tc = useTranslations('common');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{tc('filters')}</SheetTitle>
          <SheetDescription>{tc('filtersDescription')}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
