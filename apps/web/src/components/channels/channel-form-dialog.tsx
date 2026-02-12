'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  createChannelSchema,
  updateChannelSchema,
  type CreateChannelInput,
  type ChannelResponse,
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
import { useAgents } from '@/hooks/use-agents';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChannelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateChannelInput) => Promise<void>;
  channel?: ChannelResponse | null;
  parentId?: string | null;
  isSubmitting?: boolean;
}

export function ChannelFormDialog({
  open,
  onOpenChange,
  onSubmit,
  channel,
  parentId,
  isSubmitting,
}: ChannelFormDialogProps) {
  const isEditing = !!channel;
  const schema = isEditing ? updateChannelSchema : createChannelSchema;
  const t = useTranslations('channels');
  const tc = useTranslations('common');
  const { agents } = useAgents(open);

  const {
    register,
    handleSubmit,
    reset,
    setValue: setFormValue,
    watch,
    formState: { errors },
  } = useForm<CreateChannelInput>({
    resolver: zodResolver(schema),
  });

  const watchedAgentId = watch('agentId');

  useEffect(() => {
    if (open) {
      if (channel) {
        reset({
          name: channel.name,
          purpose: channel.purpose ?? '',
          color: channel.color,
          agentId: channel.agent?.id ?? null,
        });
      } else {
        reset({
          name: '',
          purpose: '',
          color: '#000000',
          parentId: parentId ?? undefined,
          agentId: null,
        });
      }
    }
  }, [open, channel, parentId, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editChannel') : t('createChannel')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ch-name">{tc('name')}</Label>
            <Input id="ch-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ch-purpose">{t('purpose')}</Label>
            <Textarea id="ch-purpose" {...register('purpose')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ch-color">{t('color')}</Label>
            <div className="flex items-center gap-2">
              <Input id="ch-color" {...register('color')} placeholder="#000000" />
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
            <Label>{t('agent')}</Label>
            <Select
              value={watchedAgentId ?? 'none'}
              onValueChange={(val) => setFormValue('agentId', val === 'none' ? null : val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
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
