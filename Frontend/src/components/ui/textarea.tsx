import * as React from 'react';
import { cn } from '@/lib/utils';
import { inputClassName } from './input';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea
      rows={rows}
      className={cn(inputClassName, 'h-auto min-h-24 py-2 leading-relaxed', className)}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
