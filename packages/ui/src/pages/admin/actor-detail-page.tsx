'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Bot, Pencil, Trash2, ArrowLeft, FolderTree } from 'lucide-react';
import type { ActorResponse, CreateActorInput } from '@marketlum/shared';
import { useActors } from '../../hooks/use-actors';
import { api, ApiError } from '../../lib/api-client';
import { toast } from 'sonner';
import { FileImagePreview } from '../../components/shared/file-image-preview';
import { ActorFormDialog } from '../../components/actors/actor-form-dialog';
import { ActorTypeBadge } from '../../components/actors/actor-type-badge';
import { ActorValuesTable } from '../../components/actors/actor-values-table';
import { AddressesList } from '../../components/actors/addresses-list';
import { SubActorsTable } from '../../components/actors/sub-actors-table';
import { ActorFinancialsTab } from '../../components/actors/actor-financials-tab';
import { OfferingsDataTable } from '../../components/offerings/offerings-data-table';
import { AgreementTemplatesDataTable } from '../../components/agreement-templates/agreement-templates-data-table';
import { AgreementsDataTable } from '../../components/agreements/agreements-data-table';
import { ExchangesDataTable } from '../../components/exchanges/exchanges-data-table';
import { InvoicesDataTable } from '../../components/invoices/invoices-data-table';
import { OrdersDataTable } from '../../components/orders/orders-data-table';
import { ConfirmDeleteDialog } from '../../components/shared/confirm-delete-dialog';
import { Can } from '../../permissions/can';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

const typeTranslationKeys: Record<string, string> = {
  organization: 'typeOrganization',
  individual: 'typeIndividual',
  virtual: 'typeVirtual',
};

