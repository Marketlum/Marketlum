'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  api,
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
  EMC_NODE_TIERS,
  type EmcCanvasInput,
  type RdhyEmcAgreementDocument,
  type RdhyEmcCanvasResponse,
} from '../shared/emc-schemas';
import { SortableRow, SortableRows, moveEntry } from './sortable-rows';

let uidCounter = 0;
const uid = () => `emc-row-${++uidCounter}`;

interface EditableText {
  uid: string;
  text: string;
}

interface EditableCost {
  uid: string;
  label: string;
  amount: string;
  headcount: string;
}

interface EditableNode {
  uid: string;
  valueStreamId: string;
  valueStreamLabel: string;
  tier: (typeof EMC_NODE_TIERS)[number];
  isLeading: boolean;
  profitSharePercent: string;
  services: EditableText[];
  goals: EditableText[];
  costEntries: EditableCost[];
}

interface EditableCanvas {
  nodes: EditableNode[];
  terminationConditions: EditableText[];
}

interface ValueStreamTreeNode {
  id: string;
  code: string;
  name: string;
  children?: ValueStreamTreeNode[];
}

interface ValueStreamOption {
  id: string;
  code: string;
  label: string;
}

function flattenTree(nodes: ValueStreamTreeNode[], path: string[] = []): ValueStreamOption[] {
  return nodes.flatMap((node) => {
    const label = [...path, node.name].join(' / ');
    return [
      { id: node.id, code: node.code, label },
      ...flattenTree(node.children ?? [], [...path, node.name]),
    ];
  });
}

function canvasToEditable(canvas: RdhyEmcCanvasResponse): EditableCanvas {
  return {
    nodes: canvas.nodes.map((n) => ({
      uid: uid(),
      valueStreamId: n.valueStream.id,
      valueStreamLabel: n.valueStream.name,
      tier: n.tier,
      isLeading: n.isLeading,
      profitSharePercent: n.profitSharePercent != null ? String(Number(n.profitSharePercent)) : '',
      services: n.services.map((s) => ({ uid: uid(), text: s.text })),
      goals: n.goals.map((g) => ({ uid: uid(), text: g.text })),
      costEntries: n.costEntries.map((c) => ({
        uid: uid(),
        label: c.label,
        amount: c.amount,
        headcount: c.headcount != null ? String(c.headcount) : '',
      })),
    })),
    terminationConditions: canvas.terminationConditions.map((r) => ({ uid: uid(), text: r.text })),
  };
}

function toPayload(canvas: EditableCanvas): EmcCanvasInput {
  return {
    nodes: canvas.nodes.map((n) => ({
      valueStreamId: n.valueStreamId,
      tier: n.tier,
      isLeading: n.isLeading,
      profitSharePercent:
        n.tier === 'STRATEGIC' && n.profitSharePercent.trim() !== ''
          ? Number(n.profitSharePercent)
          : null,
      services: n.services.map((s) => s.text.trim()).filter((text) => text.length > 0),
      goals: n.goals.map((g) => g.text.trim()).filter((text) => text.length > 0),
      costEntries: n.costEntries.map((c) => ({
        label: c.label,
        amount: Number(c.amount),
        headcount: c.headcount.trim() === '' ? null : Number(c.headcount),
      })),
    })),
    terminationConditions: canvas.terminationConditions
      .map((r) => r.text.trim())
      .filter((text) => text.length > 0),
  };
}

function shareOf(node: EditableNode): number {
  if (node.tier !== 'STRATEGIC') return 0;
  const value = Number(node.profitSharePercent);
  return Number.isFinite(value) ? value : 0;
}

