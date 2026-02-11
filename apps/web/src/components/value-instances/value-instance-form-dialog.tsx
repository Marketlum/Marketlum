'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  createValueInstanceSchema,
  updateValueInstanceSchema,
  type CreateValueInstanceInput,
  type ValueInstanceResponse,
  type FileResponse,
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
import { ImageLibraryDialog } from '@/components/agents/image-library-dialog';
import { FileImagePreview } from '@/components/shared/file-image-preview';
import { api } from '@/lib/api-client';

interface ValueInstanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateValueInstanceInput) => Promise<void>;
  valueInstance?: ValueInstanceResponse | null;
  isSubmitting?: boolean;
}

export function ValueInstanceFormDialog({
  open,
  onOpenChange,
  onSubmit,
  valueInstance,
  isSubmitting,
}: ValueInstanceFormDialogProps) {
  const isEditing = !!valueInstance;
  const schema = isEditing ? updateValueInstanceSchema : createValueInstanceSchema;
  const t = useTranslations('valueInstances');
  const tc = useTranslations('common');
  const { values } = useValues(open);
  const { agents } = useAgents(open);
  const [imageLibraryOpen, setImageLibraryOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ id: string; originalName: string; mimeType: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue: setFormValue,
    watch,
    formState: { errors },
  } = useForm<CreateValueInstanceInput>({
    resolver: zodResolver(schema),
  });

  const valueIdValue = watch('valueId');
  const fromAgentIdValue = watch('fromAgentId');
  const toAgentIdValue = watch('toAgentId');

  useEffect(() => {
    if (open) {
      if (valueInstance) {
        reset({
          name: valueInstance.name,
          purpose: valueInstance.purpose ?? '',
          description: valueInstance.description ?? '',
          link: valueInstance.link ?? '',
          version: valueInstance.version ?? '',
          expiresAt: valueInstance.expiresAt ?? null,
          valueId: valueInstance.value.id,
          fromAgentId: valueInstance.fromAgent?.id ?? null,
          toAgentId: valueInstance.toAgent?.id ?? null,
          imageId: valueInstance.image?.id ?? null,
        });
        setSelectedImage(
          valueInstance.image
            ? { id: valueInstance.image.id, originalName: valueInstance.image.originalName, mimeType: valueInstance.image.mimeType }
            : null,
        );
      } else {
        reset({
          name: '',
          purpose: '',
          description: '',
          link: '',
          version: '',
          expiresAt: null,
          valueId: '' as any,
          fromAgentId: null,
          toAgentId: null,
          imageId: null,
        });
        setSelectedImage(null);
      }
    }
  }, [open, valueInstance, reset]);

  const handleSelectImage = (file: FileResponse) => {
    setSelectedImage({ id: file.id, originalName: file.originalName, mimeType: file.mimeType });
    setFormValue('imageId', file.id);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setFormValue('imageId', null);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploaded = await api.upload<FileResponse>('/files', formData);
      setSelectedImage({ id: uploaded.id, originalName: uploaded.originalName, mimeType: uploaded.mimeType });
      setFormValue('imageId', uploaded.id);
    } catch {
      toast.error(t('failedToUploadImage'));
    }
    e.target.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editValueInstance') : t('createValueInstance')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vi-name">{tc('name')}</Label>
            <Input id="vi-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {/* Value (required) */}
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
            <Label htmlFor="vi-purpose">{t('purpose')}</Label>
            <Input id="vi-purpose" {...register('purpose')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vi-description">{t('valueInstanceDescription')}</Label>
            <Textarea id="vi-description" {...register('description')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vi-link">{t('link')}</Label>
            <Input id="vi-link" {...register('link')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vi-version">{t('version')}</Label>
            <Input id="vi-version" {...register('version')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vi-expiresAt">{t('expiresAt')}</Label>
            <Input
              id="vi-expiresAt"
              type="datetime-local"
              {...register('expiresAt')}
            />
          </div>

          {/* From Agent */}
          <div className="space-y-2">
            <Label>{t('fromAgent')}</Label>
            <Select
              value={fromAgentIdValue ?? 'none'}
              onValueChange={(v) => setFormValue('fromAgentId', v === 'none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectFromAgent')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To Agent */}
          <div className="space-y-2">
            <Label>{t('toAgent')}</Label>
            <Select
              value={toAgentIdValue ?? 'none'}
              onValueChange={(v) => setFormValue('toAgentId', v === 'none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectToAgent')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label>{t('image')}</Label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 rounded border bg-muted/30 flex items-center justify-center overflow-hidden">
                {selectedImage ? (
                  <FileImagePreview
                    fileId={selectedImage.id}
                    mimeType={selectedImage.mimeType}
                    alt={selectedImage.originalName}
                    iconClassName="h-6 w-6 text-muted-foreground/50"
                    imgClassName="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <label className="cursor-pointer">
                      {t('uploadImage')}
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
                    </label>
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setImageLibraryOpen(true)}>
                    {t('selectFromLibrary')}
                  </Button>
                </div>
                {selectedImage && (
                  <Button type="button" variant="ghost" size="sm" className="w-fit text-destructive" onClick={handleRemoveImage}>
                    {t('removeImage')}
                  </Button>
                )}
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
        open={imageLibraryOpen}
        onOpenChange={setImageLibraryOpen}
        onSelect={handleSelectImage}
      />
    </Dialog>
  );
}
