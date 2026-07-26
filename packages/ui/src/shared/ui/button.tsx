import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-fast ease-out-expo active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-cinema-bg',
  {
    variants: {
      variant: {
        primary:
          'bg-cinema-accent hover:bg-cinema-accent-light text-white shadow-[0_4px_16px_rgba(229,9,20,0.25)]',
        secondary:
          'bg-cinema-elevated hover:bg-cinema-elevated/90 text-white border border-cinema-border',
        outline:
          'bg-transparent hover:bg-cinema-elevated/50 text-cinema-muted border border-cinema-border hover:border-cinema-violet/50',
        ghost: 'hover:bg-cinema-elevated/60 text-cinema-muted hover:text-white',
        danger: 'bg-red-600 hover:bg-red-500 text-white',
        gold: 'bg-gradient-to-r from-cinema-gold to-cinema-gold-light text-black font-semibold hover:brightness-110',
      },
      size: {
        sm: 'py-1.5 px-3 text-sm rounded',
        md: 'py-2.5 px-4 text-sm rounded',
        lg: 'py-3 px-6 text-base rounded',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
    );
  }
);

Button.displayName = 'Button';
