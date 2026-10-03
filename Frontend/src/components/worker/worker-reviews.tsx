'use client';

import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal } from '@/components/chat/modal';
import { StarsDisplay } from '@/components/requests/star-rating';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage, useMe } from '@/lib/auth';
import { formatDate } from '@/lib/requests';
import { REVIEW_QUERY_KEYS, reviewsApi, type WorkerReviewsPage } from '@/lib/reviews';

/** Reseñas públicas del perfil: solo nombre abreviado, calificación, comentario y respuesta. */
export function WorkerReviews({ workerProfileId }: { workerProfileId: string }) {
  const [reporting, setReporting] = useState<string | null>(null);
  const me = useMe();

  const reviews = useInfiniteQuery<
    WorkerReviewsPage,
    Error,
    { pages: WorkerReviewsPage[] },
    readonly unknown[],
    string | undefined
  >({
    queryKey: REVIEW_QUERY_KEYS.worker(workerProfileId),
    queryFn: ({ pageParam }) => reviewsApi.listForWorker(workerProfileId, pageParam),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const pages = reviews.data?.pages ?? [];
  const summary = pages[0];
  const items = pages.flatMap((page) => page.items);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <CardTitle>Reseñas</CardTitle>
        {summary && summary.ratingCount > 0 ? (
          <p className="flex items-center gap-2 text-sm">
            <StarsDisplay rating={summary.ratingAverage} />
            <span className="font-semibold">{summary.ratingAverage.toFixed(1)}</span>
            <span className="text-muted">({summary.ratingCount})</span>
          </p>
        ) : null}
      </div>

      {reviews.isLoading ? (
        <p className="text-sm text-muted">Cargando reseñas…</p>
      ) : reviews.isError ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {getErrorMessage(reviews.error)}
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">Este trabajador aún no tiene reseñas.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((review) => (
            <li
              key={review.id}
              className="space-y-1.5 border-b border-border/60 pb-4 last:border-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm">
                  <StarsDisplay rating={review.rating} />
                  <span className="font-semibold">{review.authorName}</span>
                </p>
                <time className="text-xs text-muted" dateTime={review.createdAt}>
                  {formatDate(review.createdAt)}
                </time>
              </div>
              {review.comment ? (
                <p className="whitespace-pre-line text-sm">{review.comment}</p>
              ) : null}
              {review.workerReply ? (
                <div className="rounded-lg bg-brand-soft/50 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Respuesta del trabajador
                  </p>
                  <p className="whitespace-pre-line">{review.workerReply}</p>
                </div>
              ) : null}
              {me.data ? (
                <button
                  type="button"
                  className="text-xs text-muted underline hover:text-foreground"
                  onClick={() => setReporting(review.id)}
                >
                  Reportar reseña
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {reviews.hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          disabled={reviews.isFetchingNextPage}
          onClick={() => void reviews.fetchNextPage()}
        >
          {reviews.isFetchingNextPage ? 'Cargando…' : 'Ver más reseñas'}
        </Button>
      ) : null}

      {reporting ? (
        <ReportReviewDialog reviewId={reporting} onClose={() => setReporting(null)} />
      ) : null}
    </Card>
  );
}

const REASON_MIN = 10;

function ReportReviewDialog({ reviewId, onClose }: { reviewId: string; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const report = useMutation({ mutationFn: (text: string) => reviewsApi.report(reviewId, text) });
  const trimmed = reason.trim();
  const valid = trimmed.length >= REASON_MIN;

  if (report.isSuccess) {
    return (
      <Modal title="Reporte enviado" onClose={onClose}>
        <p className="text-sm">Gracias. Revisaremos esta reseña.</p>
        <div className="flex justify-end">
          <Button onClick={onClose}>Entendido</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Reportar reseña" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) report.mutate(trimmed);
        }}
      >
        <div className="space-y-1">
          <label htmlFor="report-review-reason" className="text-sm font-medium">
            ¿Qué pasa con esta reseña?
          </label>
          <Textarea
            id="report-review-reason"
            rows={4}
            autoFocus
            maxLength={1000}
            value={reason}
            placeholder="Cuéntanos el motivo (mínimo 10 caracteres)"
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        {report.isError ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {getErrorMessage(report.error)}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!valid || report.isPending}>
            {report.isPending ? 'Enviando…' : 'Enviar reporte'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
