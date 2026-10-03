import { cn } from '@/lib/utils';
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_STYLES, type RequestStatus } from '@/lib/requests';

export function StatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2.5 py-1 text-xs font-semibold',
        REQUEST_STATUS_STYLES[status],
        className,
      )}
    >
      {REQUEST_STATUS_LABELS[status]}
    </span>
  );
}
