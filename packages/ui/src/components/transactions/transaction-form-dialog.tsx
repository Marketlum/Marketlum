'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type TransactionResponse,
} from '@marketlum/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useAccounts } from '../../hooks/use-accounts';

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTransactionInput) => Promise<void>;
  transaction?: TransactionResponse | null;
  isSubmitting?: boolean;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  onSubmit,
  transaction,
  isSubmitting,
}: TransactionFormDialogProps) {
  const isEditing = !!transaction;
  const schema = isEditing ? updateTransactionSchema : createTransactionSchema;
  const t = useTranslations('transactions');
  const tc = useTranslations('common');
  const { accounts } = useAccounts(open);

  const {
    register,
    handleSubmit,
    reset,
    setValue: setFormValue,
    watch,
    formState: { errors },
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(schema),
  });

  const fromAccountIdValue = watch('fromAccountId');
  const toAccountIdValue = watch('toAccountId');

  useEffect(() => {
    if (open) {
      if (transaction) {
        reset({
          description: transaction.description ?? '',
          fromAccountId: transaction.fromAccount?.id ?? '',
          toAccountId: transaction.toAccount?.id ?? '',
          amount: transaction.amount,
          timestamp: transaction.timestamp ? new Date(transaction.timestamp).toISOString().slice(0, 16) : '',
        });
      } else {
        reset({
          description: '',
          fromAccountId: '' as any,
          toAccountId: '' as any,
          amount: '',
          timestamp: '',
        });
      }
    }
  }, [open, transaction, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editTransaction') : t('createTransaction')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => {
          const submitted = {
            ...data,
            fromAccountId: data.fromAccountId || null,
            toAccountId: data.toAccountId || null,
          };
          return onSubmit(submitted as any);
        })} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('fromAccount')}</Label>
            <Select
              value={fromAccountIdValue ?? ''}
              onValueChange={(v) => setFormValue('fromAccountId', v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectFromAccount')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{tc('none')}</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.fromAccountId && <p className="text-sm text-destructive">{errors.fromAccountId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('toAccount')}</Label>
            <Select
              value={toAccountIdValue ?? ''}
              onValueChange={(v) => setFormValue('toAccountId', v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectToAccount')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{tc('none')}</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.toAccountId && <p className="text-sm text-destructive">{errors.toAccountId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-amount">{t('amount')}</Label>
            <Input id="tx-amount" {...register('amount')} placeholder="0.00" />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-description">{t('transactionDescription')}</Label>
            <Textarea id="tx-description" {...register('description')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-timestamp">{t('timestamp')}</Label>
            <Input id="tx-timestamp" type="datetime-local" {...register('timestamp')} />
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
