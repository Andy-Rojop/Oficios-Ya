import * as React from 'react';
import { cn } from '@/lib/utils';

export const inputClassName =
  'block h-11 w-full rounded-xl border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted/70 transition-colors focus-visible:border-foreground focus-visible:ring-1 focus-visible:ring-foreground disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-red-600';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input type={type} className={cn(inputClassName, className)} ref={ref} {...props} />
  ),
);
Input.displayName = 'Input';
