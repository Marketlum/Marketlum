'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, MapPin } from 'lucide-react';
import type { CreateAddressInput, AddressResponse } from '@marketlum/shared';
import { Button } from '../ui/button';
import { AddressCard } from './address-card';
import { AddressFormSheet } from './address-form-sheet';
import { ConfirmDeleteDialog } from '../shared/confirm-delete-dialog';
import { api } from '../../lib/api-client';

interface AddressesListProps {
  agentId: string;
  addresses: AddressResponse[];
  onChanged: () => void;
}

export function AddressesList({ agentId, addresses, onChanged }: AddressesListProps) {
  const t = useTranslations('agents');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AddressResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AddressResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (address: AddressResponse) => {
    setEditing(address);
    setFormOpen(true);
  };

  const handleSubmit = async (input: CreateAddressInput) => {
    setSubmitting(true);
    try {
      if (editing) {
        await api.patch(`/agents/${agentId}/addresses/${editing.id}`, input);
        toast.success(t('addressUpdated'));
      } else {
        await api.post(`/agents/${agentId}/addresses`, input);
        toast.success(t('addressCreated'));
      }
      setFormOpen(false);
      setEditing(null);
      onChanged();
    } catch {
      toast.error(editing ? t('failedToUpdateAddress') : t('failedToCreateAddress'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMakePrimary = async (address: AddressResponse) => {
    try {
      await api.patch(`/agents/${agentId}/addresses/${address.id}`, { isPrimary: true });
      toast.success(t('addressUpdated'));
      onChanged();
    } catch {
      toast.error(t('failedToUpdateAddress'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await api.delete(`/agents/${agentId}/addresses/${deleteTarget.id}`);
      toast.success(t('addressDeleted'));
      setDeleteTarget(null);
      onChanged();
    } catch {
      toast.error(t('failedToDeleteAddress'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={handleAdd}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t('addAddress')}
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
          <MapPin className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p>{t('noAddresses')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {addresses.map((a) => (
            <AddressCard
              key={a.id}
              address={a}
              onEdit={() => handleEdit(a)}
              onDelete={() => setDeleteTarget(a)}
              onMakePrimary={() => handleMakePrimary(a)}
            />
          ))}
        </div>
      )}

      <AddressFormSheet
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) {
            setFormOpen(false);
            setEditing(null);
          }
        }}
        onSubmit={handleSubmit}
        address={editing}
        isSubmitting={submitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        title={t('deleteAddress')}
        description={deleteTarget?.label ?? deleteTarget?.line1 ?? ''}
        isDeleting={submitting}
      />
    </div>
  );
}
