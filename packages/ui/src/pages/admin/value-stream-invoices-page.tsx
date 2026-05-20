'use client';

import { useParams } from 'next/navigation';
import { InvoicesDataTable } from '../../components/invoices/invoices-data-table';

export function ValueStreamInvoicesPage() {
  const { id } = useParams<{ id: string }>();
  return <InvoicesDataTable valueStreamId={id} />;
}
