'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export const inputClassName =
  'block h-11 w-full rounded-xl border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted/70 transition-colors focus-visible:border-foreground focus-visible:ring-1 focus-visible:ring-foreground disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-red-600';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    if (type !== 'password') {
      return <input type={type} className={cn(inputClassName, className)} ref={ref} {...props} />;
    }

    return (
      <div className="relative w-full">
        <input
          type={showPassword ? 'text' : 'password'}
          className={cn(inputClassName, 'pr-10', className)}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
          className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-brand-soft/60 hover:text-foreground"
        >
          {showPassword ? (
            <EyeOff aria-hidden className="h-4 w-4" />
          ) : (
            <Eye aria-hidden className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  },
);
Input.displayName = 'Input';

