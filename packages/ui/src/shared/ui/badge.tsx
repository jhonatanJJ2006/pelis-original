import { HTMLAttributes } from 'react';
import { cn } from '../utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'violet';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
        {
          'bg-cinema-accent/20 text-cinema-accent-light border border-cinema-accent/30':
            variant === 'primary',
          'bg-cinema-success/20 text-cinema-success border border-cinema-success/40':
            variant === 'success',
          'bg-cinema-accent/15 text-cinema-accent border border-cinema-accent/40':
            variant === 'warning',
          'bg-cinema-danger/20 text-cinema-danger-light border border-cinema-danger/30':
            variant === 'danger',
        },
        className
      )}
      {...props}
    />
  );
}
