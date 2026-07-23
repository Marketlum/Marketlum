'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import {
  api,
  ApiError,
  Button,
  ConfirmDeleteDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  usePermissions,
} from '@marketlum/ui';
import type { ApiFieldError, PluginRouteComponentProps } from '@marketlum/ui';
import {
  VAM_TRACKS,
  type RdhyVamAgreementDocument,
  type VamCanvasInput,
} from '../shared/vam-schemas';
import { VamStatusBadge } from './vam-status-badge';
import { VamCanvasEditor } from './vam-canvas-editor';
import { VamPerformanceSection } from './vam-performance-section';

function formatAmount(amount: string, currencyCode: string | null): string {
  const value = Number(amount);
  const formatted = Number.isFinite(value) ? value.toLocaleString('en-US') : amount;
  return currencyCode ? `${formatted} ${currencyCode.toUpperCase()}` : formatted;
}

function sumAmounts(entries: Array<{ amount: string }>): string {
  return String(entries.reduce((acc, e) => acc + Number(e.amount), 0));
}

/** Page rendered at /admin/x/vam-agreements/:id — canvas read view + DRAFT editor. */
export function VamAgreementDetailPage({ params }: PluginRouteComponentProps) {
  const id = params?.id;
  const t = useTranslations('plugin.rdhy.vam.detail');
  const te = useTranslations('plugin.rdhy.vam.editor');
  const tt = useTranslations('plugin.rdhy.vam.tracks');
  const tc = useTranslations('plugin.rdhy.vam.categories');
  const tk = useTranslations('plugin.rdhy.vam.kinds');
  const tl = useTranslations('plugin.rdhy.vam.list');
  const router = useRouter();
  const { can } = usePermissions();
  const canWrite = can('rdhy.vam-agreements', 'write');

  const [document, setDocument] = useState<RdhyVamAgreementDocument | null>(null);
  const [editing, setEditing] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const discardNavigatesAway = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<ApiFieldError[] | null>(null);
  const [activateOpen, setActivateOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [citedRuleId, setCitedRuleId] = useState('');
  const [terminateNote, setTerminateNote] = useState('');

  const load = useCallback(() => {
    if (!id) return Promise.resolve();
    return api
      .get<RdhyVamAgreementDocument>(`/plugins/rdhy/vam-agreements/${id}`)
      .then(setDocument)
      .catch(() => setError(t('failed')));
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Warn before reload/close while the editor holds unsaved changes.
  useEffect(() => {
    if (!(editing && editorDirty)) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [editing, editorDirty]);

  const exitEditor = () => {
    setEditing(false);
    setEditorDirty(false);
    setServerErrors(null);
    setError(null);
  };

  const requestCancelEditing = () => {
    if (editorDirty) {
      discardNavigatesAway.current = false;
      setDiscardOpen(true);
    } else {
      exitEditor();
    }
  };

  const confirmDiscard = () => {
    setDiscardOpen(false);
    exitEditor();
    if (discardNavigatesAway.current) {
      discardNavigatesAway.current = false;
      router.push('/admin/x/vam-agreements');
    }
  };

  const currencyCode = document?.currency?.code ?? null;

  const citedRule = useMemo(() => {
    if (!document?.citedTerminationConditionId) return null;
    return (
      document.canvas.terminationConditions.find(
        (r) => r.id === document.citedTerminationConditionId,
      ) ?? null
    );
  }, [document]);

  const transition = async (action: 'activate' | 'complete') => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/plugins/rdhy/vam-agreements/${id}/${action}`);
      setActivateOpen(false);
      setCompleteOpen(false);
      await load();
    } catch {
      setError(t('failed'));
    } finally {
      setBusy(false);
    }
  };

  const terminate = async () => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/plugins/rdhy/vam-agreements/${id}/terminate`, {
        citedTerminationConditionId: citedRuleId || null,
        note: terminateNote.trim() || null,
      });
      setTerminateOpen(false);
      await load();
    } catch {
      setError(t('failed'));
    } finally {
      setBusy(false);
    }
  };

  const removeAgreement = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await api.delete(`/plugins/rdhy/vam-agreements/${id}`);
      router.push('/admin/x/vam-agreements');
    } catch {
      setBusy(false);
      setDeleteOpen(false);
      setError(t('failed'));
    }
  };

  const saveCanvas = async (canvas: VamCanvasInput) => {
    if (!id) return;
    setBusy(true);
    setError(null);
    setServerErrors(null);
    try {
      const updated = await api.put<RdhyVamAgreementDocument>(
        `/plugins/rdhy/vam-agreements/${id}/canvas`,
        canvas,
      );
      setDocument(updated);
      exitEditor();
    } catch (e) {
      if (e instanceof ApiError && e.errors.length > 0) {
        setServerErrors(e.errors);
      } else {
        setError(t('failed'));
      }
    } finally {
      setBusy(false);
    }
  };

  if (!document) {
    return <p className="text-sm text-muted-foreground">{error ?? 'Loading…'}</p>;
  }

  const { canvas } = document;
  const hasCanvas =
    canvas.milestones.length > 0 ||
    canvas.costEntries.length > 0 ||
    canvas.investmentEntries.length > 0 ||
    canvas.terminationConditions.length > 0;

  return (
    <div>
      <Link
        href="/admin/x/vam-agreements"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        onClick={(event) => {
          if (editing && editorDirty) {
            event.preventDefault();
            discardNavigatesAway.current = true;
            setDiscardOpen(true);
          }
        }}
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back')}
      </Link>

      <div className="mb-1 flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-3 text-2xl md:text-3xl font-bold">
          {document.title}
          <VamStatusBadge status={document.status} />
        </h1>
        {!editing && canWrite && (
          <div className="flex gap-2">
            {document.status === 'DRAFT' && (
              <>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  {t('editCanvas')}
                </Button>
                <Button onClick={() => setActivateOpen(true)}>{t('activate')}</Button>
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  {t('delete')}
                </Button>
              </>
            )}
            {document.status === 'ACTIVE' && (
              <>
                <Button onClick={() => setCompleteOpen(true)}>{t('complete')}</Button>
                <Button variant="destructive" onClick={() => setTerminateOpen(true)}>
                  {t('terminate')}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      <p className="mb-4 md:mb-6 text-sm text-muted-foreground">
        <Link
          href={`/admin/agents/${document.agent.id}`}
          className="underline-offset-2 hover:text-foreground hover:underline"
        >
          {document.agent.name}
        </Link>{' '}
        · {t('sponsoredBy')} {document.platform.name} ·{' '}
        {tl('months', { count: document.horizonMonths })}
        {currencyCode ? ` · ${currencyCode.toUpperCase()}` : ''}
      </p>

      {document.status === 'TERMINATED' && (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <p>{t('terminatedBanner', { rule: citedRule?.text ?? '—' })}</p>
          {document.terminationNote && (
            <p className="text-muted-foreground">
              {t('terminatedNote', { note: document.terminationNote })}
            </p>
          )}
        </div>
      )}

      {editing ? (
        <VamCanvasEditor
          document={document}
          onSave={saveCanvas}
          onCancel={requestCancelEditing}
          onDirtyChange={setEditorDirty}
          saving={busy}
          error={error}
          serverErrors={serverErrors}
        />
      ) : !hasCanvas ? (
        <div className="space-y-8">
          <p className="text-sm text-muted-foreground">{t('emptyCanvas')}</p>
          {document.status !== 'DRAFT' && <VamPerformanceSection agreementId={document.id} />}
        </div>
      ) : (
        <div className="space-y-8">
          {canvas.milestones.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-semibold">{t('gridTitle')}</h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40" />
                      {canvas.milestones.map((m) => (
                        <TableHead key={m.id}>
                          {m.label ?? tl('months', { count: m.offsetMonths })}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {VAM_TRACKS.map((track) => (
                      <TableRow key={track}>
                        <TableCell className="align-top font-medium">{tt(track)}</TableCell>
                        {canvas.milestones.map((m) => (
                          <TableCell key={m.id} className="align-top">
                            <ul className="space-y-2">
                              {m.items
                                .filter((i) => i.track === track)
                                .map((i) => (
                                  <li key={i.id} className="text-sm">
                                    {i.description}
                                    {i.amount != null && (
                                      <span className="ml-1 whitespace-nowrap font-mono text-xs text-muted-foreground">
                                        {formatAmount(i.amount, currencyCode)}
                                      </span>
                                    )}
                                  </li>
                                ))}
                            </ul>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}

          {document.status !== 'DRAFT' && <VamPerformanceSection agreementId={document.id} />}

          <div className="grid gap-8 md:grid-cols-2">
            <section>
              <h2 className="mb-2 text-lg font-semibold">{t('lifecycleTitle')}</h2>
              <p className="text-sm">
                <span className="text-muted-foreground">{t('sponsor')}:</span>{' '}
                <Link
                  href={`/admin/x/platforms/${document.platform.id}`}
                  className="underline-offset-2 hover:underline"
                >
                  {document.platform.name}
                </Link>
              </p>
              <h3 className="mb-1 mt-4 text-sm font-medium">{t('terminationTitle')}</h3>
              {canvas.terminationConditions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noTerminationRules')}</p>
              ) : (
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {canvas.terminationConditions.map((rule) => (
                    <li key={rule.id}>{rule.text}</li>
                  ))}
                </ol>
              )}
            </section>

            <div className="space-y-8">
              {canvas.costEntries.length > 0 && (
                <section>
                  <h2 className="mb-2 text-lg font-semibold">
                    {t('costsTitle')}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({t('total')}: {formatAmount(sumAmounts(canvas.costEntries), currencyCode)})
                    </span>
                  </h2>
                  <ul className="space-y-1 text-sm">
                    {canvas.costEntries.map((cost) => (
                      <li key={cost.id} className="flex justify-between gap-4">
                        <span>
                          <span className="text-muted-foreground">{tc(cost.category)}:</span>{' '}
                          {cost.label}
                          {cost.headcount != null ? ` (${cost.headcount})` : ''}
                        </span>
                        <span className="whitespace-nowrap font-mono">
                          {formatAmount(cost.amount, currencyCode)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {canvas.investmentEntries.length > 0 && (
                <section>
                  <h2 className="mb-2 text-lg font-semibold">
                    {t('investmentsTitle')}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({t('total')}:{' '}
                      {formatAmount(sumAmounts(canvas.investmentEntries), currencyCode)})
                    </span>
                  </h2>
                  <ul className="space-y-1 text-sm">
                    {canvas.investmentEntries.map((investment) => (
                      <li key={investment.id} className="flex justify-between gap-4">
                        <span>
                          <span className="text-muted-foreground">{tk(investment.kind)}</span>
                          {investment.label ? `: ${investment.label}` : ''}
                        </span>
                        <span className="whitespace-nowrap font-mono">
                          {formatAmount(investment.amount, currencyCode)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {!editing && error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('activateTitle')}</DialogTitle>
            <DialogDescription>{t('activateDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateOpen(false)} disabled={busy}>
              {t('cancel')}
            </Button>
            <Button onClick={() => transition('activate')} disabled={busy}>
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('completeTitle')}</DialogTitle>
            <DialogDescription>{t('completeDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)} disabled={busy}>
              {t('cancel')}
            </Button>
            <Button onClick={() => transition('complete')} disabled={busy}>
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={terminateOpen} onOpenChange={setTerminateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('terminateTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {canvas.terminationConditions.length > 0 && (
              <div className="space-y-1">
                <Label>{t('terminateRule')}</Label>
                <Select value={citedRuleId} onValueChange={setCitedRuleId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('terminateRulePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {canvas.terminationConditions.map((rule, index) => (
                      <SelectItem key={rule.id} value={rule.id}>
                        {index + 1}. {rule.text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="vam-terminate-note">{t('terminateNote')}</Label>
              <Textarea
                id="vam-terminate-note"
                value={terminateNote}
                onChange={(e) => setTerminateNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminateOpen(false)} disabled={busy}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={terminate}
              disabled={busy || (canvas.terminationConditions.length > 0 && !citedRuleId)}
            >
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={removeAgreement}
        title={t('deleteTitle')}
        description={t('deleteDescription')}
        isDeleting={busy}
      />

      <Dialog
        open={discardOpen}
        onOpenChange={(open) => {
          setDiscardOpen(open);
          if (!open) discardNavigatesAway.current = false;
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{te('unsavedTitle')}</DialogTitle>
            <DialogDescription>{te('unsavedDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardOpen(false)}>
              {te('keepEditing')}
            </Button>
            <Button variant="destructive" onClick={confirmDiscard}>
              {te('discard')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
