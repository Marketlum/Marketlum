export type Account = {
  id: string;
  name: string;
  description: string | null;
  ownerAgentId: string;
  ownerAgent?: {
    id: string;
    name: string;
    type: string;
  };
  valueId: string;
  value?: {
    id: string;
    name: string;
    type: string;
  };
  balance: string;
  createdAt: string;
  updatedAt: string;
};

export type Transaction = {
  id: string;
  fromAccountId: string;
  fromAccount?: {
    id: string;
    name: string;
  };
  toAccountId: string;
  toAccount?: {
    id: string;
    name: string;
  };
  amount: string;
  timestamp: string;
  verified: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountsResponse = {
  items: Account[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
};

export type TransactionsResponse = {
  items: Transaction[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
};

export function formatBalance(balance: string | number): string {
  const num = typeof balance === 'string' ? parseFloat(balance) : balance;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatAmount(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const prefix = num >= 0 ? '+' : '';
  return prefix + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
