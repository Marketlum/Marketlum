'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Crown } from 'lucide-react';
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
  Textarea,
  usePermissions,
} from '@marketlum/ui';
import type { ApiFieldError, PluginRouteComponentProps } from '@marketlum/ui';
import type { EmcCanvasInput, RdhyEmcAgreementDocument } from '../shared/emc-schemas';
import { EmcStatusBadge } from './emc-status-badge';
import { EmcCanvasEditor } from './emc-canvas-editor';

function formatAmount(amount: string, currencyCode: string | null): string {
  const value = Number(amount);
  const formatted = Number.isFinite(value) ? value.toLocaleString('en-US') : amount;
  return currencyCode ? `${formatted} ${currencyCode.toUpperCase()}` : formatted;
}

function formatPercent(percent: string | null): string {
  return percent != null ? `${Number(percent)}%` : '—';
}

/** Page rendered at /admin/x/emc-agreements/:id — canvas read view + DRAFT editor. */
export function EmcAgreementDetailPage({ params }: PluginRouteComponentProps) {
  const id = params?.id;
  const t = useTranslations('plugin.rdhy.emc.detail');
  const te = useTranslations('plugin.rdhy.emc.editor');
  const router = useRouter();
  const { can } = usePermissions();
  const canWrite = can('rdhy.emc-agreements', 'write');

  const [document, setDocument] = useState<RdhyEmcAgreementDocument | null>(null);
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
      .get<RdhyEmcAgreementDocument>(`/plugins/rdhy/emc-agreements/${id}`)
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
      router.push('/admin/x/emc-agreements');
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
      await api.post(`/plugins/rdhy/emc-agreements/${id}/${action}`);
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
      await api.post(`/plugins/rdhy/emc-agreements/${id}/terminate`, {
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
      await api.delete(`/plugins/rdhy/emc-agreements/${id}`);
      router.push('/admin/x/emc-agreements');
    } catch {
      setBusy(false);
      setDeleteOpen(false);
      setError(t('failed'));
    }
  };

  const saveCanvas = async (canvas: EmcCanvasInput) => {
    if (!id) return;
    setBusy(true);
    setError(null);
    setServerErrors(null);
    try {
      const updated = await api.put<RdhyEmcAgreementDocument>(
        `/plugins/rdhy/emc-agreements/${id}/canvas`,
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
  const hasCanvas = canvas.nodes.length > 0 || canvas.terminationConditions.length > 0;
  const hasSetting =
    document.collaborativeScenario ||
    document.collaborativeGoals ||
    document.governanceModel ||
    document.reinvestmentPercent != null ||
    document.investmentNote;
  const strategicNodes = canvas.nodes.filter((n) => n.tier === 'STRATEGIC');
  const tacticalNodes = canvas.nodes.filter((n) => n.tier === 'TACTICAL');
  const shareSum = strategicNodes.reduce(
    (sum, n) => sum + (n.profitSharePercent ? Number(n.profitSharePercent) : 0),
    0,
  );

  const nodeSection = (nodes: typeof canvas.nodes, titleKey: 'strategicNodes' | 'tacticalNodes') =>
    nodes.length > 0 && (
      <section>
        <h2 className="mb-2 text-lg font-semibold">{t(titleKey)}</h2>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="w-48 min-w-[12rem] p-2 font-medium">{t('node')}</th>
                <th className="min-w-[16rem] border-l p-2 font-medium">{t('services')}</th>
                <th className="min-w-[16rem] border-l p-2 font-medium">{t('goals')}</th>
                <th className="min-w-[12rem] border-l p-2 font-medium">{t('costs')}</th>
                {titleKey === 'strategicNodes' && (
                  <th className="w-28 border-l p-2 font-medium">{t('valueSharing')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr key={node.id} className="border-b last:border-b-0 align-top">
                  <td className="p-2 font-medium">
                    <span className="inline-flex items-center gap-1">
                      {node.isLeading && (
                        <Crown className="h-3.5 w-3.5 text-amber-500" aria-label={t('leading')} />
                      )}
                      {node.agent.name}
                    </span>
                    <p className="font-mono text-xs font-normal text-muted-foreground">
                      {node.agent.type}
                    </p>
                  </td>
                  <td className="border-l p-2">
                    <ul className="list-disc space-y-1 pl-5">
                      {node.services.map((s) => (
                        <li key={s.id}>{s.text}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="border-l p-2">
                    <ul className="list-disc space-y-1 pl-5">
                      {node.goals.map((g) => (
                        <li key={g.id}>{g.text}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="border-l p-2">
                    <ul className="space-y-1">
                      {node.costEntries.map((c) => (
                        <li key={c.id} className="flex justify-between gap-2">
                          <span>
                            {c.label}
                            {c.headcount != null ? ` (${c.headcount})` : ''}
                          </span>
                          <span className="whitespace-nowrap font-mono text-xs">
                            {formatAmount(c.amount, currencyCode)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  {titleKey === 'strategicNodes' && (
                    <td className="border-l p-2 font-mono">
                      {formatPercent(node.profitSharePercent)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );

  return (
    <div>
      <Link
        href="/admin/x/emc-agreements"
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
          <EmcStatusBadge status={document.status} />
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
        {t('sponsoredBy')}{' '}
        <Link
          href={`/admin/x/platforms/${document.platform.id}`}
          className="underline-offset-2 hover:underline"
        >
          {document.platform.name}
        </Link>
        {currencyCode ? ` · ${currencyCode.toUpperCase()}` : ''}
        {canvas.nodes.length > 0
          ? ` · ${t('shareSummary', {
              sum: shareSum,
              reinvestment: document.reinvestmentPercent
                ? Number(document.reinvestmentPercent)
                : 0,
            })}`
          : ''}
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
        <EmcCanvasEditor
          document={document}
          onSave={saveCanvas}
          onCancel={requestCancelEditing}
          onDirtyChange={setEditorDirty}
          saving={busy}
          error={error}
          serverErrors={serverErrors}
        />
      ) : (
        <div className="space-y-8">
          {hasSetting && (
            <section className="grid gap-4 rounded-md border bg-muted/20 p-4 md:grid-cols-2">
              {document.collaborativeScenario && (
                <div>
                  <h3 className="mb-1 text-sm font-medium">{t('collaborativeScenario')}</h3>
                  <p className="text-sm text-muted-foreground">{document.collaborativeScenario}</p>
                </div>
              )}
              {document.collaborativeGoals && (
                <div>
                  <h3 className="mb-1 text-sm font-medium">{t('collaborativeGoals')}</h3>
                  <p className="text-sm text-muted-foreground">{document.collaborativeGoals}</p>
                </div>
              )}
              {document.governanceModel && (
                <div>
                  <h3 className="mb-1 text-sm font-medium">{t('governanceModel')}</h3>
                  <p className="text-sm text-muted-foreground">{document.governanceModel}</p>
                </div>
              )}
              {(document.reinvestmentPercent != null || document.investmentNote) && (
                <div>
                  <h3 className="mb-1 text-sm font-medium">
                    {t('collaborativeInvestment')}
                    {document.reinvestmentPercent != null && (
                      <span className="ml-1 font-mono text-xs text-muted-foreground">
                        ({formatPercent(document.reinvestmentPercent)})
                      </span>
                    )}
                  </h3>
                  {document.investmentNote && (
                    <p className="text-sm text-muted-foreground">{document.investmentNote}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {!hasCanvas ? (
            <p className="text-sm text-muted-foreground">{t('emptyCanvas')}</p>
          ) : (
            <>
              {nodeSection(strategicNodes, 'strategicNodes')}
              {nodeSection(tacticalNodes, 'tacticalNodes')}

              <section>
                <h2 className="mb-2 text-lg font-semibold">{t('terminationTitle')}</h2>
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
            </>
          )}
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
              <Label htmlFor="emc-terminate-note">{t('terminateNote')}</Label>
              <Textarea
                id="emc-terminate-note"
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
