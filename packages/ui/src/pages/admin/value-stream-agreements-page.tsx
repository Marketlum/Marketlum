'use client';

import { useParams } from 'next/navigation';
import { AgreementsDataTable } from '../../components/agreements/agreements-data-table';

export function ValueStreamAgreementsPage() {
  const { id } = useParams<{ id: string }>();
  return <AgreementsDataTable valueStreamId={id} />;
}
