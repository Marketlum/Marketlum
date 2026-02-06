'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, updateUserSchema, type CreateUserInput, type UserResponse } from '@marketlum/shared';
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

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateUserInput) => Promise<void>;
  user?: UserResponse | null;
  isSubmitting?: boolean;
}

export function UserFormDialog({
  open,
  onOpenChange,
  onSubmit,
  user,
  isSubmitting,
}: UserFormDialogProps) {
  const isEditing = !!user;
  const schema = isEditing ? updateUserSchema : createUserSchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      reset(user ? { name: user.name, email: user.email, password: '' } : { name: '', email: '', password: '' });
    }
  }, [open, user, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit User' : 'Create User'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update user details below.' : 'Fill in the details to create a new user.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              Password{isEditing && ' (leave blank to keep current)'}
            </Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
