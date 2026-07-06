import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 hover:bg-primary-500 text-white',
        secondary: 'bg-dark-100 hover:bg-dark-200 text-white border border-slate-700',
        ghost: 'hover:bg-dark-200 text-slate-300',
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
