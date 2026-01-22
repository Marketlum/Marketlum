export interface Invoice {
  id: string;
  fromAgentId: string;
  fromAgent?: {
    id: string;
    name: string;
  };
  toAgentId: string;
  toAgent?: {
    id: string;
    name: string;
  };
  number: string;
  issuedAt: string;
  dueAt: string;
  link: string | null;
  fileId: string | null;
  file?: {
    id: string;
    filename: string;
    url: string;
  } | null;
  note: string | null;
  items?: InvoiceItem[];
  itemsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  valueId: string | null;
  value?: {
    id: string;
    name: string;
    type: string;
  } | null;
  valueInstanceId: string | null;
  valueInstance?: {
    id: string;
    name: string;
    value?: {
      id: string;
      name: string;
      type: string;
    };
  } | null;
  quantity: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export const SORT_OPTIONS = [
  { value: 'issuedAt_desc', label: 'Recently Issued' },
  { value: 'dueAt_asc', label: 'Due Soon' },
  { value: 'number_asc', label: 'Number (A-Z)' },
  { value: 'updatedAt_desc', label: 'Recently Updated' },
];

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export function isOverdue(dueAt: string): boolean {
  return new Date(dueAt) < new Date();
}
