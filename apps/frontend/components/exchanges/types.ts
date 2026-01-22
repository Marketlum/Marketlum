export type ExchangeState = "open" | "completed" | "closed";

export type Agent = {
  id: string;
  name: string;
  type: string;
};

export type ValueStream = {
  id: string;
  name: string;
  purpose?: string;
};

export type Channel = {
  id: string;
  name: string;
  type: string;
};

export type Taxonomy = {
  id: string;
  name: string;
  description?: string;
};

export type Agreement = {
  id: string;
  title: string;
  category: string;
  gateway: string;
  status: string;
};

export type User = {
  id: string;
  email: string;
  agent?: Agent;
};

export type Value = {
  id: string;
  name: string;
  description?: string;
  type: string;
};

export type ExchangeParty = {
  id: string;
  exchangeId: string;
  agentId: string;
  agent: Agent;
  createdAt: string;
};

export type ExchangeFlow = {
  id: string;
  exchangeId: string;
  fromPartyAgentId: string;
  fromPartyAgent: Agent;
  toPartyAgentId: string;
  toPartyAgent: Agent;
  valueId: string;
  value: Value;
  quantity: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Exchange = {
  id: string;
  name: string;
  purpose?: string;
  state: ExchangeState;
  completedAt?: string;
  closedAt?: string;
  valueStreamId: string;
  valueStream: ValueStream;
  channelId?: string;
  channel?: Channel;
  taxonId?: string;
  taxon?: Taxonomy;
  agreementId?: string;
  agreement?: Agreement;
  leadUserId?: string;
  leadUser?: User;
  parties: ExchangeParty[];
  flows: ExchangeFlow[];
  createdAt: string;
  updatedAt: string;
};

export type ExchangeGroup = {
  valueStream: {
    id: string;
    name: string;
  };
  exchanges: Exchange[];
};

export type GroupedExchangesResponse = {
  groups: ExchangeGroup[];
  total: number;
};

export const getStateLabel = (state: ExchangeState): string => {
  const labels: Record<ExchangeState, string> = {
    open: "Open",
    completed: "Completed",
    closed: "Closed",
  };
  return labels[state] || state;
};

export const getStateColor = (
  state: ExchangeState
): "default" | "secondary" | "destructive" | "outline" => {
  const colors: Record<
    ExchangeState,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    open: "default",
    completed: "secondary",
    closed: "outline",
  };
  return colors[state] || "secondary";
};

export const STATE_OPTIONS: { value: ExchangeState; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];

export const ALLOWED_TRANSITIONS: Record<ExchangeState, ExchangeState[]> = {
  open: ["completed", "closed"],
  completed: ["closed"],
  closed: [],
};
