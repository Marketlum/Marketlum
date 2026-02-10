'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Upload, ImageIcon, Library, X } from 'lucide-react';
import {
  createAgentSchema,
  updateAgentSchema,
  AgentType,
  type CreateAgentInput,
  type AgentResponse,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaxonomyTreeSelect } from '@/components/shared/taxonomy-tree-select';
import { FileImagePreview } from '@/components/shared/file-image-preview';
import { useTaxonomyTree } from '@/hooks/use-taxonomy-tree';
import { api } from '@/lib/api-client';
import { ImageLibraryDialog } from './image-library-dialog';

const typeTranslationKeys: Record<string, string> = {
  [AgentType.ORGANIZATION]: 'typeOrganization',
  [AgentType.INDIVIDUAL]: 'typeIndividual',
  [AgentType.VIRTUAL]: 'typeVirtual',
};

interface AgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateAgentInput) => Promise<void>;
  agent?: AgentResponse | null;
  isSubmitting?: boolean;
}

export function AgentFormDialog({
  open,
  onOpenChange,
  onSubmit,
  agent,
  isSubmitting,
}: AgentFormDialogProps) {
  const isEditing = !!agent;
  const schema = isEditing ? updateAgentSchema : createAgentSchema;
  const t = useTranslations('agents');
  const tc = useTranslations('common');
  const { tree, refresh } = useTaxonomyTree();
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
  } = useForm<CreateAgentInput>({
    resolver: zodResolver(schema),
  });

  const typeValue = watch('type');
  const mainTaxonomyIdValue = watch('mainTaxonomyId');
  const taxonomyIdsValue = watch('taxonomyIds') ?? [];

  useEffect(() => {
    if (open) {
      if (agent) {
        reset({
          name: agent.name,
          type: agent.type,
          purpose: agent.purpose ?? '',
          mainTaxonomyId: agent.mainTaxonomy?.id ?? null,
          taxonomyIds: agent.taxonomies?.map((t) => t.id) ?? [],
          imageId: agent.image?.id ?? null,
        });
        setImagePreview(
          agent.image
            ? { id: agent.image.id, originalName: agent.image.originalName, mimeType: agent.image.mimeType }
            : null,
        );
      } else {
        reset({
          name: '',
          type: AgentType.ORGANIZATION,
          purpose: '',
          mainTaxonomyId: null,
          taxonomyIds: [],
          imageId: null,
        });
        setImagePreview(null);
      }
    }
  }, [open, agent, reset]);

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
          <DialogTitle>{isEditing ? t('editAgent') : t('createAgent')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-name">{tc('name')}</Label>
            <Input id="agent-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>{tc('type')}</Label>
            <Select
              value={typeValue}
              onValueChange={(value) => setValue('type', value as AgentType)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectType')} />
              </SelectTrigger>
              <SelectContent>
                {Object.values(AgentType).map((agentType) => (
                  <SelectItem key={agentType} value={agentType}>
                    {t(typeTranslationKeys[agentType])}
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
