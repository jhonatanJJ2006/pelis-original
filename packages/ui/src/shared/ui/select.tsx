'use client';

import { SelectHTMLAttributes, forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id: idProp, children, ...props }, ref) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-cinema-muted mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={cn(
              'w-full h-11 appearance-none bg-cinema-surface border border-cinema-border rounded-[10px] pl-4 pr-10 text-white cursor-pointer',
              'hover:border-cinema-silver/40 hover:bg-cinema-elevated/60',
              'focus:outline-none focus:ring-2 focus:ring-cinema-accent/50 focus:border-cinema-accent/60 focus:hover:bg-cinema-surface focus:hover:border-cinema-accent/60',
              'transition-all duration-200',
              error && 'border-red-500 focus:ring-red-500/50 hover:border-red-500/70',
              className
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute inset-y-0 right-0 my-auto mr-3.5 w-4 h-4 text-cinema-ash"
            aria-hidden
          />
        </div>
        {error && (
          <p id={`${id}-error`} className="mt-1 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';