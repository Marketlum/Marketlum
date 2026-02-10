'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Upload, User, Library, X } from 'lucide-react';
import { createUserSchema, updateUserSchema, type CreateUserInput, type UserResponse, type FileResponse } from '@marketlum/shared';
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
import { FileImagePreview } from '@/components/shared/file-image-preview';
import { ImageLibraryDialog } from '@/components/agents/image-library-dialog';
import { api } from '@/lib/api-client';

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
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ id: string; originalName: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      if (user) {
        reset({
          name: user.name,
          email: user.email,
          password: '',
          avatarId: user.avatar?.id ?? null,
        });
        setImagePreview(
          user.avatar
            ? { id: user.avatar.id, originalName: user.avatar.originalName, mimeType: user.avatar.mimeType }
            : null,
        );
      } else {
        reset({ name: '', email: '', password: '', avatarId: null });
        setImagePreview(null);
      }
    }
  }, [open, user, reset]);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploaded = await api.upload<FileResponse>('/files/upload', formData);
      setValue('avatarId', uploaded.id);
      setImagePreview({ id: uploaded.id, originalName: uploaded.originalName, mimeType: uploaded.mimeType });
    } catch {
      toast.error(t('failedToUploadAvatar'));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectFromLibrary = (file: FileResponse) => {
    setValue('avatarId', file.id);
    setImagePreview({ id: file.id, originalName: file.originalName, mimeType: file.mimeType });
  };

  const handleRemoveImage = () => {
    setValue('avatarId', null);
    setImagePreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editUser') : t('createUser')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{tc('name')}</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{tc('email')}</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              {t('passwordLabel')}{isEditing && t('passwordEditHint')}
            </Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Avatar picker */}
          <div className="space-y-2">
            <Label>{t('avatar')}</Label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 rounded-full border bg-muted/30 flex items-center justify-center overflow-hidden">
                {imagePreview ? (
                  <FileImagePreview
                    fileId={imagePreview.id}
                    mimeType={imagePreview.mimeType}
                    alt={imagePreview.originalName}
                    iconClassName="h-8 w-8 text-muted-foreground/50"
                    imgClassName="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadImage}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {t('uploadAvatar')}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setLibraryOpen(true)}>
                    <Library className="mr-1.5 h-3.5 w-3.5" />
                    {t('selectFromLibrary')}
                  </Button>
                  {imagePreview && (
                    <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage}>
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      {t('removeAvatar')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
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

      <ImageLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={handleSelectFromLibrary}
      />
    </Dialog>
  );
}
