import { apiFetch, apiFetchBlob } from './api-client';
import type { AccountStatus, UserRole } from './auth';

export type IdentityStatus = 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type ReportStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
export type ReportTarget =
  'USER' | 'WORKER_PROFILE' | 'SERVICE' | 'PORTFOLIO_ITEM' | 'CONVERSATION' | 'REVIEW';
export type RequestStatus =
  'SENT' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface AdminStats {
  users: number;
  workers: number;
  openReports: number;
  requestsByStatus: Record<RequestStatus, number>;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminUserRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: UserRole;
  status: AccountStatus;
  activeMode: 'CLIENT' | 'WORKER';
  createdAt: string;
  workerProfile: { id: string; headline: string; identityStatus: IdentityStatus } | null;
}

export interface VerificationRow {
  id: string;
  headline: string;
  identityStatus: IdentityStatus;
  dpi: string | null;
  nit: string | null;
  updatedAt: string;
  user: { id: string; name: string; phone: string; status: AccountStatus };
}

export interface ReportRow {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  reason: string;
  status: ReportStatus;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporter: { id: string; name: string; phone: string };
}

export interface AuditRow {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: unknown;
  ip: string | null;
  createdAt: string;
  actor: { id: string; name: string; role: UserRole } | null;
}

export interface ReportConversationMessage {
  id: string;
  senderId: string;
  type: 'TEXT' | 'IMAGE' | 'LOCATION' | string;
  content: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

export interface ReportConversation {
  report: {
    id: string;
    reason: string;
    status: ReportStatus;
    createdAt: string;
  };
  conversation: {
    id: string;
    client: { id: string; name: string };
    worker: { id: string; name: string };
    createdAt: string;
  };
  messages: ReportConversationMessage[];
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

export interface ZoneRow {
  id: string;
  name: string;
  type: string;
  latitude: string | number | null;
  longitude: string | number | null;
  active: boolean;
}

export const ADMIN_QUERY_KEYS = {
  stats: ['admin', 'stats'] as const,
  users: (page: number) => ['admin', 'users', page] as const,
  verifications: (page: number) => ['admin', 'verifications', page] as const,
  reports: (page: number) => ['admin', 'reports', page] as const,
  audit: (page: number) => ['admin', 'audit', page] as const,
  categories: ['admin', 'categories'] as const,
  zones: ['admin', 'zones'] as const,
};

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const raw = search.toString();
  return raw ? `?${raw}` : '';
}

export const adminApi = {
  stats: () => apiFetch<AdminStats>('/admin/stats'),
  users: (page = 1, pageSize = 20, q?: string) =>
    apiFetch<Paginated<AdminUserRow>>(`/admin/users${qs({ page, pageSize, q })}`),
  setUserStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    apiFetch<AdminUserRow>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  verifications: (page = 1) =>
    apiFetch<Paginated<VerificationRow>>(`/admin/verifications${qs({ page, pageSize: 20 })}`),
  decideVerification: (id: string, decision: 'VERIFIED' | 'REJECTED', note?: string) =>
    apiFetch(`/admin/verifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, note }),
    }),
  reports: (page = 1) =>
    apiFetch<Paginated<ReportRow>>(`/admin/reports${qs({ page, pageSize: 20 })}`),
  resolveReport: (id: string, resolution: string) =>
    apiFetch(`/admin/reports/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolution }),
    }),
  dismissReport: (id: string, resolution: string) =>
    apiFetch(`/admin/reports/${id}/dismiss`, {
      method: 'PATCH',
      body: JSON.stringify({ resolution }),
    }),
  reportConversation: (id: string) =>
    apiFetch<ReportConversation>(`/admin/reports/${id}/conversation`),
  exportUsersCsv: async () => {
    const blob = await apiFetchBlob('/admin/export/users.csv');
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'usuarios-oficiosya.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  },
  categories: () => apiFetch<CategoryRow[]>('/admin/catalog/categories'),
  createCategory: (body: { name: string; slug?: string; active?: boolean }) =>
    apiFetch<CategoryRow>('/admin/catalog/categories', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateCategory: (id: string, body: { name: string; slug?: string; active?: boolean }) =>
    apiFetch<CategoryRow>(`/admin/catalog/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteCategory: (id: string) => apiFetch(`/admin/catalog/categories/${id}`, { method: 'DELETE' }),
  zones: () => apiFetch<ZoneRow[]>('/admin/catalog/zones'),
  createZone: (body: { name: string; type: string; active?: boolean }) =>
    apiFetch<ZoneRow>('/admin/catalog/zones', { method: 'POST', body: JSON.stringify(body) }),
  updateZone: (id: string, body: { name: string; type: string; active?: boolean }) =>
    apiFetch<ZoneRow>(`/admin/catalog/zones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteZone: (id: string) => apiFetch(`/admin/catalog/zones/${id}`, { method: 'DELETE' }),
  auditLog: (page = 1) =>
    apiFetch<Paginated<AuditRow>>(`/admin/audit-log${qs({ page, pageSize: 30 })}`),
};

export function isStaffRole(role: UserRole | undefined): boolean {
  return role === 'ADMIN' || role === 'MUNICIPAL';
}
