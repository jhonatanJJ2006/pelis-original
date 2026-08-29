'use client';

import { SelectHTMLAttributes, forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, label, error, id: idProp, children, ...props }, ref) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    return (
      <div className={cn(wrapperClassName)}>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-cinema-muted mb-1.5">
            {label}
          </label>
        )}
        <div className="relative w-full overflow-hidden rounded-[10px]">
          <select
            ref={ref}
            id={id}
            className={cn(
              'w-full h-11 appearance-none bg-cinema-surface border border-cinema-border rounded-[10px] pl-4 pr-9 text-sm text-cinema-chalk cursor-pointer',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
              'hover:border-cinema-silver/40 hover:bg-cinema-elevated/60',
              'focus:outline-none focus:ring-2 focus:ring-cinema-accent/50 focus:border-cinema-accent/60 focus:hover:bg-cinema-surface focus:hover:border-cinema-accent/60',
              'transition-all duration-200',
              error && 'border-cinema-danger focus:ring-cinema-danger/50 hover:border-cinema-danger/70',
              className
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            {...props}
          >
            {children}
          </select>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-center border-l border-cinema-border/40 bg-cinema-elevated/40"
            aria-hidden
          >
            <ChevronDown className="w-4 h-4 text-cinema-ash" />
          </div>
        </div>
        {error && (
          <p id={`${id}-error`} className="mt-1 text-sm text-cinema-danger-light" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
