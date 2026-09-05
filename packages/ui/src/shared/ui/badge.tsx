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
          'bg-cinema-elevated text-cinema-muted border border-cinema-border': variant === 'default',
          'bg-cinema-accent/20 text-cinema-accent-light border border-cinema-accent/30':
            variant === 'primary',
          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30': variant === 'success',
          'bg-cinema-gold/25 text-cinema-gold border border-cinema-gold/30': variant === 'warning',
          'bg-cinema-danger/20 text-cinema-danger-light border border-cinema-danger/30':
            variant === 'danger',
          'bg-cinema-violet/20 text-cinema-violet-light border border-cinema-violet/30':
            variant === 'violet',
        },
        className
      )}
      {...props}
    />
  );
}
