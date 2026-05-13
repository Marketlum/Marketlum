'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Folder, Pencil, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import type {
  CreateValueStreamInput,
  ValueStreamResponse,
} from '@marketlum/shared';
import { api, ApiError } from '../lib/api-client';
import { FileImagePreview } from '../components/shared/file-image-preview';
import { ValueStreamFormDialog } from '../components/value-streams/value-stream-form-dialog';
import { ConfirmDeleteDialog } from '../components/shared/confirm-delete-dialog';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { cn } from '../lib/utils';

interface TabDef {
  segment: string | null;
  label: string;
}

export function ValueStreamLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const tSec = useTranslations('valueStreamSections');
  const tc = useTranslations('common');
  const tvs = useTranslations('valueStreams');

  const [valueStream, setValueStream] = useState<ValueStreamResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStream = useCallback(async () => {
    try {
      const res = await api.get<ValueStreamResponse>(`/value-streams/${params.id}`);
      setValueStream(res);
      setNotFound(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
    }
  }, [params.id]);

  useEffect(() => {
    fetchStream();
  }, [fetchStream]);

  const handleEdit = async (input: CreateValueStreamInput) => {
    if (!valueStream) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/value-streams/${valueStream.id}`, input);
      toast.success(tvs('updated'));
      setEditOpen(false);
      await fetchStream();
      router.refresh();
    } catch {
      toast.error(tvs('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!valueStream) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/value-streams/${valueStream.id}`);
      toast.success(tvs('deleted'));
      router.push('/admin/value-streams');
    } catch {
      toast.error(tvs('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute the active segment relative to /admin/value-streams/[id]
  const basePath = `/admin/value-streams/${params.id}`;
  const trailing = pathname === basePath
    ? ''
    : pathname.startsWith(basePath + '/')
      ? pathname.slice(basePath.length + 1).split('/')[0]
      : '';
  const activeSegment = trailing === '' ? null : trailing;

  const tabs: TabDef[] = [
    { segment: null, label: tSec('tabOverview') },
    { segment: 'values', label: tSec('tabValues') },
    { segment: 'offerings', label: tSec('tabOfferings') },
    { segment: 'agreement-templates', label: tSec('tabAgreementTemplates') },
    { segment: 'agreements', label: tSec('tabAgreements') },
    { segment: 'exchanges', label: tSec('tabExchanges') },
    { segment: 'recurring-flows', label: tSec('tabRecurringFlows') },
    { segment: 'budget', label: tSec('tabBudget') },
  ];

  const hrefFor = (segment: string | null) =>
    segment ? `${basePath}/${segment}` : basePath;

  const activeLabel =
    tabs.find((t) => t.segment === activeSegment)?.label ?? tabs[0].label;

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h2 className="text-xl font-semibold">{tvs('notFound')}</h2>
        <p className="text-muted-foreground">{tvs('notFoundDescription')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {valueStream && (
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-16 w-16 shrink-0 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
              {valueStream.image ? (
                <FileImagePreview
                  fileId={valueStream.image.id}
                  mimeType={valueStream.image.mimeType}
                  alt={valueStream.name}
                  iconClassName="h-8 w-8 text-muted-foreground/50"
                  imgClassName="h-full w-full object-cover"
                />
              ) : (
                <Folder className="h-8 w-8 text-muted-foreground/50" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold truncate">{valueStream.name}</h1>
              {valueStream.purpose && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  {valueStream.purpose}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {valueStream.lead && (
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground mr-2">
                <User className="h-4 w-4" />
                <span>{valueStream.lead.name}</span>
              </div>
            )}
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
      )}

      {/* Tabs: desktop (md+) */}
      <nav
        role="tablist"
        className="hidden md:inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground"
      >
        {tabs.map((tab) => {
          const isActive = tab.segment === activeSegment;
          return (
            <Link
              key={tab.segment ?? 'overview'}
              href={hrefFor(tab.segment)}
              role="tab"
              aria-selected={isActive}
              className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
                isActive && 'bg-background text-foreground shadow-sm',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Tabs: mobile (<md) */}
      <div className="md:hidden">
        <Select
          value={activeSegment ?? '__overview__'}
          onValueChange={(v) => {
            const seg = v === '__overview__' ? null : v;
            router.push(hrefFor(seg));
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              <span className="text-muted-foreground mr-1">{tSec('sectionLabel')}:</span>
              {activeLabel}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab.segment ?? 'overview'} value={tab.segment ?? '__overview__'}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>{children}</div>

      {valueStream && (
        <>
          <ValueStreamFormDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            onSubmit={handleEdit}
            valueStream={valueStream}
            isSubmitting={isSubmitting}
          />
          <ConfirmDeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={handleDelete}
            title={tvs('deleteValueStream')}
            description={tvs('deleteWithChildren', { name: valueStream.name })}
            isDeleting={isSubmitting}
          />
        </>
      )}
    </div>
  );
}
