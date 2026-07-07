'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
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

function fromDocument(document: RdhyVamAgreementDocument): EditableCanvas {
  return {
    milestones: document.canvas.milestones.map((m) => ({
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
    costEntries: document.canvas.costEntries.map((c) => ({
      uid: uid(),
      category: c.category,
      label: c.label,
      amount: c.amount,
      headcount: c.headcount != null ? String(c.headcount) : '',
    })),
    investmentEntries: document.canvas.investmentEntries.map((v) => ({
      uid: uid(),
      kind: v.kind,
      label: v.label ?? '',
      amount: v.amount,
    })),
    terminationConditions: document.canvas.terminationConditions.map((r) => ({
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
  const [canvas, setCanvas] = useState<EditableCanvas>(() => fromDocument(document));
  const initialSnapshot = useRef<string>(JSON.stringify(canvas));

  const dirty = JSON.stringify(canvas) !== initialSnapshot.current;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const currencySuffix = document.currency ? document.currency.code.toUpperCase() : null;

  const patch = (change: Partial<EditableCanvas>) => setCanvas((c) => ({ ...c, ...change }));

  const patchMilestone = (index: number, change: Partial<EditableMilestone>) =>
    patch({
      milestones: canvas.milestones.map((m, i) => (i === index ? { ...m, ...change } : m)),
    });

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
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('milestones')}</h2>
        {canvas.milestones.map((milestone, mi) => {
          const offsetError = milestoneErrors.get(milestone.uid);
          return (
            <div key={milestone.uid} className="space-y-3 rounded-md border p-3">
              <div className="flex items-end gap-2">
                <div className="w-28 space-y-1">
                  <Label>{t('offsetMonths')}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={document.horizonMonths}
                    value={milestone.offsetMonths}
                    aria-invalid={Boolean(offsetError)}
                    className={offsetError ? 'border-destructive' : undefined}
                    onChange={(e) => patchMilestone(mi, { offsetMonths: e.target.value })}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label>{t('label')}</Label>
                  <Input
                    value={milestone.label}
                    onChange={(e) => patchMilestone(mi, { label: e.target.value })}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    patch({ milestones: canvas.milestones.filter((_, i) => i !== mi) })
                  }
                >
                  {t('remove')}
                </Button>
              </div>
              {offsetError && <p className="text-sm text-destructive">{offsetError}</p>}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t('items')}</p>
                <SortableRows
                  ids={milestone.items.map((i) => i.uid)}
                  onReorder={(from, to) =>
                    patchMilestone(mi, { items: moveEntry(milestone.items, from, to) })
                  }
                >
                  {milestone.items.map((item, ii) => (
                    <SortableRow
                      key={item.uid}
                      id={item.uid}
                      className="flex items-center gap-2 py-1"
                    >
                      <Select
                        value={item.track}
                        onValueChange={(track) =>
                          patchMilestone(mi, {
                            items: milestone.items.map((x, i) =>
                              i === ii ? { ...x, track: track as EditableItem['track'] } : x,
                            ),
                          })
                        }
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VAM_TRACKS.map((track) => (
                            <SelectItem key={track} value={track}>
                              {tt(track)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className="flex-1"
                        placeholder={t('itemDescription')}
                        value={item.description}
                        onChange={(e) =>
                          patchMilestone(mi, {
                            items: milestone.items.map((x, i) =>
                              i === ii ? { ...x, description: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <Input
                        className="w-32"
                        type="number"
                        min={0}
                        placeholder={t('amount')}
                        value={item.amount}
                        onChange={(e) =>
                          patchMilestone(mi, {
                            items: milestone.items.map((x, i) =>
                              i === ii ? { ...x, amount: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          patchMilestone(mi, {
                            items: milestone.items.filter((_, i) => i !== ii),
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
                    patchMilestone(mi, {
                      items: [
                        ...milestone.items,
                        { uid: uid(), track: 'DIRECT_VALUE', description: '', amount: '' },
                      ],
                    })
                  }
                >
                  {t('addItem')}
                </Button>
              </div>
            </div>
          );
        })}
        <Button
          variant="outline"
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
              <Input
                className="w-32"
                type="number"
                min={0}
                placeholder={t('amount')}
                value={cost.amount}
                onChange={(e) =>
                  patch({
                    costEntries: canvas.costEntries.map((x, i) =>
                      i === ci ? { ...x, amount: e.target.value } : x,
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
              <Input
                className="w-32"
                type="number"
                min={0}
                placeholder={t('amount')}
                value={investment.amount}
                onChange={(e) =>
                  patch({
                    investmentEntries: canvas.investmentEntries.map((x, i) =>
                      i === vi ? { ...x, amount: e.target.value } : x,
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
    </div>
  );
}
