'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import {
  createValueStreamSchema,
  updateValueStreamSchema,
  type CreateValueStreamInput,
  type ValueStreamResponse,
  type FileResponse,
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
import { useUsers } from '../../hooks/use-users';
import { ImageLibraryDialog } from '../agents/image-library-dialog';
import { FileImagePreview } from '../shared/file-image-preview';

interface ValueStreamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateValueStreamInput) => Promise<void>;
  valueStream?: ValueStreamResponse | null;
  parentId?: string | null;
  isSubmitting?: boolean;
}

export function ValueStreamFormDialog({
  open,
  onOpenChange,
  onSubmit,
  valueStream,
  parentId,
  isSubmitting,
}: ValueStreamFormDialogProps) {
  const isEditing = !!valueStream;
  const schema = isEditing ? updateValueStreamSchema : createValueStreamSchema;
  const t = useTranslations('valueStreams');
  const tc = useTranslations('common');
  const { users } = useUsers(open);
  const [imageLibraryOpen, setImageLibraryOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ id: string; originalName: string; mimeType: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue: setFormValue,
    watch,
    formState: { errors },
  } = useForm<CreateValueStreamInput>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      if (valueStream) {
        reset({
          name: valueStream.name,
          purpose: valueStream.purpose ?? '',
          leadUserId: valueStream.lead?.id ?? null,
          imageId: valueStream.image?.id ?? null,
        });
        setSelectedImage(
          valueStream.image
            ? { id: valueStream.image.id, originalName: valueStream.image.originalName, mimeType: valueStream.image.mimeType }
            : null,
        );
      } else {
        reset({
          name: '',
          purpose: '',
          parentId: parentId ?? undefined,
          leadUserId: null,
          imageId: null,
        });
        setSelectedImage(null);
      }
    }
  }, [open, valueStream, parentId, reset]);

  const handleSelectImage = (file: FileResponse) => {
    setSelectedImage({ id: file.id, originalName: file.originalName, mimeType: file.mimeType });
    setFormValue('imageId', file.id);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setFormValue('imageId', null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editValueStream') : t('createValueStream')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vs-name">{tc('name')}</Label>
            <Input id="vs-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="vs-purpose">{t('purpose')}</Label>
            <Textarea id="vs-purpose" {...register('purpose')} />
          </div>

          <div className="space-y-2">
            <Label>{t('lead')}</Label>
            <Select
              value={watch('leadUserId') ?? 'none'}
              onValueChange={(v) => setFormValue('leadUserId', v === 'none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectLead')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('image')}</Label>
            <div className="space-y-2">
              {selectedImage && (
                <div className="relative h-16 w-16 rounded overflow-hidden border bg-muted/30">
                  <FileImagePreview
                    fileId={selectedImage.id}
                    mimeType={selectedImage.mimeType}
                    alt={selectedImage.originalName}
                    iconClassName="h-6 w-6 text-muted-foreground/50"
                    imgClassName="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setImageLibraryOpen(true)}>
                {t('selectFromLibrary')}
              </Button>
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
        open={imageLibraryOpen}
        onOpenChange={setImageLibraryOpen}
        onSelect={handleSelectImage}
      />
    </Dialog>
  );
}