/** Inline list of one-line text entries (services / goals) inside a node card. */
function TextEntryList({
  entries,
  placeholder,
  addLabel,
  removeLabel,
  onChange,
}: {
  entries: EditableText[];
  placeholder: string;
  addLabel: string;
  removeLabel: string;
  onChange: (entries: EditableText[]) => void;
}) {
  const [focusUid, setFocusUid] = useState<string | null>(null);

  const add = () => {
    const newUid = uid();
    setFocusUid(newUid);
    onChange([...entries, { uid: newUid, text: '' }]);
  };

  return (
    <div className="space-y-1">
      {entries.map((entry, index) => (
        <div key={entry.uid} className="flex items-center gap-1">
          <Input
            placeholder={placeholder}
            autoFocus={entry.uid === focusUid}
            value={entry.text}
            onChange={(e) =>
              onChange(entries.map((x, i) => (i === index ? { ...x, text: e.target.value } : x)))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            aria-label={removeLabel}
            onClick={() => onChange(entries.filter((_, i) => i !== index))}
          >
            ×
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={add}>
        {addLabel}
      </Button>
    </div>
  );
}

export function EmcCanvasEditor({
  document,
  onSave,
  onCancel,
  onDirtyChange,
  saving,
  error,
  serverErrors,
}: {
  document: RdhyEmcAgreementDocument;
  onSave: (canvas: EmcCanvasInput) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  saving: boolean;
  error: string | null;
  serverErrors?: ApiFieldError[] | null;
}) {
  const t = useTranslations('plugin.rdhy.emc.editor');
  const tr = useTranslations('plugin.rdhy.emc.tiers');
  const [canvas, setCanvas] = useState<EditableCanvas>(() => canvasToEditable(document.canvas));
  const initialSnapshot = useRef<string>(JSON.stringify(canvas));
  const [valueStreams, setValueStreams] = useState<ValueStreamOption[]>([]);
  const [valueStreamQuery, setValueStreamQuery] = useState('');

  const dirty = JSON.stringify(canvas) !== initialSnapshot.current;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    api
      .get<ValueStreamTreeNode[]>('/value-streams/tree')
      .then((tree) => setValueStreams(flattenTree(tree)))
      .catch(() => undefined);
  }, []);

  const currencySuffix = document.currency ? document.currency.code.toUpperCase() : null;

  const patch = (change: Partial<EditableCanvas>) => setCanvas((c) => ({ ...c, ...change }));

  const patchNode = (index: number, change: Partial<EditableNode>) =>
    patch({ nodes: canvas.nodes.map((n, i) => (i === index ? { ...n, ...change } : n)) });

  const setLeading = (index: number) =>
    patch({ nodes: canvas.nodes.map((n, i) => ({ ...n, isLeading: i === index })) });

  const addNode = (option: ValueStreamOption) => {
    setValueStreamQuery('');
    patch({
      nodes: [
        ...canvas.nodes,
        {
          uid: uid(),
          valueStreamId: option.id,
          valueStreamLabel: option.label,
          tier: 'STRATEGIC',
          isLeading: canvas.nodes.length === 0,
          profitSharePercent: '',
          services: [],
          goals: [],
          costEntries: [],
        },
      ],
    });
  };

  const valueStreamCandidates = useMemo(() => {
    const q = valueStreamQuery.trim().toLowerCase();
    if (!q) return [];
    const used = new Set(canvas.nodes.map((n) => n.valueStreamId));
    return valueStreams
      .filter((v) => !used.has(v.id))
      .filter((v) => v.label.toLowerCase().includes(q) || v.code.toLowerCase().includes(q))
      .slice(0, 8);
  }, [valueStreams, valueStreamQuery, canvas.nodes]);

  const reinvestment = document.reinvestmentPercent ? Number(document.reinvestmentPercent) : 0;
  const shareSum = canvas.nodes.reduce((sum, n) => sum + shareOf(n), 0);

  /** Mirrors the server rules so 400s are caught before saving. */
  const structuralError = useMemo(() => {
    if (canvas.nodes.length > 0) {
      const leading = canvas.nodes.filter((n) => n.isLeading);
      if (leading.length !== 1) return t('leadingRequired');
      if (leading[0].tier !== 'STRATEGIC') return t('leadingMustBeStrategic');
    }
    if (shareSum + reinvestment > 100) {
      return t('sharePoolExceeded', { sum: shareSum, reinvestment });
    }
    return null;
  }, [canvas.nodes, shareSum, reinvestment, t]);

  const fieldsValid = canvas.nodes.every(
    (n) => n.costEntries.every((c) => c.label.trim() && c.amount.trim() !== ''),
  );

  const valid = structuralError === null && fieldsValid;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t('nodes')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('shareSummary', { sum: shareSum, reinvestment, remaining: 100 - shareSum - reinvestment })}
          </p>
        </div>

        <SortableRows
          ids={canvas.nodes.map((n) => n.uid)}
          onReorder={(from, to) => patch({ nodes: moveEntry(canvas.nodes, from, to) })}
        >
          <div className="space-y-3">
            {canvas.nodes.map((node, ni) => (
              <SortableRow key={node.uid} id={node.uid} className="rounded-md border p-3">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-medium">{node.valueStreamLabel}</span>
                  <Select
                    value={node.tier}
                    onValueChange={(tier) =>
                      patchNode(ni, {
                        tier: tier as EditableNode['tier'],
                        ...(tier === 'TACTICAL' ? { profitSharePercent: '', isLeading: false } : {}),
                      })
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMC_NODE_TIERS.map((tier) => (
                        <SelectItem key={tier} value={tier}>
                          {tr(tier)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name="emc-leading-node"
                      checked={node.isLeading}
                      disabled={node.tier !== 'STRATEGIC'}
                      onChange={() => setLeading(ni)}
                    />
                    {t('leading')}
                  </label>
                  {node.tier === 'STRATEGIC' && (
                    <div className="relative">
                      <Input
                        className="w-28 pr-7"
                        type="number"
                        min={0}
                        max={100}
                        placeholder={t('share')}
                        value={node.profitSharePercent}
                        onChange={(e) => patchNode(ni, { profitSharePercent: e.target.value })}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                        %
                      </span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    aria-label={t('remove')}
                    onClick={() => patch({ nodes: canvas.nodes.filter((_, i) => i !== ni) })}
                  >
                    ×
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label className="mb-1 block text-xs uppercase text-muted-foreground">
                      {t('services')}
                    </Label>
                    <TextEntryList
                      entries={node.services}
                      placeholder={t('servicePlaceholder')}
                      addLabel={t('addService')}
                      removeLabel={t('remove')}
                      onChange={(services) => patchNode(ni, { services })}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs uppercase text-muted-foreground">
                      {t('goals')}
                    </Label>
                    <TextEntryList
                      entries={node.goals}
                      placeholder={t('goalPlaceholder')}
                      addLabel={t('addGoal')}
                      removeLabel={t('remove')}
                      onChange={(goals) => patchNode(ni, { goals })}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs uppercase text-muted-foreground">
                      {t('costs')}
                    </Label>
                    <div className="space-y-1">
                      {node.costEntries.map((cost, ci) => (
                        <div key={cost.uid} className="flex items-center gap-1">
                          <Input
                            className="flex-1"
                            placeholder={t('costLabel')}
                            value={cost.label}
                            onChange={(e) =>
                              patchNode(ni, {
                                costEntries: node.costEntries.map((x, i) =>
                                  i === ci ? { ...x, label: e.target.value } : x,
                                ),
                              })
                            }
                          />
                          <div className="relative">
                            <Input
                              className={`w-28 ${currencySuffix ? 'pr-10' : ''}`}
                              type="number"
                              min={0}
                              placeholder={t('amount')}
                              value={cost.amount}
                              onChange={(e) =>
                                patchNode(ni, {
                                  costEntries: node.costEntries.map((x, i) =>
                                    i === ci ? { ...x, amount: e.target.value } : x,
                                  ),
                                })
                              }
                            />
                            {currencySuffix && (
                              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                                {currencySuffix}
                              </span>
                            )}
                          </div>
                          <Input
                            className="w-20"
                            type="number"
                            min={1}
                            placeholder={t('headcount')}
                            value={cost.headcount}
                            onChange={(e) =>
                              patchNode(ni, {
                                costEntries: node.costEntries.map((x, i) =>
                                  i === ci ? { ...x, headcount: e.target.value } : x,
                                ),
                              })
                            }
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={t('remove')}
                            onClick={() =>
                              patchNode(ni, {
                                costEntries: node.costEntries.filter((_, i) => i !== ci),
                              })
                            }
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() =>
                          patchNode(ni, {
                            costEntries: [
                              ...node.costEntries,
                              { uid: uid(), label: '', amount: '', headcount: '' },
                            ],
                          })
                        }
                      >
                        {t('addCost')}
                      </Button>
                    </div>
                  </div>
                </div>
              </SortableRow>
            ))}
          </div>
        </SortableRows>

        <div className="max-w-md space-y-1">
          <Label htmlFor="emc-add-node">{t('addNode')}</Label>
          <Input
            id="emc-add-node"
            value={valueStreamQuery}
            onChange={(e) => setValueStreamQuery(e.target.value)}
            placeholder={t('addNodePlaceholder')}
          />
          {valueStreamCandidates.length > 0 && (
            <ul className="divide-y rounded-md border">
              {valueStreamCandidates.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    className="w-full p-2 text-left text-sm hover:bg-accent"
                    onClick={() => addNode(option)}
                  >
                    {option.label}{' '}
                    <span className="font-mono text-xs text-muted-foreground">({option.code})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
                    terminationConditions: canvas.terminationConditions.filter((_, i) => i !== ri),
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

      {structuralError && <p className="text-sm text-destructive">{structuralError}</p>}
      {!fieldsValid && <p className="text-sm text-destructive">{t('fixErrors')}</p>}
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
