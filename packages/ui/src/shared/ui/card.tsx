import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-cinema-surface rounded-xl border border-cinema-border overflow-hidden transition-all duration-300',
          'hover:border-cinema-accent/40 hover:shadow-lg hover:shadow-cinema-accent/10',
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
    return <div ref={ref} className={cn('p-4', className)} {...props} />;
  }
);

CardContent.displayName = 'CardContent';
