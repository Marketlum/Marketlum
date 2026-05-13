'use client';

import { useParams } from 'next/navigation';
import { ValuesDataTable } from '../../components/values/values-data-table';

export function ValueStreamValuesPage() {
  const { id } = useParams<{ id: string }>();
  return <ValuesDataTable valueStreamId={id} />;
}
