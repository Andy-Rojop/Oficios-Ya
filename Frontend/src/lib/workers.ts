import { apiFetch } from './api-client';
import type { CategoryDto, ZoneDto } from './catalog';

export type Availability = 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
export type PriceMode = 'FIXED' | 'FROM' | 'NEGOTIABLE';
export type PriceUnit = 'JOB' | 'HOUR' | 'VISIT' | 'METER';
export type IdentityStatus = 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
};

export interface ScheduleDay {
  closed: boolean;
  from?: string;
  to?: string;
}
export type Schedule = Partial<Record<DayKey, ScheduleDay>>;

export interface VisibleChannels {
  phone: boolean;
  whatsapp: boolean;
  email: boolean;
}

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  AVAILABLE: 'Disponible',
  BUSY: 'Ocupado',
  UNAVAILABLE: 'No disponible',
};

export const PRICE_MODE_LABELS: Record<PriceMode, string> = {
  FIXED: 'Precio fijo',
  FROM: 'Desde',
  NEGOTIABLE: 'A convenir',
};

export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  JOB: 'Por trabajo',
  HOUR: 'Por hora',
  VISIT: 'Por visita',
  METER: 'Por metro',
};

/** Igual a OwnWorkerProfileDto del backend. */
export interface OwnWorkerProfile {
  id: string;
  headline: string;
  description: string;
  experienceYears: number | null;
  schedule: Schedule | null;
  availability: Availability;
  visibleChannels: VisibleChannels;
  mainCategory: CategoryDto | null;
  zones: ZoneDto[];
  identityStatus: IdentityStatus;
  dpi: string | null;
  nit: string | null;
  ratingAverage: number;
  ratingCount: number;
  completedJobs: number;
}

export interface UpdateWorkerProfileInput {
  headline: string;
  description: string;
  experienceYears?: number | null;
  mainCategoryId?: string | null;
  schedule?: Schedule | null;
  visibleChannels?: VisibleChannels | null;
  /** PRIVADO: 13 dígitos. Enviar dispara cola PENDING en el backend. */
  dpi?: string | null;
  nit?: string | null;
}

export const IDENTITY_STATUS_LABELS: Record<IdentityStatus, string> = {
  NOT_SUBMITTED: 'Sin enviar',
  PENDING: 'En revisión',
  VERIFIED: 'Verificado',
  REJECTED: 'Rechazado',
};

export interface CompletenessItem {
  key: string;
  label: string;
  weight: number;
  done: boolean;
}

export interface Completeness {
  percentage: number;
  complete: boolean;
  items: CompletenessItem[];
}

export interface ServiceDto {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  priceMode: PriceMode;
  priceAmount: number | null;
  priceUnit: PriceUnit;
  photos: string[];
  active: boolean;
}

export interface ServiceInput {
  categoryId: string;
  name: string;
  description: string;
  priceMode: PriceMode;
  priceAmount: number | null;
  priceUnit: PriceUnit;
  active: boolean;
}

export interface PortfolioItemDto {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  createdAt: string;
}

export interface PublicWorkerProfile {
  id: string;
  name: string;
  headline: string;
  description: string;
  experienceYears: number | null;
  schedule: Schedule | null;
  availability: Availability;
  mainCategory: CategoryDto | null;
  zones: ZoneDto[];
  identityVerified: boolean;
  ratingAverage: number;
  ratingCount: number;
  completedJobs: number;
  contact: { phone: string | null; whatsapp: string | null; email: string | null };
  services: ServiceDto[];
  portfolio: PortfolioItemDto[];
  memberSince: string;
}

export const WORKER_QUERY_KEYS = {
  profile: ['workers', 'me'] as const,
  completeness: ['workers', 'me', 'completeness'] as const,
  services: ['workers', 'me', 'services'] as const,
  portfolio: ['workers', 'me', 'portfolio'] as const,
};

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export const workersApi = {
  getProfile: () => apiFetch<OwnWorkerProfile>('/workers/me'),
  updateProfile: (input: UpdateWorkerProfileInput) =>
    apiFetch<OwnWorkerProfile>('/workers/me', { method: 'PUT', ...json(input) }),
  setZones: (zoneIds: string[]) =>
    apiFetch<OwnWorkerProfile>('/workers/me/zones', { method: 'PUT', ...json({ zoneIds }) }),
  setAvailability: (availability: Availability) =>
    apiFetch<OwnWorkerProfile>('/workers/me/availability', {
      method: 'PUT',
      ...json({ availability }),
    }),
  getCompleteness: () => apiFetch<Completeness>('/workers/me/completeness'),

  listServices: () => apiFetch<ServiceDto[]>('/workers/me/services'),
  createService: (input: ServiceInput) =>
    apiFetch<ServiceDto>('/workers/me/services', { method: 'POST', ...json(input) }),
  updateService: (id: string, input: Partial<ServiceInput>) =>
    apiFetch<ServiceDto>(`/workers/me/services/${id}`, { method: 'PATCH', ...json(input) }),
  deleteService: (id: string) => apiFetch<void>(`/workers/me/services/${id}`, { method: 'DELETE' }),
  uploadServicePhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<ServiceDto>(`/workers/me/services/${id}/photos`, {
      method: 'POST',
      body: form,
    });
  },
  deleteServicePhoto: (id: string, index: number) =>
    apiFetch<ServiceDto>(`/workers/me/services/${id}/photos/${index}`, { method: 'DELETE' }),

  listPortfolio: () => apiFetch<PortfolioItemDto[]>('/workers/me/portfolio'),
  createPortfolioItem: (input: { file: File; title: string; description?: string }) => {
    const form = new FormData();
    form.append('file', input.file);
    form.append('title', input.title);
    if (input.description) form.append('description', input.description);
    return apiFetch<PortfolioItemDto>('/workers/me/portfolio', { method: 'POST', body: form });
  },
  deletePortfolioItem: (id: string) =>
    apiFetch<void>(`/workers/me/portfolio/${id}`, { method: 'DELETE' }),

  getPublicProfile: (id: string) =>
    apiFetch<PublicWorkerProfile>(`/workers/${id}`, { cache: 'no-store' }),
};

/** Texto de precio de referencia, p. ej. "Desde Q150 por visita" o "A convenir". */
export function formatServicePrice(
  service: Pick<ServiceDto, 'priceMode' | 'priceAmount' | 'priceUnit'>,
): string {
  if (service.priceMode === 'NEGOTIABLE' || service.priceAmount === null) {
    return 'A convenir';
  }
  const amount = Number.isInteger(service.priceAmount)
    ? service.priceAmount.toFixed(0)
    : service.priceAmount.toFixed(2);
  const unit = PRICE_UNIT_LABELS[service.priceUnit].toLowerCase();
  return `${service.priceMode === 'FROM' ? 'Desde ' : ''}Q${amount} ${unit}`;
}
