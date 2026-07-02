'use client';

import { useEffect, useState } from 'react';
import type { ZodTypeAny } from 'zod';
import { toast } from 'sonner';
import { api } from '../lib/api-client';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

type FieldKind = 'boolean' | 'number' | 'string' | 'stringArray' | 'json';

/** Best-effort introspection of a Zod field to pick an input control. */
function fieldKind(def: ZodTypeAny): FieldKind {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = def as any;
  const typeName: string | undefined = d?._def?.typeName;
  if (typeName === 'ZodOptional' || typeName === 'ZodDefault' || typeName === 'ZodNullable') {
    return fieldKind(d._def.innerType);
  }
  if (typeName === 'ZodBoolean') return 'boolean';
  if (typeName === 'ZodNumber') return 'number';
  if (typeName === 'ZodString') return 'string';
  if (typeName === 'ZodArray') {
    const el = d._def?.type?._def?.typeName;
    if (el === 'ZodString') return 'stringArray';
  }
  return 'json';
}

function getShape(schema: ZodTypeAny): Record<string, ZodTypeAny> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = schema as any;
  if (typeof s?.shape === 'object') return s.shape;
  if (typeof s?._def?.shape === 'function') return s._def.shape();
  return {};
}

/**
 * Schema-driven settings form, the default UI for a plugin that ships a settings
 * schema but no custom SettingsComponent. Handles boolean/number/string/string[]
 * fields; anything else falls back to a JSON textarea.
 */
function parseList(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Raw display text for every string-array field, from a values object. */
function buildArrayText(
  values: Record<string, unknown>,
  schema: ZodTypeAny,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, def] of Object.entries(getShape(schema))) {
    if (fieldKind(def) === 'stringArray') {
      const v = values[key];
      out[key] = Array.isArray(v) ? (v as string[]).join(', ') : '';
    }
  }
  return out;
}

export function PluginSettingsForm({ pluginId, schema }: { pluginId: string; schema: ZodTypeAny }) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  // Raw text for string-array fields, kept separate from the parsed arrays so
  // in-progress input (e.g. a trailing comma) survives re-renders.
  const [arrayText, setArrayText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<{ value: Record<string, unknown> }>(`/plugins/${pluginId}/settings`)
      .then((r) => {
        if (active) {
          const v = r.value ?? {};
          setValues(v);
          setArrayText(buildArrayText(v, schema));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pluginId, schema]);

  const shape = getShape(schema);

  const set = (key: string, value: unknown) => setValues((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...values };
      for (const [key, text] of Object.entries(arrayText)) {
        payload[key] = parseList(text);
      }
      const r = await api.put<{ value: Record<string, unknown> }>(
        `/plugins/${pluginId}/settings`,
        payload,
      );
      const v = r.value ?? payload;
      setValues(v);
      setArrayText(buildArrayText(v, schema));
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      {Object.entries(shape).map(([key, def]) => {
        const kind = fieldKind(def);
        const value = values[key];
        if (kind === 'boolean') {
          return (
            <div key={key} className="flex items-center gap-2">
              <input
                id={key}
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => set(key, e.target.checked)}
              />
              <Label htmlFor={key}>{key}</Label>
            </div>
          );
        }
        if (kind === 'stringArray') {
          return (
            <div key={key} className="space-y-1">
              <Label htmlFor={key}>{key}</Label>
              <Input
                id={key}
                value={arrayText[key] ?? ''}
                onChange={(e) => setArrayText((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          );
        }
        return (
          <div key={key} className="space-y-1">
            <Label htmlFor={key}>{key}</Label>
            <Input
              id={key}
              type={kind === 'number' ? 'number' : 'text'}
              value={value === undefined || value === null ? '' : String(value)}
              onChange={(e) => set(key, kind === 'number' ? Number(e.target.value) : e.target.value)}
            />
          </div>
        );
      })}
      <Button onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  );
}
