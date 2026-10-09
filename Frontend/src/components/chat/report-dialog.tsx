'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/lib/auth';
import { chatApi, REPORT_REASON_MAX_LENGTH, REPORT_REASON_MIN_LENGTH } from '@/lib/chat';
import { Modal } from './modal';

interface ReportDialogProps {
  conversationId: string;
  onClose: () => void;
}

export function ReportDialog({ conversationId, onClose }: ReportDialogProps) {
  const [reason, setReason] = useState('');
  const report = useMutation({
    mutationFn: (text: string) => chatApi.report(conversationId, text),
  });
  const trimmed = reason.trim();
  const valid = trimmed.length >= REPORT_REASON_MIN_LENGTH;

  if (report.isSuccess) {
    return (
      <Modal title="Reporte enviado" onClose={onClose}>
        <p className="text-sm">
          Gracias. Revisaremos la conversación. Si no se siente seguro, también puede bloquear a
          esta persona.
        </p>
        <div className="flex justify-end">
          <Button onClick={onClose}>Entendido</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Reportar conversación" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) report.mutate(trimmed);
        }}
      >
        <div className="space-y-1">
          <label htmlFor="report-reason" className="text-sm font-medium">
            ¿Qué pasó?
          </label>
          <Textarea
            id="report-reason"
            rows={4}
            autoFocus
            maxLength={REPORT_REASON_MAX_LENGTH}
            value={reason}
            placeholder="Cuéntenos el motivo (mínimo 10 caracteres)"
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
