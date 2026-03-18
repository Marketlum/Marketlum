'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  createAgreementTemplateSchema,
  updateAgreementTemplateSchema,
  AgreementTemplateType,
  type CreateAgreementTemplateInput,
  type AgreementTemplateResponse,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useValueStreams } from '@/hooks/use-value-streams';

interface AgreementTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateAgreementTemplateInput) => Promise<void>;
  template?: AgreementTemplateResponse | null;
  parentId?: string | null;
  isSubmitting?: boolean;
}

export function AgreementTemplateFormDialog({
  open,
  onOpenChange,
  onSubmit,
  template,
  parentId,
  isSubmitting,
}: AgreementTemplateFormDialogProps) {
  const isEditing = !!template;
  const schema = isEditing ? updateAgreementTemplateSchema : createAgreementTemplateSchema;
  const t = useTranslations('agreementTemplates');
  const tc = useTranslations('common');
  const { valueStreams } = useValueStreams(open);

  const {
    register,
    handleSubmit,
    reset,
    setValue: setFormValue,
    watch,
    formState: { errors },
  } = useForm<CreateAgreementTemplateInput>({
    resolver: zodResolver(schema),
  });

  const watchedType = watch('type');
  const watchedValueStreamId = watch('valueStreamId');

  useEffect(() => {
    if (open) {
      if (template) {
        reset({
          name: template.name,
          type: template.type,
          purpose: template.purpose ?? '',
          description: template.description ?? '',
          link: template.link ?? '',
          valueStreamId: template.valueStream?.id ?? undefined,
        });
      } else {
        reset({
          name: '',
          type: AgreementTemplateType.MAIN_AGREEMENT,
          purpose: '',
          description: '',
          link: '',
          parentId: parentId ?? undefined,
          valueStreamId: undefined,
        });
      }
    }
  }, [open, template, parentId, reset]);

  const typeLabels: Record<string, string> = {
    main_agreement: t('typeMainAgreement'),
    annex: t('typeAnnex'),
    schedule: t('typeSchedule'),
    exhibit: t('typeExhibit'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editTemplate') : t('createTemplate')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="at-name">{tc('name')}</Label>
            <Input id="at-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('type')}</Label>
            <Select
              value={watchedType ?? AgreementTemplateType.MAIN_AGREEMENT}
              onValueChange={(val) => setFormValue('type', val as AgreementTemplateType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(AgreementTemplateType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {typeLabels[type] ?? type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="at-purpose">{t('purpose')}</Label>
            <Textarea id="at-purpose" {...register('purpose')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="at-description">{t('description')}</Label>
            <Textarea id="at-description" {...register('description')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="at-link">{t('link')}</Label>
            <Input id="at-link" type="url" {...register('link')} placeholder="https://..." />
            {errors.link && <p className="text-sm text-destructive">{errors.link.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('valueStream')}</Label>
            <Select
              value={watchedValueStreamId ?? 'none'}
              onValueChange={(val) => setFormValue('valueStreamId', val === 'none' ? undefined : val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                {valueStreams.map((vs) => (
                  <SelectItem key={vs.id} value={vs.id}>
                    {vs.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
