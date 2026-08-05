'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  createAddressSchema,
  updateAddressSchema,
  type CreateAddressInput,
  type AddressResponse,
} from '@marketlum/shared';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../ui/sheet';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { CountryCombobox } from '../shared/country-combobox';
import { useCountries } from '../../hooks/use-countries';

interface AddressFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateAddressInput) => Promise<void>;
  address?: AddressResponse | null;
  isSubmitting?: boolean;
}

export function AddressFormSheet({
  open,
  onOpenChange,
  onSubmit,
  address,
  isSubmitting,
}: AddressFormSheetProps) {
  const isEditing = !!address;
  const schema = isEditing ? updateAddressSchema : createAddressSchema;
  const ta = useTranslations('addresses');
  const tc = useTranslations('common');
  const { countries } = useCountries(open);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateAddressInput>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      if (address) {
        reset({
          label: address.label ?? undefined,
          line1: address.line1,
          line2: address.line2 ?? undefined,
          city: address.city,
          region: address.region ?? undefined,
          postalCode: address.postalCode,
          countryId: address.country.id,
          isPrimary: address.isPrimary,
        });
      } else {
        reset({
          label: undefined,
          line1: '',
          line2: undefined,
          city: '',
          region: undefined,
          postalCode: '',
          countryId: '',
          isPrimary: false,
        });
      }
    }
  }, [open, address, reset]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader className="text-left">
          <SheetTitle>{isEditing ? ta('editAddress') : ta('addAddress')}</SheetTitle>
          <SheetDescription>
            {isEditing ? ta('editDescription') : ta('createDescription')}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="addr-label">{ta('label')}</Label>
            <Input id="addr-label" {...register('label')} placeholder="HQ" />
            {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="addr-line1">{ta('line1')}</Label>
            <Input id="addr-line1" {...register('line1')} />
            {errors.line1 && <p className="text-sm text-destructive">{errors.line1.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="addr-line2">{ta('line2')}</Label>
            <Input id="addr-line2" {...register('line2')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="addr-city">{ta('city')}</Label>
              <Input id="addr-city" {...register('city')} />
              {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="addr-region">{ta('region')}</Label>
              <Input id="addr-region" {...register('region')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="addr-postal">{ta('postalCode')}</Label>
              <Input id="addr-postal" {...register('postalCode')} />
              {errors.postalCode && (
                <p className="text-sm text-destructive">{errors.postalCode.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{ta('country')}</Label>
              <CountryCombobox
                countries={countries}
                value={watch('countryId') || null}
                onSelect={(id) => setValue('countryId', id ?? '')}
                placeholder={ta('selectCountry')}
              />
              {errors.countryId && (
                <p className="text-sm text-destructive">{errors.countryId.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="addr-primary"
              type="checkbox"
              checked={watch('isPrimary') === true}
              onChange={(e) => setValue('isPrimary', e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="addr-primary" className="cursor-pointer">{ta('markPrimary')}</Label>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : isEditing ? tc('update') : tc('create')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
