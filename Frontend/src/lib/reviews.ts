import { apiFetch } from './api-client';

/** Reseña pública (sin datos privados del cliente). */
export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string;
  workerReply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export interface WorkerReviewsPage {
  ratingAverage: number;
  ratingCount: number;
  items: PublicReview[];
  nextCursor: string | null;
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export const reviewsApi = {
  create: (input: { requestId: string; rating: number; comment?: string }) =>
    apiFetch<PublicReview>('/reviews', { method: 'POST', ...json(input) }),
  reply: (id: string, reply: string) =>
    apiFetch<PublicReview>(`/reviews/${id}/reply`, { method: 'PATCH', ...json({ reply }) }),
  report: (id: string, reason: string) =>
    apiFetch<{ id: string; status: string }>(`/reviews/${id}/report`, {
      method: 'POST',
      ...json({ reason }),
    }),
  listForWorker: (workerProfileId: string, cursor?: string) =>
    apiFetch<WorkerReviewsPage>(
      `/workers/${workerProfileId}/reviews${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    ),
};

export const REVIEW_QUERY_KEYS = {
  worker: (workerProfileId: string) => ['reviews', 'worker', workerProfileId] as const,
};
