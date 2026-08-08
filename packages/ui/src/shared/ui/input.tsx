'use client';

import { InputHTMLAttributes, ReactNode, forwardRef, useId, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { cn } from '../utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      id: idProp,
      type,
      iconLeft,
      iconRight,
      clearable,
      onClear,
      value,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;
    const hasValue = value !== undefined && value !== null && String(value).length > 0;
    const showClear = clearable && hasValue && !isPassword;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-cinema-muted mb-1.5">
            {label}
          </label>
        )}
        <div className="relative min-h-11">
          {iconLeft && (
            <div
              className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-cinema-ash"
              aria-hidden
            >
              {iconLeft}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            type={inputType}
            value={value}
            className={cn(
              'w-full h-11 bg-cinema-surface border border-cinema-border rounded-[10px] px-4 text-white placeholder-cinema-ash',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
              'hover:border-cinema-silver/40 hover:bg-cinema-elevated/60',
              'focus:outline-none focus:ring-2 focus:ring-cinema-accent/50 focus:border-cinema-accent/60 focus:hover:bg-cinema-surface focus:hover:border-cinema-accent/60',
              'transition-all duration-200',
              iconLeft && 'pl-11',
              (isPassword || showClear || iconRight) && 'pr-11',
              error && 'border-red-500 focus:ring-red-500/50 hover:border-red-500/70',
              className
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            {...props}
          />
          {showClear && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Limpiar búsqueda"
              className={cn(
                'absolute inset-y-0 right-0 flex items-center pr-4 pl-2 text-cinema-ash',
                'hover:text-cinema-muted focus:outline-none focus-visible:text-cinema-accent',
                'transition-colors duration-200 cursor-pointer'
              )}
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          )}
          {iconRight && !showClear && !isPassword && (
            <div
              className="pointer-events-none absolute inset-y-0 right-0 flex w-11 items-center justify-center text-cinema-ash"
              aria-hidden
            >
              {iconRight}
            </div>
          )}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
              className={cn(
                'absolute inset-y-0 right-0 flex items-center pr-4 pl-2 text-cinema-ash',
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
