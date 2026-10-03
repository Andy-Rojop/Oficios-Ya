'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/lib/auth';
import { REQUEST_QUERY_KEYS, REVIEW_COMMENT_MAX } from '@/lib/requests';
import { REVIEW_QUERY_KEYS, reviewsApi } from '@/lib/reviews';
import { StarPicker } from './star-rating';

const RATING_HINTS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'] as const;

/** Formulario de reseña: solo aparece cuando el servidor indica que el cliente puede calificar. */
export function ReviewForm({
  requestId,
  workerProfileId,
}: {
  requestId: string;
  workerProfileId: string | null;
}) {
  const queryClient = useQueryClient();
  const labelId = useId();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      reviewsApi.create({
        requestId,
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REQUEST_QUERY_KEYS.detail(requestId) });
      void queryClient.invalidateQueries({ queryKey: REQUEST_QUERY_KEYS.list });
      if (workerProfileId) {
        void queryClient.invalidateQueries({ queryKey: REVIEW_QUERY_KEYS.worker(workerProfileId) });
      }
    },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (rating >= 1 && !submit.isPending) submit.mutate();
      }}
    >
      <div className="space-y-1">
        <p id={labelId} className="text-sm font-medium">
          ¿Cómo fue el trabajo?
        </p>
        <StarPicker value={rating} onChange={setRating} labelledBy={labelId} />
        <p className="h-4 text-xs text-muted" aria-live="polite">
          {RATING_HINTS[rating]}
        </p>
      </div>
      <div className="space-y-1">
        <label htmlFor="review-comment" className="text-sm font-medium">
          Comentario (opcional)
        </label>
        <Textarea
          id="review-comment"
          rows={3}
          maxLength={REVIEW_COMMENT_MAX}
          value={comment}
          placeholder="Cuenta cómo fue tu experiencia"
          onChange={(event) => setComment(event.target.value)}
        />
        <p className="text-right text-xs text-muted">
          {comment.length}/{REVIEW_COMMENT_MAX}
        </p>
      </div>
      {submit.isError ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {getErrorMessage(submit.error)}
        </p>
      ) : null}
      <Button type="submit" disabled={rating < 1 || submit.isPending}>
        {submit.isPending ? 'Enviando…' : 'Publicar reseña'}
      </Button>
    </form>
  );
}

/** El trabajador responde una sola vez a la reseña recibida. */
export function ReplyForm({ reviewId, requestId }: { reviewId: string; requestId: string }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');

  const submit = useMutation({
    mutationFn: () => reviewsApi.reply(reviewId, reply.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REQUEST_QUERY_KEYS.detail(requestId) });
      void queryClient.invalidateQueries({ queryKey: ['reviews', 'worker'] });
    },
  });

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (reply.trim() && !submit.isPending) submit.mutate();
      }}
    >
      <label htmlFor="review-reply" className="text-sm font-medium">
        Responder a la reseña (solo puedes hacerlo una vez)
      </label>
      <Textarea
        id="review-reply"
        rows={3}
        maxLength={REVIEW_COMMENT_MAX}
        value={reply}
        onChange={(event) => setReply(event.target.value)}
      />
      {submit.isError ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {getErrorMessage(submit.error)}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={!reply.trim() || submit.isPending}>
        {submit.isPending ? 'Enviando…' : 'Enviar respuesta'}
      </Button>
    </form>
  );
}
