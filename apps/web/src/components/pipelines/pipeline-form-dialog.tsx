'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  createPipelineSchema,
  updatePipelineSchema,
  type CreatePipelineInput,
  type PipelineResponse,
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
import { useValueStreams } from '@/hooks/use-value-streams';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PipelineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePipelineInput) => Promise<void>;
  pipeline?: PipelineResponse | null;
  isSubmitting?: boolean;
}

export function PipelineFormDialog({
  open,
  onOpenChange,
  onSubmit,
  pipeline,
  isSubmitting,
}: PipelineFormDialogProps) {
  const isEditing = !!pipeline;
  const schema = isEditing ? updatePipelineSchema : createPipelineSchema;
  const t = useTranslations('pipelines');
  const tc = useTranslations('common');
  const { valueStreams } = useValueStreams(open);

  const {
    register,
    handleSubmit,
    reset,
    setValue: setFormValue,
    watch,
    formState: { errors },
  } = useForm<CreatePipelineInput>({
    resolver: zodResolver(schema),
  });

  const watchedValueStreamId = watch('valueStreamId');

  useEffect(() => {
    if (open) {
      if (pipeline) {
        reset({
          name: pipeline.name,
          purpose: pipeline.purpose ?? '',
          description: pipeline.description ?? '',
          color: pipeline.color,
          valueStreamId: pipeline.valueStream?.id ?? null,
        });
      } else {
        reset({
          name: '',
          purpose: '',
          description: '',
          color: '#000000',
          valueStreamId: null,
        });
      }
    }
  }, [open, pipeline, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editPipeline') : t('createPipeline')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pl-name">{tc('name')}</Label>
            <Input id="pl-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pl-purpose">{t('purpose')}</Label>
            <Textarea id="pl-purpose" {...register('purpose')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pl-description">{t('pipelineDescription')}</Label>
            <Textarea id="pl-description" {...register('description')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pl-color">{t('color')}</Label>
            <div className="flex items-center gap-2">
              <Input id="pl-color" {...register('color')} placeholder="#000000" />
              <input
                type="color"
                value={watch('color') || '#000000'}
                onChange={(e) => setFormValue('color', e.target.value)}
                className="h-9 w-9 shrink-0 cursor-pointer rounded border p-0.5"
              />
            </div>
            {errors.color && <p className="text-sm text-destructive">{errors.color.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('valueStream')}</Label>
            <Select
              value={watchedValueStreamId ?? 'none'}
              onValueChange={(val) => setFormValue('valueStreamId', val === 'none' ? null : val)}
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
