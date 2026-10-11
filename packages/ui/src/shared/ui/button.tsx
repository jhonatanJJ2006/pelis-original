import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const buttonVariants = cva('btn-base', {
  variants: {
    variant: {
      primary:
        'bg-cinema-accent hover:bg-cinema-accent-light active:bg-cinema-accent-pressed text-cinema-bg',
      secondary:
        'bg-cinema-elevated hover:bg-cinema-border text-cinema-chalk border border-cinema-border',
      outline:
        'bg-transparent hover:bg-cinema-chalk/10 text-cinema-chalk border border-cinema-chalk/40 hover:border-cinema-chalk/70',
      ghost: 'hover:bg-cinema-elevated/60 text-cinema-muted hover:text-cinema-chalk',
      danger: 'bg-cinema-danger hover:bg-cinema-danger-light text-cinema-chalk',
      gold: 'bg-cinema-accent hover:bg-cinema-accent-light active:bg-cinema-accent-pressed text-cinema-bg font-semibold',
    },
    size: {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-6 text-sm',
      lg: 'h-12 px-8 text-base',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  }
);

Button.displayName = 'Button';
