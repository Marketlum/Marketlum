import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  agentId: z.string().uuid().optional(),
  valueStreamId: z.string().uuid().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export interface DashboardTimeSeriesPoint {
  period: string;
  revenue: string;
  expenses: string;
}

export interface DashboardSummaryResponse {
  totalRevenue: string;
  totalExpenses: string;
  invoiceCount: number;
  timeSeries: DashboardTimeSeriesPoint[];
}
