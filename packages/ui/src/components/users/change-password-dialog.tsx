'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { changeUserPasswordSchema, type ChangeUserPasswordInput, type UserResponse } from '@marketlum/shared';
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

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ChangeUserPasswordInput) => Promise<void>;
  user: UserResponse | null;
  isSubmitting?: boolean;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  onSubmit,
  user,
  isSubmitting,
}: ChangePasswordDialogProps) {
  const t = useTranslations('users');
  const tc = useTranslations('common');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangeUserPasswordInput>({
    resolver: zodResolver(changeUserPasswordSchema),
  });

  useEffect(() => {
    if (open) {
      reset({ password: '' });
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('changePassword')}</DialogTitle>
          <DialogDescription>
            {t('changePasswordDescription', { name: user?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t('newPasswordLabel')}</Label>
            <Input id="password" type="password" autoFocus {...register('password')} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : t('changePassword')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
