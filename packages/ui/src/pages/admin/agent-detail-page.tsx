'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Bot, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import type { AgentResponse, CreateAgentInput } from '@marketlum/shared';
import { api, ApiError } from '../../lib/api-client';
import { toast } from 'sonner';
import { FileImagePreview } from '../../components/shared/file-image-preview';
import { AgentFormDialog } from '../../components/agents/agent-form-dialog';
import { AgentTypeBadge } from '../../components/agents/agent-type-badge';
import { AgentValuesTable } from '../../components/agents/agent-values-table';
import { AddressesList } from '../../components/agents/addresses-list';
import { ConfirmDeleteDialog } from '../../components/shared/confirm-delete-dialog';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
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

export function AgentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('agents');
  const tc = useTranslations('common');

  const [agent, setAgent] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAgent = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<AgentResponse>(`/agents/${params.id}`);
      setAgent(result);
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
    fetchAgent();
  }, [fetchAgent]);

  const handleEdit = async (input: CreateAgentInput) => {
    if (!agent) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/agents/${agent.id}`, input);
      toast.success(t('updated'));
      setEditOpen(false);
      fetchAgent();
    } catch {
      toast.error(t('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!agent) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/agents/${agent.id}`);
      toast.success(t('deleted'));
      router.push('/admin/agents');
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        {tc('loading')}
      </div>
    );
  }

  if (notFound || !agent) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h2 className="text-xl font-semibold">{t('notFound')}</h2>
        <p className="text-muted-foreground">{t('notFoundDescription')}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/agents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToAgents')}
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
              <Link href="/admin/agents">{t('title')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{agent.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6 flex items-start gap-4">
        <div className="h-24 w-24 shrink-0 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
          {agent.image ? (
            <FileImagePreview
              fileId={agent.image.id}
              mimeType={agent.image.mimeType}
              alt={agent.name}
              iconClassName="h-12 w-12 text-muted-foreground/50"
              imgClassName="h-full w-full object-cover"
            />
          ) : (
            <Bot className="h-12 w-12 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold truncate">{agent.name}</h1>
            <AgentTypeBadge type={agent.type} label={t(typeTranslationKeys[agent.type])} />
          </div>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              {tc('edit')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {tc('delete')}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{t('details')}</TabsTrigger>
          <TabsTrigger value="values">{t('valuesTab')}</TabsTrigger>
          <TabsTrigger value="addresses">
            {t('addressesTab')} ({agent.addresses?.length ?? 0})
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
                  <p>{agent.purpose || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{tc('created')}</p>
                  <p>{new Date(agent.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('updatedAt')}</p>
                  <p>{new Date(agent.updatedAt).toLocaleDateString()}</p>
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
                  {agent.mainTaxonomy ? (
                    <Badge variant="outline">{agent.mainTaxonomy.name}</Badge>
                  ) : (
                    <p>-</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('taxonomies')}</p>
                  {agent.taxonomies && agent.taxonomies.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {agent.taxonomies.map((tax) => (
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
        <TabsContent value="values">
          <AgentValuesTable agentId={agent.id} />
        </TabsContent>
        <TabsContent value="addresses">
          <AddressesList
            agentId={agent.id}
            addresses={agent.addresses ?? []}
            onChanged={fetchAgent}
          />
        </TabsContent>
      </Tabs>

      <AgentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        agent={agent}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t('deleteAgent')}
        description={tc('confirmDeleteDescription', { name: agent.name })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
