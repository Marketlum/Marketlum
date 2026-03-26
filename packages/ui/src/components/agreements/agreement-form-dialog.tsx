'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import {
  createAgreementSchema,
  updateAgreementSchema,
  type CreateAgreementInput,
  type AgreementResponse,
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
import { useAgents } from '../../hooks/use-agents';
import { useAgreementTemplates } from '../../hooks/use-agreement-templates';
import { ImageLibraryDialog } from '../agents/image-library-dialog';
import { FileImagePreview } from '../shared/file-image-preview';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface AgreementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateAgreementInput) => Promise<void>;
  agreement?: AgreementResponse | null;
  parentId?: string | null;
  isSubmitting?: boolean;
}

export function AgreementFormDialog({
  open,
  onOpenChange,
  onSubmit,
  agreement,
  parentId,
  isSubmitting,
}: AgreementFormDialogProps) {
  const isEditing = !!agreement;
  const schema = isEditing ? updateAgreementSchema : createAgreementSchema;
  const t = useTranslations('agreements');
  const tc = useTranslations('common');
  const { agents } = useAgents(open);
  const { agreementTemplates } = useAgreementTemplates(open);
  const [fileLibraryOpen, setFileLibraryOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ id: string; originalName: string; mimeType: string } | null>(null);
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue: setFormValue,
    watch,
    formState: { errors },
  } = useForm<CreateAgreementInput>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      if (agreement) {
        const existingPartyIds = agreement.parties?.map((p) => p.id) ?? [];
        reset({
          title: agreement.title,
          content: agreement.content ?? '',
          link: agreement.link ?? '',
          fileId: agreement.file?.id ?? null,
          partyIds: existingPartyIds,
          agreementTemplateId: agreement.agreementTemplate?.id ?? null,
        });
        setSelectedFile(
          agreement.file
            ? { id: agreement.file.id, originalName: agreement.file.originalName, mimeType: agreement.file.mimeType }
            : null,
        );
        setSelectedPartyIds(existingPartyIds);
      } else {
        reset({
          title: '',
          content: '',
          link: '',
          parentId: parentId ?? undefined,
          fileId: null,
          partyIds: [],
          agreementTemplateId: null,
        });
        setSelectedFile(null);
        setSelectedPartyIds([]);
      }
    }
  }, [open, agreement, parentId, reset]);

  const handleSelectFile = (file: FileResponse) => {
    setSelectedFile({ id: file.id, originalName: file.originalName, mimeType: file.mimeType });
    setFormValue('fileId', file.id);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFormValue('fileId', null);
  };

  const toggleParty = (agentId: string) => {
    setSelectedPartyIds((prev) => {
      const next = prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId];
      setFormValue('partyIds', next);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editAgreement') : t('createAgreement')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ag-title">{tc('name')}</Label>
            <Input id="ag-title" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ag-content">{t('content')}</Label>
            <Textarea id="ag-content" {...register('content')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ag-link">{t('link')}</Label>
            <Input id="ag-link" type="url" {...register('link')} placeholder="https://..." />
            {errors.link && <p className="text-sm text-destructive">{errors.link.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('template')}</Label>
            <Select
              value={watch('agreementTemplateId') ?? 'none'}
              onValueChange={(val) => setFormValue('agreementTemplateId', val === 'none' ? null : val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                {agreementTemplates.map((tmpl) => (
                  <SelectItem key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('parties')} <span className="text-xs text-muted-foreground">({t('partiesMin')})</span></Label>
            <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
              {agents.map((agent) => (
                <label key={agent.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPartyIds.includes(agent.id)}
                    onChange={() => toggleParty(agent.id)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span>{agent.name}</span>
                  <span className="text-xs text-muted-foreground">({agent.type})</span>
                </label>
              ))}
              {agents.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('selectParties')}</p>
              )}
            </div>
            {errors.partyIds && <p className="text-sm text-destructive">{errors.partyIds.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('file')}</Label>
            <div className="space-y-2">
              {selectedFile && (
                <div className="relative flex items-center gap-2 rounded border p-2 bg-muted/30">
                  <div className="h-8 w-8 shrink-0 rounded overflow-hidden">
                    <FileImagePreview
                      fileId={selectedFile.id}
                      mimeType={selectedFile.mimeType}
                      alt={selectedFile.originalName}
                      iconClassName="h-4 w-4 text-muted-foreground/50"
                      imgClassName="h-8 w-8 object-cover"
                    />
                  </div>
                  <span className="truncate text-sm">{selectedFile.originalName}</span>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="ml-auto rounded-full bg-background/80 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setFileLibraryOpen(true)}>
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
        open={fileLibraryOpen}
        onOpenChange={setFileLibraryOpen}
        onSelect={handleSelectFile}
      />
    </Dialog>
  );
}
