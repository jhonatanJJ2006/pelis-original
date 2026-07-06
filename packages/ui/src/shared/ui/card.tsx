import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-dark-200 rounded-xl border border-slate-800 overflow-hidden transition-all duration-300',
          'hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10',
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
