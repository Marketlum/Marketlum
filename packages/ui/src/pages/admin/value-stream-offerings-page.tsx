'use client';

import { useParams } from 'next/navigation';
import { OfferingsDataTable } from '../../components/offerings/offerings-data-table';

export function ValueStreamOfferingsPage() {
  const { id } = useParams<{ id: string }>();
  return <OfferingsDataTable valueStreamId={id} />;
}
