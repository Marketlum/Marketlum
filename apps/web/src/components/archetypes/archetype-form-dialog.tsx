'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Upload, ImageIcon, Library, X } from 'lucide-react';
import {
  createArchetypeSchema,
  updateArchetypeSchema,
  type CreateArchetypeInput,
  type ArchetypeResponse,
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
import { useTaxonomies } from '@/hooks/use-taxonomies';
import { MarkdownEditor } from '@/components/shared/markdown-editor';
import { TaxonomyMultiCombobox } from '@/components/shared/taxonomy-multi-combobox';
import { FileImagePreview } from '@/components/shared/file-image-preview';
import { ImageLibraryDialog } from './image-library-dialog';
import { api } from '@/lib/api-client';

interface ArchetypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateArchetypeInput) => Promise<void>;
  archetype?: ArchetypeResponse | null;
  isSubmitting?: boolean;
}

export function ArchetypeFormDialog({
  open,
  onOpenChange,
  onSubmit,
  archetype,
  isSubmitting,
}: ArchetypeFormDialogProps) {
  const isEditing = !!archetype;
  const schema = isEditing ? updateArchetypeSchema : createArchetypeSchema;
  const t = useTranslations('archetypes');
  const tc = useTranslations('common');
  const { taxonomies } = useTaxonomies();
  const [selectedTaxonomyIds, setSelectedTaxonomyIds] = useState<string[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ id: string; originalName: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateArchetypeInput>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      if (archetype) {
        reset({
          name: archetype.name,
          purpose: archetype.purpose ?? '',
          description: archetype.description ?? '',
          imageId: archetype.image?.id ?? null,
        });
        setSelectedTaxonomyIds(archetype.taxonomies.map((tax) => tax.id));
        setImagePreview(
          archetype.image
            ? { id: archetype.image.id, originalName: archetype.image.originalName, mimeType: archetype.image.mimeType }
            : null,
        );
      } else {
        reset({
          name: '',
          purpose: '',
          description: '',
          imageId: null,
        });
        setSelectedTaxonomyIds([]);
        setImagePreview(null);
      }
    }
  }, [open, archetype, reset]);

  const handleFormSubmit = (data: CreateArchetypeInput) => {
    return onSubmit({
      ...data,
      taxonomyIds: selectedTaxonomyIds,
    });
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploaded = await api.upload<FileResponse>('/files/upload', formData);
      setValue('imageId', uploaded.id);
      setImagePreview({ id: uploaded.id, originalName: uploaded.originalName, mimeType: uploaded.mimeType });
    } catch {
      toast.error(t('failedToUploadImage'));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectFromLibrary = (file: FileResponse) => {
    setValue('imageId', file.id);
    setImagePreview({ id: file.id, originalName: file.originalName, mimeType: file.mimeType });
  };

  const handleRemoveImage = () => {
    setValue('imageId', null);
    setImagePreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editArchetype') : t('createArchetype')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="arch-name">{tc('name')}</Label>
            <Input id="arch-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('purpose')}</Label>
            <MarkdownEditor
              id="arch-purpose"
              value={watch('purpose') ?? ''}
              onChange={(v) => setValue('purpose', v)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('archetypeDescription')}</Label>
            <MarkdownEditor
              id="arch-description"
              value={watch('description') ?? ''}
              onChange={(v) => setValue('description', v)}
            />
          </div>

          {/* Image picker */}
          <div className="space-y-2">
            <Label>{t('image')}</Label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden">
                {imagePreview ? (
                  <FileImagePreview
                    fileId={imagePreview.id}
                    mimeType={imagePreview.mimeType}
                    alt={imagePreview.originalName}
                    iconClassName="h-8 w-8 text-muted-foreground/50"
                    imgClassName="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
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
                    {t('uploadImage')}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setLibraryOpen(true)}>
                    <Library className="mr-1.5 h-3.5 w-3.5" />
                    {t('selectFromLibrary')}
                  </Button>
                  {imagePreview && (
                    <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage}>
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      {t('removeImage')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('taxonomies')}</Label>
            <TaxonomyMultiCombobox
              taxonomies={taxonomies}
              selected={selectedTaxonomyIds}
              onSelectionChange={setSelectedTaxonomyIds}
              placeholder={t('selectTaxonomies')}
            />
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
