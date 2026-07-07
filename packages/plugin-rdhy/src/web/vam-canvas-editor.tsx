'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  api,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@marketlum/ui';
import type { ApiFieldError } from '@marketlum/ui';
import {
  VAM_TRACKS,
  VAM_COST_CATEGORIES,
  VAM_INVESTMENT_KINDS,
  type RdhyVamAgreementDocument,
  type RdhyVamAgreementSummary,
  type RdhyVamCanvasResponse,
  type VamCanvasInput,
} from '../shared/vam-schemas';
import { SortableRow, SortableRows, moveEntry } from './sortable-rows';

let uidCounter = 0;
const uid = () => `row-${++uidCounter}`;

interface EditableItem {
  uid: string;
  track: (typeof VAM_TRACKS)[number];
  description: string;
  amount: string;
}

interface EditableMilestone {
  uid: string;
  offsetMonths: string;
  label: string;
  items: EditableItem[];
}

interface EditableCost {
  uid: string;
  category: (typeof VAM_COST_CATEGORIES)[number];
  label: string;
  amount: string;
  headcount: string;
}

interface EditableInvestment {
  uid: string;
  kind: (typeof VAM_INVESTMENT_KINDS)[number];
  label: string;
  amount: string;
}

interface EditableRule {
  uid: string;
  text: string;
}

interface EditableCanvas {
  milestones: EditableMilestone[];
  costEntries: EditableCost[];
  investmentEntries: EditableInvestment[];
  terminationConditions: EditableRule[];
}

function canvasToEditable(canvas: RdhyVamCanvasResponse): EditableCanvas {
  return {
    milestones: canvas.milestones.map((m) => ({
      uid: uid(),
      offsetMonths: String(m.offsetMonths),
      label: m.label ?? '',
      items: m.items.map((i) => ({
        uid: uid(),
        track: i.track,
        description: i.description,
        amount: i.amount ?? '',
      })),
    })),
    costEntries: canvas.costEntries.map((c) => ({
      uid: uid(),
      category: c.category,
      label: c.label,
      amount: c.amount,
      headcount: c.headcount != null ? String(c.headcount) : '',
    })),
    investmentEntries: canvas.investmentEntries.map((v) => ({
      uid: uid(),
      kind: v.kind,
      label: v.label ?? '',
      amount: v.amount,
    })),
    terminationConditions: canvas.terminationConditions.map((r) => ({
      uid: uid(),
      text: r.text,
    })),
  };
}

/** Milestones are sorted by month on save — they are time columns, not a manual order. */
function toPayload(canvas: EditableCanvas): VamCanvasInput {
  return {
    milestones: [...canvas.milestones]
      .sort((a, b) => Number(a.offsetMonths) - Number(b.offsetMonths))
      .map((m) => ({
        offsetMonths: Number(m.offsetMonths),
        label: m.label.trim() || null,
        items: m.items.map((i) => ({
          track: i.track,
          description: i.description,
          amount: i.amount.trim() === '' ? null : Number(i.amount),
        })),
      })),
    costEntries: canvas.costEntries.map((c) => ({
      category: c.category,
      label: c.label,
      amount: Number(c.amount),
      headcount: c.headcount.trim() === '' ? null : Number(c.headcount),
    })),
    investmentEntries: canvas.investmentEntries.map((v) => ({
      kind: v.kind,
      label: v.label.trim() || null,
      amount: Number(v.amount),
    })),
    terminationConditions: canvas.terminationConditions
      .map((r) => r.text.trim())
      .filter((text) => text.length > 0),
  };
}

function sumOf(entries: Array<{ amount: string }>): number {
  return entries.reduce((acc, e) => {
    const value = Number(e.amount);
    return acc + (Number.isFinite(value) ? value : 0);
  }, 0);
}

