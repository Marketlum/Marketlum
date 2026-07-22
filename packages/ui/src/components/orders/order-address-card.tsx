'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Pencil, X } from 'lucide-react';
import type { OrderAddressInput, AddressResponse } from '@marketlum/shared';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { api } from '../../lib/api-client';

interface OrderAddress {
  countryCode: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
}

interface OrderAddressCardProps {
  title: string;
  address: OrderAddress | null;
  editable: boolean;
  /** Agent whose primary address seeds the "copy from agent" action. */
  copyFromAgentId?: string;
  onSave: (address: OrderAddressInput | null) => Promise<void>;
}

const emptyForm = { countryCode: '', line1: '', line2: '', city: '', postalCode: '' };

export function OrderAddressCard({
  title,
  address,
  editable,
  copyFromAgentId,
  onSave,
}: OrderAddressCardProps) {
  const t = useTranslations('orders');
  const tc = useTranslations('common');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setForm({
      countryCode: address?.countryCode ?? '',
      line1: address?.line1 ?? '',
      line2: address?.line2 ?? '',
      city: address?.city ?? '',
      postalCode: address?.postalCode ?? '',
    });
    setEditing(true);
  };

  const copyFromAgent = async () => {
    if (!copyFromAgentId) return;
    try {
      const addresses = await api.get<AddressResponse[]>(
        `/agents/${copyFromAgentId}/addresses`,
      );
      const source = addresses.find((a) => a.isPrimary) ?? addresses[0];
      if (!source) {
        toast.error(t('noAgentAddress'));
        return;
      }
      setForm({
        countryCode: source.country.code.slice(0, 2).toUpperCase(),
        line1: source.line1,
        line2: source.line2 ?? '',
        city: source.city,
        postalCode: source.postalCode,
      });
    } catch {
      toast.error(t('failedToLoad'));
    }
  };

  const save = async (value: OrderAddressInput | null) => {
    setSaving(true);
    try {
      await onSave(value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void save({
      countryCode: form.countryCode,
      line1: form.line1,
      line2: form.line2 || null,
      city: form.city,
      postalCode: form.postalCode,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {editable && !editing && (
          <Button variant="ghost" size="sm" onClick={startEditing}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {tc('edit')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('addressCountryCode')}</Label>
                <Input
                  value={form.countryCode}
                  maxLength={2}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, countryCode: e.target.value.toUpperCase() }))
                  }
                  placeholder="DE"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('addressPostalCode')}</Label>
                <Input
                  value={form.postalCode}
                  onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('addressLine1')}</Label>
              <Input
                value={form.line1}
                onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('addressLine2')}</Label>
              <Input
                value={form.line2}
                onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('addressCity')}</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? tc('saving') : tc('save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditing(false)}
              >
                {tc('cancel')}
              </Button>
              {copyFromAgentId && (
                <Button type="button" variant="outline" size="sm" onClick={copyFromAgent}>
                  {t('copyFromAgent')}
                </Button>
              )}
              {address && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => void save(null)}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  {t('clearAddress')}
                </Button>
              )}
            </div>
          </form>
        ) : address ? (
          <div className="text-sm space-y-0.5">
            <p>{address.line1}</p>
            {address.line2 && <p>{address.line2}</p>}
            <p>
              {address.postalCode} {address.city}
            </p>
            <p className="text-muted-foreground">{address.countryCode}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('noAddress')}</p>
        )}
      </CardContent>
    </Card>
  );
}
