'use client';

import { useTranslations } from 'next-intl';
import { Star, MoreHorizontal } from 'lucide-react';
import type { AddressResponse } from '@marketlum/shared';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface AddressCardProps {
  address: AddressResponse;
  onEdit: () => void;
  onDelete: () => void;
  onMakePrimary: () => void;
}

export function AddressCard({ address, onEdit, onDelete, onMakePrimary }: AddressCardProps) {
  const t = useTranslations('agents');
  const tc = useTranslations('common');

  return (
    <div className="rounded-md border bg-card p-4 flex items-start justify-between gap-3">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          {address.isPrimary && (
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          )}
          {address.label && <span className="font-medium">{address.label}</span>}
          {address.isPrimary && (
            <span className="text-xs text-muted-foreground">({t('primary')})</span>
          )}
        </div>
        <div className="text-sm">{address.line1}</div>
        {address.line2 && <div className="text-sm">{address.line2}</div>}
        <div className="text-sm">
          {address.postalCode} {address.city}
          {address.region ? `, ${address.region}` : ''}
        </div>
        <div className="text-sm text-muted-foreground">{address.country.name}</div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>{tc('edit')}</DropdownMenuItem>
          {!address.isPrimary && (
            <DropdownMenuItem onClick={onMakePrimary}>{t('setAsPrimary')}</DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            {tc('delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
