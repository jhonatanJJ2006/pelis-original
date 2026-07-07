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
          'bg-cinema-elevated text-zinc-300 border border-cinema-border': variant === 'default',
          'bg-cinema-accent/20 text-cinema-accent-light': variant === 'primary',
          'bg-emerald-500/20 text-emerald-400': variant === 'success',
          'bg-cinema-gold/20 text-cinema-gold': variant === 'warning',
          'bg-red-600/20 text-red-400': variant === 'danger',
        },
        className
      )}
      {...props}
    />
  );
}
