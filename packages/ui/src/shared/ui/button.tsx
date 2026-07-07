import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
  {
    variants: {
      variant: {
        primary: 'bg-cinema-accent hover:bg-cinema-accent-light text-white shadow-lg shadow-cinema-accent/20',
        secondary: 'bg-cinema-surface hover:bg-cinema-elevated text-white border border-cinema-border',
        outline: 'bg-transparent hover:bg-white/5 text-zinc-300 border border-cinema-border hover:border-cinema-accent/40',
        ghost: 'hover:bg-white/5 text-zinc-300',
        danger: 'bg-red-600 hover:bg-red-500 text-white',
      },
      size: {
        sm: 'py-1.5 px-3 text-sm rounded-md',
        md: 'py-2.5 px-4 text-sm rounded-lg',
        lg: 'py-3 px-6 text-base rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
