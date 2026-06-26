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
export function PluginSettingsForm({ pluginId, schema }: { pluginId: string; schema: ZodTypeAny }) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<{ value: Record<string, unknown> }>(`/plugins/${pluginId}/settings`)
      .then((r) => {
        if (active) setValues(r.value ?? {});
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pluginId]);

  const shape = getShape(schema);

  const set = (key: string, value: unknown) => setValues((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put<{ value: Record<string, unknown> }>(
        `/plugins/${pluginId}/settings`,
        values,
      );
      setValues(r.value ?? values);
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
          const text = Array.isArray(value) ? (value as string[]).join(', ') : '';
          return (
            <div key={key} className="space-y-1">
              <Label htmlFor={key}>{key}</Label>
              <Input
                id={key}
                value={text}
                onChange={(e) =>
                  set(
                    key,
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
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
