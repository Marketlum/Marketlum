'use client';

import { useParams } from 'next/navigation';
import { AgreementTemplatesDataTable } from '../../components/agreement-templates/agreement-templates-data-table';

export function ValueStreamAgreementTemplatesPage() {
  const { id } = useParams<{ id: string }>();
  return <AgreementTemplatesDataTable valueStreamId={id} />;
}
