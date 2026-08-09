'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Upload, ImageIcon, Library, X } from 'lucide-react';
import {
  createActorSchema,
  updateActorSchema,
  ActorType,
  ValueType,
  type CreateActorInput,
  type ActorResponse,
  type ActorSnapshotReferencesResponse,
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
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { TaxonomyTreeSelect } from '../shared/taxonomy-tree-select';
import { FileImagePreview } from '../shared/file-image-preview';
import { useTaxonomyTree } from '../../hooks/use-taxonomy-tree';
import { useValues } from '../../hooks/use-values';
import { useActors } from '../../hooks/use-actors';
import { api } from '../../lib/api-client';
import { usePermissions } from '../../permissions/permissions-context';
import { ImageLibraryDialog } from './image-library-dialog';

const typeTranslationKeys: Record<string, string> = {
  [ActorType.ORGANIZATION]: 'typeOrganization',
  [ActorType.INDIVIDUAL]: 'typeIndividual',
  [ActorType.VIRTUAL]: 'typeVirtual',
  [ActorType.AGENT]: 'typeAgent',
};

interface ActorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateActorInput) => Promise<void>;
  actor?: ActorResponse | null;
  /** When set (create mode only), pre-fills the name field. */
  defaultName?: string;
  /** When set (create mode only), preselects and locks the parent actor. */
  defaultParentId?: string;
  isSubmitting?: boolean;
}

export function ActorFormDialog({
  open,
  onOpenChange,
  onSubmit,
  actor,
  defaultName,
  defaultParentId,
  isSubmitting,
}: ActorFormDialogProps) {
  const isEditing = !!actor;
  const schema = isEditing ? updateActorSchema : createActorSchema;
  const t = useTranslations('actors');
  const tc = useTranslations('common');
  const { tree, refresh } = useTaxonomyTree();
  const { can } = usePermissions();
  const canWriteTaxonomies = can('taxonomies', 'write');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ id: string; originalName: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateActorInput>({
    resolver: zodResolver(schema),
  });

  const typeValue = watch('type');
  const mainTaxonomyIdValue = watch('mainTaxonomyId');
  const taxonomyIdsValue = watch('taxonomyIds') ?? [];
  const functionalCurrencyIdValue = watch('functionalCurrencyId');
  const parentIdValue = watch('parentId');
  const { actors: allActors } = useActors(open && !isEditing);
  const { values: allValues } = useValues(open);
  const currencyOptions = allValues.filter((v) => v.type === ValueType.CURRENCY);
  const originalFunctionalCurrencyId = actor?.functionalCurrency?.id ?? null;
  const [snapshotRefs, setSnapshotRefs] = useState<ActorSnapshotReferencesResponse | null>(null);

  useEffect(() => {
    if (open && actor) {
      api
        .get<ActorSnapshotReferencesResponse>(`/actors/${actor.id}/snapshot-references`)
        .then(setSnapshotRefs)
        .catch(() => setSnapshotRefs(null));
    } else {
      setSnapshotRefs(null);
    }
  }, [open, actor]);

  const showCurrencyChangeWarning =
    isEditing &&
    functionalCurrencyIdValue !== undefined &&
    functionalCurrencyIdValue !== originalFunctionalCurrencyId &&
    snapshotRefs !== null &&
    snapshotRefs.invoiceItems > 0;

  useEffect(() => {
    if (open) {
      if (actor) {
        reset({
          name: actor.name,
          type: actor.type,
          purpose: actor.purpose ?? '',
          email: actor.email ?? null,
          website: actor.website ?? null,
          mainTaxonomyId: actor.mainTaxonomy?.id ?? null,
          taxonomyIds: actor.taxonomies?.map((t) => t.id) ?? [],
          imageId: actor.image?.id ?? null,
          functionalCurrencyId: actor.functionalCurrency?.id ?? null,
        });
        setImagePreview(
          actor.image
            ? { id: actor.image.id, originalName: actor.image.originalName, mimeType: actor.image.mimeType }
            : null,
        );
      } else {
        reset({
          name: defaultName ?? '',
          type: ActorType.ORGANIZATION,
          purpose: '',
          email: null,
          website: null,
          mainTaxonomyId: null,
          taxonomyIds: [],
          imageId: null,
          functionalCurrencyId: null,
          parentId: defaultParentId ?? null,
        });
        setImagePreview(null);
      }
    }
  }, [open, actor, defaultName, defaultParentId, reset]);

  const toggleTaxonomyId = (id: string) => {
    const current = taxonomyIdsValue;
    if (current.includes(id)) {
      setValue(
        'taxonomyIds',
        current.filter((tid) => tid !== id),
      );
    } else {
      setValue('taxonomyIds', [...current, id]);
    }
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editActor') : t('createActor')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="actor-name">{tc('name')}</Label>
            <Input id="actor-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>{tc('type')}</Label>
            <Select
              value={typeValue}
              onValueChange={(value) => setValue('type', value as ActorType)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectType')} />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ActorType).map((actorType) => (
                  <SelectItem key={actorType} value={actorType}>
                    {t(typeTranslationKeys[actorType])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="purpose">{t('purpose')}</Label>
            <Input id="purpose" {...register('purpose')} />
            {errors.purpose && (
              <p className="text-sm text-destructive">{errors.purpose.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              {...register('email', { setValueAs: (v) => (v === '' ? null : v) })}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">{t('website')}</Label>
            <Input
              id="website"
              placeholder="https://"
              {...register('website', { setValueAs: (v) => (v === '' ? null : v) })}
            />
            {errors.website && (
              <p className="text-sm text-destructive">{errors.website.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('parent')}</Label>
            {isEditing ? (
              <p className="text-sm text-muted-foreground">
                {actor?.parent ? actor.parent.name : t('noParent')}
                <span className="ml-1 text-xs">({t('parentEditHint')})</span>
              </p>
            ) : (
              <Select
                value={parentIdValue ?? '__none__'}
                disabled={!!defaultParentId}
                onValueChange={(v) => setValue('parentId', v === '__none__' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('noParent')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('noParent')}</SelectItem>
                  {allActors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('functionalCurrency')}</Label>
            <Select
              value={functionalCurrencyIdValue ?? '__none__'}
              onValueChange={(v) =>
                setValue('functionalCurrencyId', v === '__none__' ? null : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectFunctionalCurrency')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {currencyOptions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showCurrencyChangeWarning && snapshotRefs && (
              <div className="rounded-md border border-yellow-400 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
                {t('functionalCurrencyChangeWarning', {
                  invoiceItems: snapshotRefs.invoiceItems,
                })}
              </div>
            )}
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
            <Label>{t('mainTaxonomy')}</Label>
            <TaxonomyTreeSelect
              tree={tree}
              value={mainTaxonomyIdValue}
              onSelect={(id) => setValue('mainTaxonomyId', id)}
              placeholder={t('selectMainTaxonomy')}
              noneLabel="-"
              onCreate={canWriteTaxonomies ? handleCreateTaxonomy : undefined}
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
              onCreate={canWriteTaxonomies ? handleCreateTaxonomy : undefined}
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
