'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Pencil, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MarkdownEditor } from '../shared/markdown-editor';
import { Can } from '../../permissions/can';

export type InlineFieldValue = string | number | null;

interface TensionInlineFieldProps {
  label: string;
  /** Current value; also the editor's starting value. */
  value: InlineFieldValue;
  /** What to show when not editing — falls back to the raw value. */
  display?: ReactNode;
  type: 'text' | 'markdown' | 'number' | 'select';
  options?: Array<{ value: string; label: string }>;
  /** Allows clearing a select (used by the lead field). */
  nullable?: boolean;
  min?: number;
  max?: number;
  onSave: (value: InlineFieldValue) => Promise<void>;
}

const NONE = '__none__';

/**
 * One field, editable in place (spec 027 Q20). Each save dispatches exactly one
 * command, so the edit dialog's multi-field PATCH has no equivalent here — a
 * field either saved or it did not.
 */
export function TensionInlineField({
  label,
  value,
  display,
  type,
  options = [],
  nullable = false,
  min,
  max,
  onSave,
}: TensionInlineFieldProps) {
  const tc = useTranslations('common');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<InlineFieldValue>(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="group">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">{display ?? <p>{value ?? '-'}</p>}</div>
          <Can resource="tensions" action="write">
            <Button
              variant="ghost"
              size="sm"
              aria-label={`${tc('edit')} ${label}`}
              className="h-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Can>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">{label}</Label>

      {type === 'text' && (
        <Input
          autoFocus
          value={String(draft ?? '')}
          onChange={(e) => setDraft(e.target.value)}
          disabled={saving}
        />
      )}

      {type === 'number' && (
        <Input
          autoFocus
          type="number"
          min={min}
          max={max}
          value={String(draft ?? '')}
          onChange={(e) => setDraft(Number(e.target.value))}
          disabled={saving}
        />
      )}

      {type === 'markdown' && (
        <MarkdownEditor
          value={String(draft ?? '')}
          onChange={(next: string) => setDraft(next)}
        />
      )}

      {type === 'select' && (
        <Select
          value={draft === null || draft === undefined ? NONE : String(draft)}
          onValueChange={(next) => setDraft(next === NONE ? null : next)}
          disabled={saving}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {nullable && <SelectItem value={NONE}>{tc('none')}</SelectItem>}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={commit} disabled={saving}>
          <Check className="mr-1.5 h-3.5 w-3.5" />
          {tc('save')}
        </Button>
        <Button size="sm" variant="outline" onClick={cancel} disabled={saving}>
          <X className="mr-1.5 h-3.5 w-3.5" />
          {tc('cancel')}
        </Button>
      </div>
    </div>
  );
}
