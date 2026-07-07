'use client';

import { useState } from 'react';
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
import {
  VAM_TRACKS,
  VAM_COST_CATEGORIES,
  VAM_INVESTMENT_KINDS,
  type RdhyVamAgreementDocument,
  type VamCanvasInput,
} from '../shared/vam-schemas';

interface EditableItem {
  track: (typeof VAM_TRACKS)[number];
  description: string;
  amount: string;
}

interface EditableMilestone {
  offsetMonths: string;
  label: string;
  items: EditableItem[];
}

interface EditableCost {
  category: (typeof VAM_COST_CATEGORIES)[number];
  label: string;
  amount: string;
  headcount: string;
}

interface EditableInvestment {
  kind: (typeof VAM_INVESTMENT_KINDS)[number];
  label: string;
  amount: string;
}

interface EditableCanvas {
  milestones: EditableMilestone[];
  costEntries: EditableCost[];
  investmentEntries: EditableInvestment[];
  terminationConditions: string[];
}

function fromDocument(document: RdhyVamAgreementDocument): EditableCanvas {
  return {
    milestones: document.canvas.milestones.map((m) => ({
      offsetMonths: String(m.offsetMonths),
      label: m.label ?? '',
      items: m.items.map((i) => ({
        track: i.track,
        description: i.description,
        amount: i.amount ?? '',
      })),
    })),
    costEntries: document.canvas.costEntries.map((c) => ({
      category: c.category,
      label: c.label,
      amount: c.amount,
      headcount: c.headcount != null ? String(c.headcount) : '',
    })),
    investmentEntries: document.canvas.investmentEntries.map((v) => ({
      kind: v.kind,
      label: v.label ?? '',
      amount: v.amount,
    })),
    terminationConditions: document.canvas.terminationConditions.map((r) => r.text),
  };
}

function toPayload(canvas: EditableCanvas): VamCanvasInput {
  return {
    milestones: canvas.milestones.map((m) => ({
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
      .map((r) => r.trim())
      .filter((r) => r.length > 0),
  };
}

export function VamCanvasEditor({
  document,
  onSave,
  onCancel,
  saving,
  error,
}: {
  document: RdhyVamAgreementDocument;
  onSave: (canvas: VamCanvasInput) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const t = useTranslations('plugin.rdhy.vam.editor');
  const tt = useTranslations('plugin.rdhy.vam.tracks');
  const tc = useTranslations('plugin.rdhy.vam.categories');
  const tk = useTranslations('plugin.rdhy.vam.kinds');
  const [canvas, setCanvas] = useState<EditableCanvas>(() => fromDocument(document));

  const patch = (change: Partial<EditableCanvas>) => setCanvas((c) => ({ ...c, ...change }));

  const patchMilestone = (index: number, change: Partial<EditableMilestone>) =>
    patch({
      milestones: canvas.milestones.map((m, i) => (i === index ? { ...m, ...change } : m)),
    });

  const valid =
    canvas.milestones.every(
      (m) =>
        Number(m.offsetMonths) >= 1 &&
        m.items.every((i) => i.description.trim().length > 0),
    ) &&
    canvas.costEntries.every((c) => c.label.trim() && c.amount.trim() !== '') &&
    canvas.investmentEntries.every((v) => v.amount.trim() !== '');

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('milestones')}</h2>
        {canvas.milestones.map((milestone, mi) => (
          <div key={mi} className="space-y-3 rounded-md border p-3">
            <div className="flex items-end gap-2">
              <div className="w-28 space-y-1">
                <Label>{t('offsetMonths')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={document.horizonMonths}
                  value={milestone.offsetMonths}
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
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t('items')}</p>
              {milestone.items.map((item, ii) => (
                <div key={ii} className="flex items-center gap-2">
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
                      patchMilestone(mi, { items: milestone.items.filter((_, i) => i !== ii) })
                    }
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  patchMilestone(mi, {
                    items: [
                      ...milestone.items,
                      { track: 'DIRECT_VALUE', description: '', amount: '' },
                    ],
                  })
                }
              >
                {t('addItem')}
              </Button>
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() =>
            patch({
              milestones: [
                ...canvas.milestones,
                { offsetMonths: '', label: '', items: [] },
              ],
            })
          }
        >
          {t('addMilestone')}
        </Button>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('costs')}</h2>
        {canvas.costEntries.map((cost, ci) => (
          <div key={ci} className="flex items-center gap-2">
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
              onClick={() => patch({ costEntries: canvas.costEntries.filter((_, i) => i !== ci) })}
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            patch({
              costEntries: [
                ...canvas.costEntries,
                { category: 'SHARED_SERVICE_PLATFORMS', label: '', amount: '', headcount: '' },
              ],
            })
          }
        >
          {t('addCost')}
        </Button>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('investments')}</h2>
        {canvas.investmentEntries.map((investment, vi) => (
          <div key={vi} className="flex items-center gap-2">
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
                patch({ investmentEntries: canvas.investmentEntries.filter((_, i) => i !== vi) })
              }
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            patch({
              investmentEntries: [
                ...canvas.investmentEntries,
                { kind: 'CAPITAL_INVESTMENT', label: '', amount: '' },
              ],
            })
          }
        >
          {t('addInvestment')}
        </Button>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('terminationRules')}</h2>
        {canvas.terminationConditions.map((rule, ri) => (
          <div key={ri} className="flex items-start gap-2">
            <Textarea
              className="flex-1"
              rows={2}
              value={rule}
              onChange={(e) =>
                patch({
                  terminationConditions: canvas.terminationConditions.map((x, i) =>
                    i === ri ? e.target.value : x,
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
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => patch({ terminationConditions: [...canvas.terminationConditions, ''] })}
        >
          {t('addRule')}
        </Button>
      </section>

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
