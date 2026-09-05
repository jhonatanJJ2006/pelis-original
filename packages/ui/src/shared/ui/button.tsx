import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const buttonVariants = cva('btn-base', {
  variants: {
    variant: {
      primary:
        'bg-cinema-accent hover:bg-cinema-accent-light text-cinema-bg shadow-[0_6px_20px_rgba(196,163,90,0.28)] hover:shadow-[0_8px_28px_rgba(196,163,90,0.38)]',
      secondary:
        'bg-cinema-elevated hover:bg-cinema-elevated/90 text-cinema-chalk border border-cinema-border hover:border-cinema-silver/40 shadow-[0_2px_10px_rgba(11,11,13,0.35)]',
      outline:
        'bg-transparent hover:bg-cinema-elevated/60 text-cinema-muted hover:text-cinema-chalk border border-cinema-border hover:border-cinema-accent/50',
      ghost: 'hover:bg-cinema-elevated/60 text-cinema-muted hover:text-cinema-chalk',
      danger:
        'bg-cinema-danger hover:bg-cinema-danger-light text-cinema-chalk shadow-[0_6px_20px_rgba(139,30,45,0.35)]',
      gold: 'bg-gradient-to-r from-cinema-gold to-cinema-gold-light text-black font-semibold hover:brightness-110 shadow-[0_6px_20px_rgba(245,200,66,0.25)]',
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
