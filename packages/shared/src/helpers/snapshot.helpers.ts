import { RecurringFlowDirection } from '../enums/recurring-flow-direction.enum';

export const IDENTITY_RATE = '1.0000000000';

export interface AgentSnapshotMapping {
  fromAgentId: string | null;
  toAgentId: string | null;
}

export function mapRecurringFlowAgents(
  direction: RecurringFlowDirection,
  counterpartyAgentId: string,
  valueStreamAgentId: string | null,
): AgentSnapshotMapping {
  return direction === RecurringFlowDirection.INBOUND
    ? { fromAgentId: counterpartyAgentId, toAgentId: valueStreamAgentId }
    : { fromAgentId: valueStreamAgentId, toAgentId: counterpartyAgentId };
}

export function isIdentityConversion(
  sourceCurrencyId: string | null | undefined,
  targetCurrencyId: string | null | undefined,
): boolean {
  return !!sourceCurrencyId && sourceCurrencyId === targetCurrencyId;
}