export function ActorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('actors');
  const tc = useTranslations('common');

  const [actor, setActor] = useState<ActorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveParentId, setMoveParentId] = useState<string>('__root__');
  const { actors: allActors } = useActors(moveOpen);
  const [descendantIds, setDescendantIds] = useState<Set<string>>(new Set());

  const fetchActor = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<ActorResponse>(`/actors/${params.id}`);
      setActor(result);
      setNotFound(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchActor();
  }, [fetchActor]);

  const handleEdit = async (input: CreateActorInput) => {
    if (!actor) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/actors/${actor.id}`, input);
      toast.success(t('updated'));
      setEditOpen(false);
      fetchActor();
    } catch {
      toast.error(t('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!actor) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/actors/${actor.id}`);
      toast.success(t('deleted'));
      router.push('/admin/actors');
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openMove = async () => {
    if (!actor) return;
    setMoveParentId(actor.parent ? actor.parent.id : '__root__');
    // Own subtree is not a valid move target; the server enforces this too.
    try {
      const descendants = await api.get<ActorResponse[]>(`/actors/${actor.id}/descendants`);
      setDescendantIds(new Set(descendants.map((d) => d.id)));
    } catch {
      setDescendantIds(new Set());
    }
    setMoveOpen(true);
  };

  const handleMove = async () => {
    if (!actor) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/actors/${actor.id}/move`, {
        parentId: moveParentId === '__root__' ? null : moveParentId,
      });
      toast.success(t('moved'));
      setMoveOpen(false);
      fetchActor();
    } catch {
      toast.error(t('failedToMove'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveCandidates = allActors.filter(
    (candidate) => actor && candidate.id !== actor.id && !descendantIds.has(candidate.id),
  );

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        {tc('loading')}
      </div>
    );
  }

  if (notFound || !actor) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h2 className="text-xl font-semibold">{t('notFound')}</h2>
        <p className="text-muted-foreground">{t('notFoundDescription')}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/actors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToActors')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin">{tc('home')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/actors">{t('title')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {(actor.ancestors ?? []).map((ancestor) => (
            <BreadcrumbItem key={ancestor.id} className="hidden md:inline-flex">
              <BreadcrumbSeparator />
              <BreadcrumbLink asChild>
                <Link href={`/admin/actors/${ancestor.id}`}>{ancestor.name}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          ))}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{actor.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6 flex items-start gap-4">
        <div className="h-24 w-24 shrink-0 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
          {actor.image ? (
            <FileImagePreview
              fileId={actor.image.id}
              mimeType={actor.image.mimeType}
              alt={actor.name}
              iconClassName="h-12 w-12 text-muted-foreground/50"
              imgClassName="h-full w-full object-cover"
            />
          ) : (
            <Bot className="h-12 w-12 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold truncate">{actor.name}</h1>
            <ActorTypeBadge type={actor.type} label={t(typeTranslationKeys[actor.type])} />
          </div>
          <Can resource="actors" action="write">
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                {tc('edit')}
              </Button>
              <Button variant="outline" size="sm" onClick={openMove}>
                <FolderTree className="mr-1.5 h-3.5 w-3.5" />
                {t('move')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {tc('delete')}
              </Button>
            </div>
          </Can>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{t('details')}</TabsTrigger>
          <TabsTrigger value="financials">{t('financialsTab')}</TabsTrigger>
          <TabsTrigger value="sub-actors">{t('subActorsTab')}</TabsTrigger>
          <TabsTrigger value="values">{t('valuesTab')}</TabsTrigger>
          <TabsTrigger value="offerings">{t('offeringsTab')}</TabsTrigger>
          <TabsTrigger value="exchanges">{t('exchangesTab')}</TabsTrigger>
          <TabsTrigger value="agreements">{t('agreementsTab')}</TabsTrigger>
          <TabsTrigger value="orders">{t('ordersTab')}</TabsTrigger>
          <TabsTrigger value="invoices">{t('invoicesTab')}</TabsTrigger>
          <TabsTrigger value="agreement-templates">{t('agreementTemplatesTab')}</TabsTrigger>
          <TabsTrigger value="addresses">
            {t('addressesTab')} ({actor.addresses?.length ?? 0})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">{t('purpose')}</p>
                  <p>{actor.purpose || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{tc('created')}</p>
                  <p>{new Date(actor.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('updatedAt')}</p>
                  <p>{new Date(actor.updatedAt).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('taxonomies')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('mainTaxonomy')}</p>
                  {actor.mainTaxonomy ? (
                    <Badge variant="outline">{actor.mainTaxonomy.name}</Badge>
                  ) : (
                    <p>-</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('taxonomies')}</p>
                  {actor.taxonomies && actor.taxonomies.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {actor.taxonomies.map((tax) => (
                        <Badge key={tax.id} variant="outline">{tax.name}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p>-</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="financials">
          <ActorFinancialsTab actorId={actor.id} onSetCurrency={() => setEditOpen(true)} />
        </TabsContent>
        <TabsContent value="sub-actors">
          <SubActorsTable actorId={actor.id} />
        </TabsContent>
        <TabsContent value="values">
          <ActorValuesTable actorId={actor.id} />
        </TabsContent>
        <TabsContent value="offerings">
          <OfferingsDataTable actorId={actor.id} />
        </TabsContent>
        <TabsContent value="exchanges">
          <ExchangesDataTable partyActorId={actor.id} />
        </TabsContent>
        <TabsContent value="agreements">
          <AgreementsDataTable partyId={actor.id} />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersDataTable actorId={actor.id} />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoicesDataTable actorId={actor.id} />
        </TabsContent>
        <TabsContent value="agreement-templates">
          <AgreementTemplatesDataTable actorId={actor.id} />
        </TabsContent>
        <TabsContent value="addresses">
          <AddressesList
            actorId={actor.id}
            addresses={actor.addresses ?? []}
            onChanged={fetchActor}
          />
        </TabsContent>
      </Tabs>

      <ActorFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        actor={actor}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t('deleteActor')}
        description={tc('confirmDeleteDescription', { name: actor.name })}
        isDeleting={isSubmitting}
      />

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('moveTitle', { name: actor.name })}</DialogTitle>
            <DialogDescription>{t('moveDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t('parent')}</Label>
            <Select value={moveParentId} onValueChange={setMoveParentId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">{t('makeRoot')}</SelectItem>
                {moveCandidates.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)} disabled={isSubmitting}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleMove} disabled={isSubmitting}>
              {t('move')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
