import * as React from 'react';
import { cn } from '@/lib/utils';
import { inputClassName } from './input';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select className={cn(inputClassName, 'pr-8', className)} ref={ref} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
