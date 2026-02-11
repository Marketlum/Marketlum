'use client';

import { useEffect, useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import {
  createValueSchema,
  updateValueSchema,
  ValueType,
  ValueParentType,
  type CreateValueInput,
  type ValueResponse,
  type TaxonomyResponse,
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
import { TaxonomyTreeSelect } from '@/components/shared/taxonomy-tree-select';
import { useTaxonomyTree } from '@/hooks/use-taxonomy-tree';
import { useAgents } from '@/hooks/use-agents';
import { useValues } from '@/hooks/use-values';
import { api } from '@/lib/api-client';
import { ImageLibraryDialog } from '@/components/agents/image-library-dialog';
import { FileImagePreview } from '@/components/shared/file-image-preview';
import { Badge } from '@/components/ui/badge';

const typeTranslationKeys: Record<string, string> = {
  [ValueType.PRODUCT]: 'typeProduct',
  [ValueType.SERVICE]: 'typeService',
  [ValueType.RELATIONSHIP]: 'typeRelationship',
  [ValueType.RIGHT]: 'typeRight',
};

const parentTypeTranslationKeys: Record<string, string> = {
  [ValueParentType.ON_TOP_OF]: 'parentTypeOnTopOf',
  [ValueParentType.PART_OF]: 'parentTypePartOf',
};

interface ValueFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateValueInput) => Promise<void>;
  value?: ValueResponse | null;
  isSubmitting?: boolean;
}

