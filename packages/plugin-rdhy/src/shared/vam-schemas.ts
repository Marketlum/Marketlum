import { z } from 'zod';

export const VAM_TRACKS = [
  'DIRECT_VALUE',
  'INDIRECT_VALUE',
  'VARIABLE_PAY',
  'PROFIT_SHARING',
  'EQUITY',
] as const;

export const VAM_COST_CATEGORIES = [
  'SHARED_SERVICE_PLATFORMS',
  'NODE_MICRO_ENTERPRISES',
  'EXTERNAL_NODES',
  'EMC_PARTICIPATION',
  'LEADERS_SALARY',
  'TEAM_SALARY',
] as const;

export const VAM_INVESTMENT_KINDS = [
  'CAPITAL_INVESTMENT',
  'TEAM_ALLOWANCE',
  'INTERNAL_SERVICES_ALLOWANCE',
  'EXTERNAL_SERVICES_ALLOWANCE',
] as const;

export const VAM_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'TERMINATED'] as const;

export type RdhyVamTrack = (typeof VAM_TRACKS)[number];
export type RdhyVamCostCategory = (typeof VAM_COST_CATEGORIES)[number];
export type RdhyVamInvestmentKind = (typeof VAM_INVESTMENT_KINDS)[number];
export type RdhyVamStatus = (typeof VAM_STATUSES)[number];

const amountSchema = z.number().finite().nonnegative();

export const createVamAgreementSchema = z.object({
  title: z.string().min(1).max(255),
  valueStreamId: z.string().uuid(),
  platformId: z.string().uuid(),
  horizonMonths: z.number().int().min(1).max(120),
  currencyId: z.string().uuid().nullish(),
  agreementId: z.string().uuid().nullish(),
});

/** Metadata PATCH — allowed only while the agreement is a DRAFT. */
export const updateVamAgreementSchema = createVamAgreementSchema.partial();

/** The whole canvas document, replaced transactionally (DRAFT only). Array order = display order. */
export const vamCanvasSchema = z.object({
  milestones: z.array(
    z.object({
      offsetMonths: z.number().int().min(1).max(120),
      label: z.string().max(255).nullish(),
      items: z.array(
        z.object({
          track: z.enum(VAM_TRACKS),
          description: z.string().min(1),
          amount: amountSchema.nullish(),
        }),
      ),
    }),
  ),
  costEntries: z.array(
    z.object({
      category: z.enum(VAM_COST_CATEGORIES),
      label: z.string().min(1).max(255),
      amount: amountSchema,
      headcount: z.number().int().positive().nullish(),
    }),
  ),
  investmentEntries: z.array(
    z.object({
      kind: z.enum(VAM_INVESTMENT_KINDS),
      label: z.string().max(255).nullish(),
      amount: amountSchema,
    }),
  ),
  terminationConditions: z.array(z.string().min(1)),
});

export const terminateVamAgreementSchema = z.object({
  citedTerminationConditionId: z.string().uuid().nullish(),
  note: z.string().nullish(),
});

export type CreateVamAgreementInput = z.infer<typeof createVamAgreementSchema>;
export type UpdateVamAgreementInput = z.infer<typeof updateVamAgreementSchema>;
export type VamCanvasInput = z.infer<typeof vamCanvasSchema>;
export type TerminateVamAgreementInput = z.infer<typeof terminateVamAgreementSchema>;

interface EntitySummary {
  id: string;
  code: string;
  name: string;
}

export interface RdhyVamAgreementSummary {
  id: string;
  title: string;
  status: RdhyVamStatus;
  horizonMonths: number;
  startedAt: string | null;
  endedAt: string | null;
  valueStream: EntitySummary;
  platform: EntitySummary;
  currency: EntitySummary | null;
  agreementId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RdhyVamCanvasResponse {
  milestones: Array<{
    id: string;
    offsetMonths: number;
    label: string | null;
    items: Array<{
      id: string;
      track: RdhyVamTrack;
      description: string;
      amount: string | null;
    }>;
  }>;
  costEntries: Array<{
    id: string;
    category: RdhyVamCostCategory;
    label: string;
    amount: string;
    headcount: number | null;
  }>;
  investmentEntries: Array<{
    id: string;
    kind: RdhyVamInvestmentKind;
    label: string | null;
    amount: string;
  }>;
  terminationConditions: Array<{ id: string; position: number; text: string }>;
}

export interface RdhyVamAgreementDocument extends RdhyVamAgreementSummary {
  canvas: RdhyVamCanvasResponse;
  citedTerminationConditionId: string | null;
  terminationNote: string | null;
}
