'use client';

import { useParams } from 'next/navigation';
import { RecurringFlowsSummaryCard } from '../../components/recurring-flows/recurring-flows-summary-card';
import { RecurringFlowsDataTable } from '../../components/recurring-flows/recurring-flows-data-table';
import { RecurringFlowsProjection } from '../../components/recurring-flows/recurring-flows-projection';

export function ValueStreamRecurringFlowsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-4">
      <RecurringFlowsSummaryCard valueStreamId={id} />
      <RecurringFlowsDataTable valueStreamId={id} />
      <RecurringFlowsProjection valueStreamId={id} />
    </div>
  );
}
