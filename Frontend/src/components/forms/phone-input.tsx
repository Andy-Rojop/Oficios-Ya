import * as React from 'react';
import { GUATEMALA_PHONE_PREFIX } from '@/lib/shared';
import { inputClassName } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const PhoneInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>
>(({ className, onChange, ...props }, ref) => (
  <div className="flex">
    <span
      aria-hidden="true"
      className="inline-flex h-11 items-center rounded-l-xl border border-r-0 border-border bg-brand-soft px-3 text-sm font-semibold text-foreground"
    >
      {GUATEMALA_PHONE_PREFIX}
    </span>
    <input
      ref={ref}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      maxLength={9}
      placeholder="5555 1234"
      className={cn(inputClassName, 'rounded-l-none', className)}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
        event.target.value =
          digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;
        onChange?.(event);
      }}
      {...props}
    />
  </div>
));
PhoneInput.displayName = 'PhoneInput';
