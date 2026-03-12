'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  createArchetypeSchema,
  updateArchetypeSchema,
  type CreateArchetypeInput,
  type ArchetypeResponse,
} from '@marketlum/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTaxonomies } from '@/hooks/use-taxonomies';
import { TaxonomyMultiCombobox } from '@/components/shared/taxonomy-multi-combobox';

interface ArchetypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateArchetypeInput) => Promise<void>;
  archetype?: ArchetypeResponse | null;
  isSubmitting?: boolean;
}

export function ArchetypeFormDialog({
  open,
  onOpenChange,
  onSubmit,
  archetype,
  isSubmitting,
}: ArchetypeFormDialogProps) {
  const isEditing = !!archetype;
  const schema = isEditing ? updateArchetypeSchema : createArchetypeSchema;
  const t = useTranslations('archetypes');
  const tc = useTranslations('common');
  const { taxonomies } = useTaxonomies();
  const [selectedTaxonomyIds, setSelectedTaxonomyIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateArchetypeInput>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      if (archetype) {
        reset({
          name: archetype.name,
          purpose: archetype.purpose ?? '',
          description: archetype.description ?? '',
        });
        setSelectedTaxonomyIds(archetype.taxonomies.map((tax) => tax.id));
      } else {
        reset({
          name: '',
          purpose: '',
          description: '',
        });
        setSelectedTaxonomyIds([]);
      }
    }
  }, [open, archetype, reset]);

  const handleFormSubmit = (data: CreateArchetypeInput) => {
    return onSubmit({
      ...data,
      taxonomyIds: selectedTaxonomyIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editArchetype') : t('createArchetype')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="arch-name">{tc('name')}</Label>
            <Input id="arch-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="arch-purpose">{t('purpose')}</Label>
            <Textarea id="arch-purpose" {...register('purpose')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="arch-description">{t('archetypeDescription')}</Label>
            <Textarea id="arch-description" {...register('description')} />
          </div>

          <div className="space-y-2">
            <Label>{t('taxonomies')}</Label>
            <TaxonomyMultiCombobox
              taxonomies={taxonomies}
              selected={selectedTaxonomyIds}
              onSelectionChange={setSelectedTaxonomyIds}
              placeholder={t('selectTaxonomies')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : isEditing ? tc('update') : tc('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
