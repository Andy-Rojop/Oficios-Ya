import * as React from 'react';
import { GUATEMALA_PHONE_PREFIX } from '@oficiosya/shared';
import { inputClassName } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const PhoneInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>
>(({ className, ...props }, ref) => (
  <div className="flex">
    <span
      aria-hidden="true"
      className="inline-flex h-11 items-center rounded-l-lg border border-r-0 border-border bg-brand-soft px-3 text-sm font-semibold text-brand-dark"
    >
      {GUATEMALA_PHONE_PREFIX}
    </span>
    <input
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      placeholder="5555 1234"
      className={cn(inputClassName, 'rounded-l-none', className)}
      {...props}
    />
  </div>
));
PhoneInput.displayName = 'PhoneInput';
