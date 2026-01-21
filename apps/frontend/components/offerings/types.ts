export type OfferingState = "draft" | "live" | "archived";

export type FileUpload = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

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

export type Value = {
  id: string;
  name: string;
  description?: string;
  type: string;
};

export type OfferingItem = {
  id: string;
  offeringId: string;
  valueId: string;
  value: Value;
  quantity: number;
  pricingFormula?: string;
  pricingLink?: string;
  createdAt: string;
  updatedAt: string;
};

export type Offering = {
  id: string;
  name: string;
  description?: string;
  purpose?: string;
  link?: string;
  state: OfferingState;
  activeFrom?: string;
  activeUntil?: string;
  agentId: string;
  agent: Agent;
  valueStreamId: string;
  valueStream: ValueStream;
  items?: OfferingItem[];
  files?: FileUpload[];
  createdAt: string;
  updatedAt: string;
};

export const getStateLabel = (state: OfferingState): string => {
  const labels: Record<OfferingState, string> = {
    draft: "Draft",
    live: "Live",
    archived: "Archived",
  };
  return labels[state] || state;
};

export const getStateColor = (
  state: OfferingState
): "default" | "secondary" | "destructive" | "outline" => {
  const colors: Record<
    OfferingState,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    draft: "secondary",
    live: "default",
    archived: "outline",
  };
  return colors[state] || "secondary";
};

export const isOfferingActive = (offering: Offering): boolean => {
  if (offering.state !== "live") return false;
  const now = new Date();
  if (offering.activeFrom && new Date(offering.activeFrom) > now) return false;
  if (offering.activeUntil && new Date(offering.activeUntil) < now) return false;
  return true;
};

export const STATE_OPTIONS: { value: OfferingState; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "live", label: "Live" },
  { value: "archived", label: "Archived" },
];

export const ALLOWED_TRANSITIONS: Record<OfferingState, OfferingState[]> = {
  draft: ["live", "archived"],
  live: ["archived"],
  archived: ["draft"],
};
