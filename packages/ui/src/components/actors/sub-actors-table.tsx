'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Bot, Plus } from 'lucide-react';
import type { ActorResponse, CreateActorInput } from '@marketlum/shared';
import { ActorType } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Can } from '../../permissions/can';
import { ActorTypeBadge } from './actor-type-badge';
import { FileImagePreview } from '../shared/file-image-preview';
import { ActorFormDialog } from './actor-form-dialog';

const typeTranslationKeys: Record<string, string> = {
  [ActorType.ORGANIZATION]: 'typeOrganization',
  [ActorType.INDIVIDUAL]: 'typeIndividual',
  [ActorType.VIRTUAL]: 'typeVirtual',
};

interface SubActorsTableProps {
  actorId: string;
}

/** Direct children of an actor, with "Add sub-actor" preselecting the parent. */
export function SubActorsTable({ actorId }: SubActorsTableProps) {
  const router = useRouter();
  const t = useTranslations('actors');
  const tc = useTranslations('common');
  const [children, setChildren] = useState<ActorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchChildren = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ActorResponse[]>(`/actors/${actorId}/children`);
      setChildren(data);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [actorId, t]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const handleCreate = async (input: CreateActorInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/actors', input);
      toast.success(t('created'));
      setFormOpen(false);
      fetchChildren();
    } catch {
      toast.error(t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Can resource="actors" action="write">
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('addSubActor')}
          </Button>
        </div>
      </Can>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          {tc('loading')}
        </div>
      ) : children.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noSubActors')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">{t('image')}</TableHead>
              <TableHead>{tc('name')}</TableHead>
              <TableHead>{tc('type')}</TableHead>
              <TableHead>{t('purpose')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {children.map((child) => (
              <TableRow
                key={child.id}
                className="cursor-pointer"
                onClick={() => router.push(`/admin/actors/${child.id}`)}
              >
                <TableCell>
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-muted/30">
                    {child.image ? (
                      <FileImagePreview
                        fileId={child.image.id}
                        mimeType={child.image.mimeType}
                        alt={child.name}
                        iconClassName="h-4 w-4 text-muted-foreground/50"
                        imgClassName="h-full w-full object-cover"
                      />
                    ) : (
                      <Bot className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </div>
                </TableCell>
                <TableCell>{child.name}</TableCell>
                <TableCell>
                  <ActorTypeBadge
                    type={child.type}
                    label={t(typeTranslationKeys[child.type])}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">{child.purpose || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ActorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        defaultParentId={actorId}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
