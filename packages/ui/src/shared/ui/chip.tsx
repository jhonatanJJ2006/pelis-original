import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/** Chip de filtro Maison Noir: contorno sutil, activo con fondo oro y texto tinta. */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, active = false, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-meta font-medium transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/70',
        active
          ? 'border-cinema-accent bg-cinema-accent text-cinema-bg'
          : 'border-cinema-border bg-transparent text-cinema-muted hover:border-cinema-silver/60 hover:text-cinema-chalk',
        className
      )}
      {...props}
    />
  )
);

Chip.displayName = 'Chip';