/** Reorders an item within its track cell, preserving positions of other tracks' items. */
function moveWithinTrack(
  items: EditableItem[],
  track: EditableItem['track'],
  from: number,
  to: number,
): EditableItem[] {
  const subset = items.filter((i) => i.track === track);
  const moved = subset[from];
  const target = subset[to];
  if (!moved || !target) return items;
  const without = items.filter((i) => i.uid !== moved.uid);
  const targetIndex = without.findIndex((i) => i.uid === target.uid);
  without.splice(from < to ? targetIndex + 1 : targetIndex, 0, moved);
  return without;
}

/** Numeric input that shows a thousands-formatted value with the currency
 * suffix while unfocused, and the raw editable number while focused. */
function AmountInput({
  value,
  onChange,
  suffix,
  placeholder,
  className,
  autoFocus,
  onEnter,
}: {
  value: string;
  onChange: (raw: string) => void;
  suffix: string | null;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const numeric = Number(value);
  const formatted =
    value.trim() !== '' && Number.isFinite(numeric) ? numeric.toLocaleString('en-US') : value;

  return (
    <div className={`relative ${className ?? ''}`}>
      <Input
        type={focused ? 'number' : 'text'}
        min={0}
        inputMode="decimal"
        placeholder={placeholder}
        autoFocus={autoFocus}
        value={focused ? value : formatted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        className={suffix ? 'pr-12' : undefined}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function VamCanvasEditor({
  document,
  onSave,
  onCancel,
  onDirtyChange,
  saving,
  error,
  serverErrors,
}: {
  document: RdhyVamAgreementDocument;
  onSave: (canvas: VamCanvasInput) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  saving: boolean;
  error: string | null;
  serverErrors?: ApiFieldError[] | null;
}) {
  const t = useTranslations('plugin.rdhy.vam.editor');
  const tt = useTranslations('plugin.rdhy.vam.tracks');
  const tc = useTranslations('plugin.rdhy.vam.categories');
  const tk = useTranslations('plugin.rdhy.vam.kinds');
  const [canvas, setCanvas] = useState<EditableCanvas>(() => canvasToEditable(document.canvas));
  const initialSnapshot = useRef<string>(JSON.stringify(canvas));
  const [focusUid, setFocusUid] = useState<string | null>(null);

  const [copySources, setCopySources] = useState<RdhyVamAgreementSummary[]>([]);
  const [pendingCopyId, setPendingCopyId] = useState<string | null>(null);
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false);

  const dirty = JSON.stringify(canvas) !== initialSnapshot.current;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    api
      .get<RdhyVamAgreementSummary[]>('/plugins/rdhy/vam-agreements')
      .then((all) => setCopySources(all.filter((a) => a.id !== document.id)))
      .catch(() => undefined);
  }, [document.id]);

  const currencySuffix = document.currency ? document.currency.code.toUpperCase() : null;

  const patch = (change: Partial<EditableCanvas>) => setCanvas((c) => ({ ...c, ...change }));

  const patchMilestone = (index: number, change: Partial<EditableMilestone>) =>
    patch({
      milestones: canvas.milestones.map((m, i) => (i === index ? { ...m, ...change } : m)),
    });

  const patchItem = (mi: number, itemUid: string, change: Partial<EditableItem>) =>
    patchMilestone(mi, {
      items: canvas.milestones[mi].items.map((x) =>
        x.uid === itemUid ? { ...x, ...change } : x,
      ),
    });

  const addItem = (mi: number, track: EditableItem['track']) => {
    const newUid = uid();
    setFocusUid(newUid);
    patchMilestone(mi, {
      items: [
        ...canvas.milestones[mi].items,
        { uid: newUid, track, description: '', amount: '' },
      ],
    });
  };

  const applyCopy = async (sourceId: string) => {
    try {
      const source = await api.get<RdhyVamAgreementDocument>(
        `/plugins/rdhy/vam-agreements/${sourceId}`,
      );
      setCanvas(canvasToEditable(source.canvas));
    } catch {
      // Copy is best-effort; the source list itself came from the same API.
    }
  };

  const requestCopy = (sourceId: string) => {
    if (dirty) {
      setPendingCopyId(sourceId);
      setCopyConfirmOpen(true);
    } else {
      void applyCopy(sourceId);
    }
  };

  /** Mirrors the server rules so 400s are caught before saving. */
  const milestoneErrors = useMemo(() => {
    const errors = new Map<string, string>();
    const offsetCounts = new Map<number, number>();
    for (const m of canvas.milestones) {
      const n = Number(m.offsetMonths);
      if (m.offsetMonths.trim() !== '' && Number.isInteger(n)) {
        offsetCounts.set(n, (offsetCounts.get(n) ?? 0) + 1);
      }
    }
    for (const m of canvas.milestones) {
      const n = Number(m.offsetMonths);
      if (m.offsetMonths.trim() === '' || !Number.isInteger(n) || n < 1) {
        errors.set(m.uid, t('offsetRequired'));
      } else if (n > document.horizonMonths) {
        errors.set(m.uid, t('beyondHorizon', { horizon: document.horizonMonths }));
      } else if ((offsetCounts.get(n) ?? 0) > 1) {
        errors.set(m.uid, t('duplicateOffset'));
      }
    }
    return errors;
  }, [canvas.milestones, document.horizonMonths, t]);

  const fieldsValid =
    canvas.milestones.every((m) => m.items.every((i) => i.description.trim().length > 0)) &&
    canvas.costEntries.every((c) => c.label.trim() && c.amount.trim() !== '') &&
    canvas.investmentEntries.every((v) => v.amount.trim() !== '');

  const valid = milestoneErrors.size === 0 && fieldsValid;

  const costsTotal = sumOf(canvas.costEntries);
  const investmentsTotal = sumOf(canvas.investmentEntries);
  const formatTotal = (total: number) =>
    `${total.toLocaleString('en-US')}${currencySuffix ? ` ${currencySuffix}` : ''}`;

  return (
    <div className="space-y-8">
      {copySources.length > 0 && (
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">{t('copyFrom')}</Label>
          <Select value="" onValueChange={requestCopy}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder={t('copyPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {copySources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('milestones')}</h2>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="w-40 min-w-[10rem] p-2 text-left align-bottom font-medium" />
                {canvas.milestones.map((milestone, mi) => {
                  const offsetError = milestoneErrors.get(milestone.uid);
                  return (
                    <th
                      key={milestone.uid}
                      className="min-w-[16rem] border-l p-2 text-left align-top font-normal"
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          className={`w-20 ${offsetError ? 'border-destructive' : ''}`}
                          type="number"
                          min={1}
                          max={document.horizonMonths}
                          aria-invalid={Boolean(offsetError)}
                          placeholder={t('offsetMonths')}
                          value={milestone.offsetMonths}
                          onChange={(e) => patchMilestone(mi, { offsetMonths: e.target.value })}
                        />
                        <Input
                          className="flex-1"
                          placeholder={t('label')}
                          value={milestone.label}
                          onChange={(e) => patchMilestone(mi, { label: e.target.value })}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t('remove')}
                          onClick={() =>
                            patch({
                              milestones: canvas.milestones.filter((_, i) => i !== mi),
                            })
                          }
                        >
                          ×
                        </Button>
                      </div>
                      {offsetError && (
                        <p className="mt-1 text-xs font-normal text-destructive">{offsetError}</p>
                      )}
                    </th>
                  );
                })}
                <th className="w-32 min-w-[8rem] border-l p-2 align-top">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      patch({
                        milestones: [
                          ...canvas.milestones,
                          { uid: uid(), offsetMonths: '', label: '', items: [] },
                        ],
                      })
                    }
                  >
                    {t('addMilestone')}
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {VAM_TRACKS.map((track) => (
                <tr key={track} className="border-b last:border-b-0">
                  <td className="w-40 min-w-[10rem] p-2 align-top font-medium">{tt(track)}</td>
                  {canvas.milestones.map((milestone, mi) => {
                    const cellItems = milestone.items.filter((i) => i.track === track);
                    return (
                      <td key={milestone.uid} className="border-l p-2 align-top">
                        <SortableRows
                          ids={cellItems.map((i) => i.uid)}
                          onReorder={(from, to) =>
                            patchMilestone(mi, {
                              items: moveWithinTrack(milestone.items, track, from, to),
                            })
                          }
                        >
                          <div className="space-y-2">
                            {cellItems.map((item) => (
                              <SortableRow
                                key={item.uid}
                                id={item.uid}
                                className="flex items-start gap-1 rounded-md border p-1.5"
                              >
                                <div className="flex-1 space-y-1">
                                  <Input
                                    placeholder={t('itemDescription')}
                                    autoFocus={item.uid === focusUid}
                                    value={item.description}
                                    onChange={(e) =>
                                      patchItem(mi, item.uid, { description: e.target.value })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addItem(mi, track);
                                      }
                                    }}
                                  />
                                  <AmountInput
                                    value={item.amount}
                                    suffix={currencySuffix}
                                    placeholder={t('amount')}
                                    onChange={(raw) => patchItem(mi, item.uid, { amount: raw })}
                                    onEnter={() => addItem(mi, track)}
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={t('remove')}
                                  onClick={() =>
                                    patchMilestone(mi, {
                                      items: milestone.items.filter((x) => x.uid !== item.uid),
                                    })
                                  }
                                >
                                  ×
                                </Button>
                              </SortableRow>
                            ))}
                          </div>
                        </SortableRows>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 text-muted-foreground"
                          onClick={() => addItem(mi, track)}
                        >
                          {t('addItem')}
                        </Button>
                      </td>
                    );
                  })}
                  <td className="border-l" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          {t('costs')}{' '}
          <span className="text-sm font-normal text-muted-foreground">
            ({t('total')}: {formatTotal(costsTotal)})
          </span>
        </h2>
        <SortableRows
          ids={canvas.costEntries.map((c) => c.uid)}
          onReorder={(from, to) => patch({ costEntries: moveEntry(canvas.costEntries, from, to) })}
        >
          {canvas.costEntries.map((cost, ci) => (
            <SortableRow key={cost.uid} id={cost.uid} className="flex items-center gap-2 py-1">
              <Select
                value={cost.category}
                onValueChange={(category) =>
                  patch({
                    costEntries: canvas.costEntries.map((x, i) =>
                      i === ci ? { ...x, category: category as EditableCost['category'] } : x,
                    ),
                  })
                }
              >
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VAM_COST_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {tc(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="flex-1"
                placeholder={t('label')}
                value={cost.label}
                onChange={(e) =>
                  patch({
                    costEntries: canvas.costEntries.map((x, i) =>
                      i === ci ? { ...x, label: e.target.value } : x,
                    ),
                  })
                }
              />
              <AmountInput
                className="w-36"
                value={cost.amount}
                suffix={currencySuffix}
                placeholder={t('amount')}
                onChange={(raw) =>
                  patch({
                    costEntries: canvas.costEntries.map((x, i) =>
                      i === ci ? { ...x, amount: raw } : x,
                    ),
                  })
                }
              />
              <Input
                className="w-24"
                type="number"
                min={1}
                placeholder={t('headcount')}
                value={cost.headcount}
                onChange={(e) =>
                  patch({
                    costEntries: canvas.costEntries.map((x, i) =>
                      i === ci ? { ...x, headcount: e.target.value } : x,
                    ),
                  })
                }
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  patch({ costEntries: canvas.costEntries.filter((_, i) => i !== ci) })
                }
              >
                ×
              </Button>
            </SortableRow>
          ))}
        </SortableRows>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            patch({
              costEntries: [
                ...canvas.costEntries,
                {
                  uid: uid(),
                  category: 'SHARED_SERVICE_PLATFORMS',
                  label: '',
                  amount: '',
                  headcount: '',
                },
              ],
            })
          }
        >
          {t('addCost')}
        </Button>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          {t('investments')}{' '}
          <span className="text-sm font-normal text-muted-foreground">
            ({t('total')}: {formatTotal(investmentsTotal)})
          </span>
        </h2>
        <SortableRows
          ids={canvas.investmentEntries.map((v) => v.uid)}
          onReorder={(from, to) =>
            patch({ investmentEntries: moveEntry(canvas.investmentEntries, from, to) })
          }
        >
          {canvas.investmentEntries.map((investment, vi) => (
            <SortableRow
              key={investment.uid}
              id={investment.uid}
              className="flex items-center gap-2 py-1"
            >
              <Select
                value={investment.kind}
                onValueChange={(kind) =>
                  patch({
                    investmentEntries: canvas.investmentEntries.map((x, i) =>
                      i === vi ? { ...x, kind: kind as EditableInvestment['kind'] } : x,
                    ),
                  })
                }
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VAM_INVESTMENT_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {tk(kind)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="flex-1"
                placeholder={t('label')}
                value={investment.label}
                onChange={(e) =>
                  patch({
                    investmentEntries: canvas.investmentEntries.map((x, i) =>
                      i === vi ? { ...x, label: e.target.value } : x,
                    ),
                  })
                }
              />
              <AmountInput
                className="w-36"
                value={investment.amount}
                suffix={currencySuffix}
                placeholder={t('amount')}
                onChange={(raw) =>
                  patch({
                    investmentEntries: canvas.investmentEntries.map((x, i) =>
                      i === vi ? { ...x, amount: raw } : x,
                    ),
                  })
                }
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  patch({
                    investmentEntries: canvas.investmentEntries.filter((_, i) => i !== vi),
                  })
                }
              >
                ×
              </Button>
            </SortableRow>
          ))}
        </SortableRows>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            patch({
              investmentEntries: [
                ...canvas.investmentEntries,
                { uid: uid(), kind: 'CAPITAL_INVESTMENT', label: '', amount: '' },
              ],
            })
          }
        >
          {t('addInvestment')}
        </Button>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('terminationRules')}</h2>
        <SortableRows
          ids={canvas.terminationConditions.map((r) => r.uid)}
          onReorder={(from, to) =>
            patch({ terminationConditions: moveEntry(canvas.terminationConditions, from, to) })
          }
        >
          {canvas.terminationConditions.map((rule, ri) => (
            <SortableRow key={rule.uid} id={rule.uid} className="flex items-start gap-2 py-1">
              <Textarea
                className="flex-1"
                rows={2}
                value={rule.text}
                onChange={(e) =>
                  patch({
                    terminationConditions: canvas.terminationConditions.map((x, i) =>
                      i === ri ? { ...x, text: e.target.value } : x,
                    ),
                  })
                }
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  patch({
                    terminationConditions: canvas.terminationConditions.filter(
                      (_, i) => i !== ri,
                    ),
                  })
                }
              >
                ×
              </Button>
            </SortableRow>
          ))}
        </SortableRows>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            patch({
              terminationConditions: [...canvas.terminationConditions, { uid: uid(), text: '' }],
            })
          }
        >
          {t('addRule')}
        </Button>
      </section>

      {!valid && <p className="text-sm text-destructive">{t('fixErrors')}</p>}
      {serverErrors && serverErrors.length > 0 && (
        <div className="space-y-1 text-sm text-destructive">
          <p>{t('serverErrors')}</p>
          <ul className="list-disc pl-5">
            {serverErrors.map((fieldError, index) => (
              <li key={index}>
                <span className="font-mono text-xs">{fieldError.field}</span>: {fieldError.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={() => onSave(toPayload(canvas))} disabled={saving || !valid}>
          {t('save')}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          {t('cancel')}
        </Button>
      </div>

      <Dialog
        open={copyConfirmOpen}
        onOpenChange={(open) => {
          setCopyConfirmOpen(open);
          if (!open) setPendingCopyId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('copyOverwriteTitle')}</DialogTitle>
            <DialogDescription>{t('copyOverwriteDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyConfirmOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const sourceId = pendingCopyId;
                setCopyConfirmOpen(false);
                setPendingCopyId(null);
                if (sourceId) void applyCopy(sourceId);
              }}
            >
              {t('copyReplace')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
