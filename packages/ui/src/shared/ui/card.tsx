import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'feature' | 'glow';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border overflow-hidden transition-all duration-300',
          variant === 'default' &&
            'bg-cinema-surface border-cinema-border hover:border-cinema-violet/40',
          variant === 'feature' &&
            'card-feature border-cinema-violet/20',
          variant === 'glow' &&
            'bg-cinema-surface border-cinema-border hover:border-cinema-accent/40 hover:-translate-y-0.5 shadow-[0_4px_24px_rgba(139,92,246,0.08)]',
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export const CardContent = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('p-6', className)} {...props} />;
  }
);

CardContent.displayName = 'CardContent';
