export type AgreementCategory = "internal_market" | "external_market";
export type AgreementGateway = "pen_and_paper" | "notary" | "docu_sign" | "other";
export type AgreementPartyRole =
  | "buyer"
  | "seller"
  | "service_provider"
  | "client"
  | "partner"
  | "employee"
  | "employer"
  | "other";

export type FileUpload = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type AgreementParty = {
  id: string;
  agentId: string;
  agent: {
    id: string;
    name: string;
    type: string;
  };
  role?: AgreementPartyRole;
  createdAt: string;
};

export type Agreement = {
  id: string;
  title: string;
  category: AgreementCategory;
  gateway: AgreementGateway;
  link?: string;
  content?: string;
  completedAt?: string;
  parentId?: string;
  parent?: Agreement;
  fileId?: string;
  file?: FileUpload;
  parties?: AgreementParty[];
  children?: Agreement[];
  childrenCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type AgreementStats = {
  openCount: number;
  completedCount: number;
  totalCount: number;
};

export const getCategoryLabel = (category: AgreementCategory): string => {
  const labels: Record<AgreementCategory, string> = {
    internal_market: "Internal Market",
    external_market: "External Market",
  };
  return labels[category] || category;
};

export const getGatewayLabel = (gateway: AgreementGateway): string => {
  const labels: Record<AgreementGateway, string> = {
    pen_and_paper: "Pen & Paper",
    notary: "Notary",
    docu_sign: "DocuSign",
    other: "Other",
  };
  return labels[gateway] || gateway;
};

export const getPartyRoleLabel = (role: AgreementPartyRole): string => {
  const labels: Record<AgreementPartyRole, string> = {
    buyer: "Buyer",
    seller: "Seller",
    service_provider: "Service Provider",
    client: "Client",
    partner: "Partner",
    employee: "Employee",
    employer: "Employer",
    other: "Other",
  };
  return labels[role] || role;
};

export const isAgreementOpen = (agreement: Agreement): boolean => {
  return !agreement.completedAt;
};

export const CATEGORY_OPTIONS: { value: AgreementCategory; label: string }[] = [
  { value: "internal_market", label: "Internal Market" },
  { value: "external_market", label: "External Market" },
];

export const GATEWAY_OPTIONS: { value: AgreementGateway; label: string }[] = [
  { value: "pen_and_paper", label: "Pen & Paper" },
  { value: "notary", label: "Notary" },
  { value: "docu_sign", label: "DocuSign" },
  { value: "other", label: "Other" },
];

export const PARTY_ROLE_OPTIONS: { value: AgreementPartyRole; label: string }[] = [
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "service_provider", label: "Service Provider" },
  { value: "client", label: "Client" },
  { value: "partner", label: "Partner" },
  { value: "employee", label: "Employee" },
  { value: "employer", label: "Employer" },
  { value: "other", label: "Other" },
];
