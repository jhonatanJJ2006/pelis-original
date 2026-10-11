import Link from 'next/link';
import { AlertTriangle, type LucideIcon } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import { cn } from '../../shared/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  tone?: 'default' | 'danger';
  role?: 'status' | 'alert';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  tone = 'default',
  role = 'status',
}: EmptyStateProps) {
  return (
    <div className="text-center py-16 md:py-24 px-4" role={role}>
      <div
        className={cn(
          'inline-flex items-center justify-center w-20 h-20 rounded-lg bg-cinema-surface mb-6',
          tone === 'danger'
            ? 'border border-cinema-danger/35 shadow-[0_4px_24px_rgba(139,30,45,0.12)]'
            : 'border border-cinema-accent/25 shadow-[0_4px_24px_rgba(196,163,90,0.08)]'
        )}
      >
        <Icon
          className={cn(
            'w-9 h-9',
            tone === 'danger' ? 'text-cinema-danger-light' : 'text-cinema-accent-light'
          )}
          aria-hidden
        />
      </div>
      <h3 className="font-display text-2xl md:text-3xl tracking-tight text-cinema-chalk mb-2">
        {title}
      </h3>
      <p className="text-cinema-muted max-w-md mx-auto mb-8">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button>{actionLabel}</Button>
        </Link>
      )}
      {actionLabel && onAction && !actionHref && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'No se pudo cargar',
  description = 'Revisa tu conexión e inténtalo de nuevo.',
  actionLabel = 'Reintentar',
  onRetry,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={AlertTriangle}
      tone="danger"
      role="alert"
      title={title}
      description={description}
      actionLabel={onRetry ? actionLabel : undefined}
      onAction={onRetry}
    />
  );
}
