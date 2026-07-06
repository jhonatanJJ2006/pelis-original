import { HTMLAttributes } from 'react';
import { cn } from '../utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
        {
          'bg-slate-700 text-slate-300': variant === 'default',
          'bg-primary-600/20 text-primary-400': variant === 'primary',
          'bg-green-600/20 text-green-400': variant === 'success',
          'bg-yellow-600/20 text-yellow-400': variant === 'warning',
          'bg-red-600/20 text-red-400': variant === 'danger',
        },
        className
      )}
      {...props}
    />
  );
}
