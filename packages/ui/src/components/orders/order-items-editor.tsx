'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';
import type { CreateOrderItemInput } from '@marketlum/shared';
import { orderItemTotal, orderTotal } from '@marketlum/shared';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { ValueCombobox } from '../shared/value-combobox';
import { useValues } from '../../hooks/use-values';

interface OrderItemData {
  id: string;
  value: { id: string; name: string } | null;
  valueInstance: { id: string; name: string } | null;
  quantity: string;
  unitPrice: string;
  total: string;
}

interface ItemRow {
  valueId: string;
  valueName: string;
  quantity: string;
  unitPrice: string;
}

interface OrderItemsEditorProps {
  items: OrderItemData[];
  total: string;
  editable: boolean;
  onSave: (items: CreateOrderItemInput[]) => Promise<void>;
}

function toRows(items: OrderItemData[]): ItemRow[] {
  return items.map((item) => ({
    valueId: item.value?.id ?? '',
    valueName: item.value?.name ?? '',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));
}

export function OrderItemsEditor({ items, total, editable, onSave }: OrderItemsEditorProps) {
  const t = useTranslations('orders');
  const tc = useTranslations('common');
  const { values } = useValues(editable);
  const [rows, setRows] = useState<ItemRow[]>(() => toRows(items));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows(toRows(items));
    setDirty(false);
  }, [items]);

  const updateRow = (index: number, patch: Partial<ItemRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
    setDirty(true);
  };

  const addRow = () => {
    setRows((prev) => [...prev, { valueId: '', valueName: '', quantity: '1', unitPrice: '0.00' }]);
    setDirty(true);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const validRows = rows.filter((row) => row.quantity && row.unitPrice);
  const draftTotal = orderTotal(validRows);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(
        validRows.map((row) => ({
          ...(row.valueId ? { valueId: row.valueId } : {}),
          quantity: row.quantity,
          unitPrice: row.unitPrice,
        })),
      );
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{t('items')}</CardTitle>
        {editable && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-1 h-3 w-3" />
              {t('addItem')}
            </Button>
            {dirty && (
              <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                {saving ? tc('saving') : t('saveItems')}
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noItems')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('value')}</TableHead>
                <TableHead className="w-28">{t('quantity')}</TableHead>
                <TableHead className="w-32">{t('unitPrice')}</TableHead>
                <TableHead className="w-32 text-right">{t('lineTotal')}</TableHead>
                {editable && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    {editable ? (
                      <ValueCombobox
                        values={values}
                        value={row.valueId || null}
                        onSelect={(id) =>
                          updateRow(idx, {
                            valueId: id ?? '',
                            valueName: values.find((v) => v.id === id)?.name ?? '',
                          })
                        }
                        placeholder={t('selectValue')}
                      />
                    ) : (
                      row.valueName || '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {editable ? (
                      <Input
                        value={row.quantity}
                        onChange={(e) => updateRow(idx, { quantity: e.target.value })}
                      />
                    ) : (
                      row.quantity
                    )}
                  </TableCell>
                  <TableCell>
                    {editable ? (
                      <Input
                        value={row.unitPrice}
                        onChange={(e) => updateRow(idx, { unitPrice: e.target.value })}
                      />
                    ) : (
                      row.unitPrice
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.quantity && row.unitPrice
                      ? orderItemTotal(row.quantity, row.unitPrice)
                      : '—'}
                  </TableCell>
                  {editable && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeRow(idx)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={editable ? 3 : 3} className="font-medium">
                  {t('total')}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {dirty ? draftTotal : total}
                </TableCell>
                {editable && <TableCell />}
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
