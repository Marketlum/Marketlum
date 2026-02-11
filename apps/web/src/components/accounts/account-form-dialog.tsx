'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  createAccountSchema,
  updateAccountSchema,
  type CreateAccountInput,
  type AccountResponse,
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
import { useValues } from '@/hooks/use-values';
import { useAgents } from '@/hooks/use-agents';

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateAccountInput) => Promise<void>;
  account?: AccountResponse | null;
  isSubmitting?: boolean;
}

export function AccountFormDialog({
  open,
  onOpenChange,
  onSubmit,
  account,
  isSubmitting,
}: AccountFormDialogProps) {
  const isEditing = !!account;
  const schema = isEditing ? updateAccountSchema : createAccountSchema;
  const t = useTranslations('accounts');
  const tc = useTranslations('common');
  const { values } = useValues(open);
  const { agents } = useAgents(open);

  const {
    register,
    handleSubmit,
    reset,
    setValue: setFormValue,
    watch,
    formState: { errors },
  } = useForm<CreateAccountInput>({
    resolver: zodResolver(schema),
  });

  const valueIdValue = watch('valueId');
  const agentIdValue = watch('agentId');

  useEffect(() => {
    if (open) {
      if (account) {
        reset({
          name: account.name,
          description: account.description ?? '',
          valueId: account.value.id,
          agentId: account.agent.id,
        });
      } else {
        reset({
          name: '',
          description: '',
          valueId: '' as any,
          agentId: '' as any,
        });
      }
    }
  }, [open, account, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editAccount') : t('createAccount')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="acc-name">{tc('name')}</Label>
            <Input id="acc-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('value')}</Label>
            <Select
              value={valueIdValue ?? ''}
              onValueChange={(v) => setFormValue('valueId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectValue')} />
              </SelectTrigger>
              <SelectContent>
                {values.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.valueId && <p className="text-sm text-destructive">{errors.valueId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('agent')}</Label>
            <Select
              value={agentIdValue ?? ''}
              onValueChange={(v) => setFormValue('agentId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAgent')} />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.agentId && <p className="text-sm text-destructive">{errors.agentId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="acc-description">{t('accountDescription')}</Label>
            <Textarea id="acc-description" {...register('description')} />
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
