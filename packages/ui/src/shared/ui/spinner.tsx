import { Loader2 } from 'lucide-react';
import { cn } from '../utils';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    <Loader2
      className={cn(
        'animate-spin text-cinema-accent',
        {
          'w-4 h-4': size === 'sm',
          'w-6 h-6': size === 'md',
          'w-8 h-8': size === 'lg',
        },
        className
      )}
      aria-hidden
    />
  );
}

export function FullScreenSpinner() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-cinema-bg/90 z-50 backdrop-blur-sm"
      role="status"
      aria-label="Cargando"
    >
      <PageSpinner label="Cargando..." size="lg" />
    </div>
  );
}

interface PageSpinnerProps {
  label?: string;
  size?: SpinnerProps['size'];
  className?: string;
}

export function PageSpinner({ label = 'Cargando…', size = 'lg', className }: PageSpinnerProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-4 py-16', className)}
      role="status"
      aria-label={label}
    >
      <Spinner size={size} />
      <p className="text-cinema-muted text-sm">{label}</p>
    </div>
  );
}
