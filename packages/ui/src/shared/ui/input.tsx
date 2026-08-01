'use client';

import { InputHTMLAttributes, forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id: idProp, type, ...props }, ref) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-cinema-muted mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={inputType}
            className={cn(
              'w-full bg-cinema-surface border border-cinema-border rounded py-2.5 px-4 text-white placeholder-cinema-ash',
              'hover:border-cinema-silver/40 hover:bg-cinema-elevated/60',
              'focus:outline-none focus:ring-2 focus:ring-cinema-accent/50 focus:border-cinema-accent/40 focus:hover:bg-cinema-surface focus:hover:border-cinema-accent/40',
              'transition-all duration-200',
              isPassword && 'pr-11',
              error && 'border-red-500 focus:ring-red-500/50 hover:border-red-500/70',
              className
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
              className={cn(
                'absolute inset-y-0 right-0 flex items-center pr-3.5 pl-2 text-cinema-ash',
                'hover:text-cinema-muted focus:outline-none focus-visible:text-cinema-accent',
                'transition-colors duration-200 cursor-pointer'
              )}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" aria-hidden />
              ) : (
                <Eye className="w-5 h-5" aria-hidden />
              )}
            </button>
          )}
        </div>
        {error && (
          <p id={`${id}-error`} className="mt-1 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
