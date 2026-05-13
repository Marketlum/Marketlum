'use client';

import { useParams } from 'next/navigation';
import { ExchangesDataTable } from '../../components/exchanges/exchanges-data-table';

export function ValueStreamExchangesPage() {
  const { id } = useParams<{ id: string }>();
  return <ExchangesDataTable valueStreamId={id} />;
}