export function ValueFormDialog({
  open,
  onOpenChange,
  onSubmit,
  value,
  isSubmitting,
}: ValueFormDialogProps) {
  const isEditing = !!value;
  const schema = isEditing ? updateValueSchema : createValueSchema;
  const t = useTranslations('values');
  const tc = useTranslations('common');
  const { tree, refresh } = useTaxonomyTree();
  const { agents } = useAgents(open);
  const { values: allValues } = useValues(open);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{ id: string; originalName: string }[]>([]);
  const [imageLibraryOpen, setImageLibraryOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{ id: string; originalName: string; mimeType: string }[]>([]);

  const handleCreateTaxonomy = useCallback(
    async (name: string, parentId?: string): Promise<string | null> => {
      try {
        const body: Record<string, string> = { name };
        if (parentId) body.parentId = parentId;
        const created = await api.post<TaxonomyResponse>('/taxonomies', body);
        toast.success(t('taxonomyCreated'));
        refresh();
        return created.id;
      } catch {
        toast.error(t('failedToCreateTaxonomy'));
        return null;
      }
    },
    [refresh, t],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue: setFormValue,
    watch,
    formState: { errors },
  } = useForm<CreateValueInput>({
    resolver: zodResolver(schema),
  });

  const typeValue = watch('type');
  const mainTaxonomyIdValue = watch('mainTaxonomyId');
  const taxonomyIdsValue = watch('taxonomyIds') ?? [];
  const parentIdValue = watch('parentId');

  useEffect(() => {
    if (open) {
      if (value) {
        reset({
          name: value.name,
          type: value.type as ValueType,
          purpose: value.purpose ?? '',
          description: value.description ?? '',
          link: value.link ?? '',
          parentId: value.parent?.id ?? null,
          parentType: value.parentType ?? null,
          agentId: value.agent?.id ?? null,
          mainTaxonomyId: value.mainTaxonomy?.id ?? null,
          taxonomyIds: value.taxonomies?.map((t) => t.id) ?? [],
          fileIds: value.files?.map((f) => f.id) ?? [],
          imageIds: (value as any).images?.map((img: any) => img.id) ?? [],
        });
        setSelectedFiles(
          value.files?.map((f) => ({ id: f.id, originalName: f.originalName })) ?? [],
        );
        setSelectedImages(
          (value as any).images?.map((img: any) => ({ id: img.id, originalName: img.originalName, mimeType: img.mimeType })) ?? [],
        );
      } else {
        reset({
          name: '',
          type: ValueType.PRODUCT,
          purpose: '',
          description: '',
          link: '',
          parentId: null,
          parentType: null,
          agentId: null,
          mainTaxonomyId: null,
          taxonomyIds: [],
          fileIds: [],
          imageIds: [],
        });
        setSelectedFiles([]);
        setSelectedImages([]);
      }
    }
  }, [open, value, reset]);

  const toggleTaxonomyId = (id: string) => {
    const current = taxonomyIdsValue;
    if (current.includes(id)) {
      setFormValue(
        'taxonomyIds',
        current.filter((tid) => tid !== id),
      );
    } else {
      setFormValue('taxonomyIds', [...current, id]);
    }
  };

  const handleSelectFile = (file: FileResponse) => {
    const current = selectedFiles;
    if (!current.find((f) => f.id === file.id)) {
      const updated = [...current, { id: file.id, originalName: file.originalName }];
      setSelectedFiles(updated);
      setFormValue('fileIds', updated.map((f) => f.id));
    }
  };

  const handleRemoveFile = (fileId: string) => {
    const updated = selectedFiles.filter((f) => f.id !== fileId);
    setSelectedFiles(updated);
    setFormValue('fileIds', updated.map((f) => f.id));
  };

  const handleSelectImage = (file: FileResponse) => {
    const current = selectedImages;
    if (!current.find((f) => f.id === file.id)) {
      const updated = [...current, { id: file.id, originalName: file.originalName, mimeType: file.mimeType }];
      setSelectedImages(updated);
      setFormValue('imageIds' as any, updated.map((f) => f.id));
    }
  };

  const handleRemoveImage = (imageId: string) => {
    const updated = selectedImages.filter((f) => f.id !== imageId);
    setSelectedImages(updated);
    setFormValue('imageIds' as any, updated.map((f) => f.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editValue') : t('createValue')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="value-name">{tc('name')}</Label>
            <Input id="value-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>{tc('type')}</Label>
            <Select
              value={typeValue}
              onValueChange={(v) => setFormValue('type', v as ValueType)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectType')} />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ValueType).map((vt) => (
                  <SelectItem key={vt} value={vt}>
                    {t(typeTranslationKeys[vt])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="purpose">{t('purpose')}</Label>
            <Input id="purpose" {...register('purpose')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('valueDescription')}</Label>
            <Textarea id="description" {...register('description')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link">{t('link')}</Label>
            <Input id="link" {...register('link')} />
          </div>

          {/* Parent */}
          <div className="space-y-2">
            <Label>{t('parent')}</Label>
            <Select
              value={parentIdValue ?? 'none'}
              onValueChange={(v) => setFormValue('parentId', v === 'none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectParent')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                {allValues
                  .filter((v) => v.id !== value?.id)
                  .map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {parentIdValue && (
            <div className="space-y-2">
              <Label>{t('parentType')}</Label>
              <Select
                value={watch('parentType') ?? 'none'}
                onValueChange={(v) => setFormValue('parentType', v === 'none' ? null : v as ValueParentType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectParentType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {Object.values(ValueParentType).map((pt) => (
                    <SelectItem key={pt} value={pt}>
                      {t(parentTypeTranslationKeys[pt])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Agent */}
          <div className="space-y-2">
            <Label>{t('agent')}</Label>
            <Select
              value={watch('agentId') ?? 'none'}
              onValueChange={(v) => setFormValue('agentId', v === 'none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAgent')} />
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

          {/* Taxonomies */}
          <div className="space-y-2">
            <Label>{t('mainTaxonomy')}</Label>
            <TaxonomyTreeSelect
              tree={tree}
              value={mainTaxonomyIdValue}
              onSelect={(id) => setFormValue('mainTaxonomyId', id)}
              placeholder={t('selectMainTaxonomy')}
              noneLabel="-"
              onCreate={handleCreateTaxonomy}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('taxonomies')}</Label>
            <TaxonomyTreeSelect
              tree={tree}
              multiple
              values={taxonomyIdsValue}
              onToggle={toggleTaxonomyId}
              placeholder={t('selectTaxonomies')}
              onCreate={handleCreateTaxonomy}
            />
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label>{t('images')}</Label>
            <div className="space-y-2">
              {selectedImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {selectedImages.map((img) => (
                    <div key={img.id} className="relative h-16 w-16 rounded overflow-hidden border bg-muted/30">
                      <FileImagePreview
                        fileId={img.id}
                        mimeType={img.mimeType}
                        alt={img.originalName}
                        iconClassName="h-6 w-6 text-muted-foreground/50"
                        imgClassName="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setImageLibraryOpen(true)}>
                {t('selectImages')}
              </Button>
            </div>
          </div>

          {/* Files */}
          <div className="space-y-2">
            <Label>{t('files')}</Label>
            <div className="space-y-2">
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedFiles.map((f) => (
                    <Badge key={f.id} variant="secondary" className="gap-1">
                      {f.originalName}
                      <button type="button" onClick={() => handleRemoveFile(f.id)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setLibraryOpen(true)}>
                {t('selectFiles')}
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
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={handleSelectFile}
      />

      <ImageLibraryDialog
        open={imageLibraryOpen}
        onOpenChange={setImageLibraryOpen}
        onSelect={handleSelectImage}
      />
    </Dialog>
  );
}
