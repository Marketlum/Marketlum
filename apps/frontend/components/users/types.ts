export type User = {
  id: string;
  email: string;
  isActive: boolean;
  avatarFileId: string | null;
  avatarFile?: {
    id: string;
    originalName: string;
    mimeType: string;
  } | null;
  agentId: string;
  agent?: {
    id: string;
    name: string;
  };
  relationshipAgreementId: string | null;
  relationshipAgreement?: {
    id: string;
    title: string;
  } | null;
  birthday: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  defaultLocaleId: string;
  defaultLocale?: {
    id: string;
    code: string;
  };
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedUsersResponse = {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
};
