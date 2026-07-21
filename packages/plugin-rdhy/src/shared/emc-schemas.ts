import { z } from 'zod';

export const EMC_NODE_TIERS = ['STRATEGIC', 'TACTICAL'] as const;

export const EMC_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'TERMINATED'] as const;

export type RdhyEmcNodeTier = (typeof EMC_NODE_TIERS)[number];
export type RdhyEmcStatus = (typeof EMC_STATUSES)[number];

const amountSchema = z.number().finite().nonnegative();
const percentSchema = z.number().finite().min(0).max(100);

export const createEmcAgreementSchema = z.object({
  title: z.string().min(1).max(255),
  platformId: z.string().uuid(),
  collaborativeScenario: z.string().nullish(),
  collaborativeGoals: z.string().nullish(),
  governanceModel: z.string().nullish(),
  /** Share of profits reinvested into the EMC ("collaborative investment"). */
  reinvestmentPercent: percentSchema.nullish(),
  investmentNote: z.string().nullish(),
  currencyId: z.string().uuid().nullish(),
  agreementId: z.string().uuid().nullish(),
});

/** EMC-setting PATCH — allowed only while the agreement is a DRAFT. */
export const updateEmcAgreementSchema = createEmcAgreementSchema.partial();

/** The whole canvas document, replaced transactionally (DRAFT only). Array order = display order. */
export const emcCanvasSchema = z.object({
  nodes: z.array(
    z.object({
      valueStreamId: z.string().uuid(),
      tier: z.enum(EMC_NODE_TIERS),
      isLeading: z.boolean(),
      /** Strategic nodes only: the node's access to the added value. */
      profitSharePercent: percentSchema.nullish(),
      services: z.array(z.string().min(1)),
      goals: z.array(z.string().min(1)),
      costEntries: z.array(
        z.object({
          label: z.string().min(1).max(255),
          amount: amountSchema,
          headcount: z.number().int().positive().nullish(),
        }),
      ),
    }),
  ),
  terminationConditions: z.array(z.string().min(1)),
});

export const terminateEmcAgreementSchema = z.object({
  citedTerminationConditionId: z.string().uuid().nullish(),
  note: z.string().nullish(),
});

export type CreateEmcAgreementInput = z.infer<typeof createEmcAgreementSchema>;
export type UpdateEmcAgreementInput = z.infer<typeof updateEmcAgreementSchema>;
export type EmcCanvasInput = z.infer<typeof emcCanvasSchema>;
export type TerminateEmcAgreementInput = z.infer<typeof terminateEmcAgreementSchema>;

interface EntitySummary {
  id: string;
  code: string;
  name: string;
}

export interface RdhyEmcAgreementSummary {
  id: string;
  title: string;
  status: RdhyEmcStatus;
  collaborativeScenario: string | null;
  collaborativeGoals: string | null;
  governanceModel: string | null;
  reinvestmentPercent: string | null;
  investmentNote: string | null;
  startedAt: string | null;
  endedAt: string | null;
  platform: EntitySummary;
  currency: EntitySummary | null;
  agreementId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RdhyEmcCanvasResponse {
  nodes: Array<{
    id: string;
    valueStream: EntitySummary;
    tier: RdhyEmcNodeTier;
    isLeading: boolean;
    profitSharePercent: string | null;
    services: Array<{ id: string; position: number; text: string }>;
    goals: Array<{ id: string; position: number; text: string }>;
    costEntries: Array<{ id: string; label: string; amount: string; headcount: number | null }>;
  }>;
  terminationConditions: Array<{ id: string; position: number; text: string }>;
}

export interface RdhyEmcAgreementDocument extends RdhyEmcAgreementSummary {
  canvas: RdhyEmcCanvasResponse;
  citedTerminationConditionId: string | null;
  terminationNote: string | null;
}
