import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../../shared/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="text-center py-16 md:py-24 px-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-cinema-surface border border-cinema-border mb-6 shadow-[0_4px_24px_rgba(139,92,246,0.1)]">
        <Icon className="w-9 h-9 text-cinema-violet-light" aria-hidden />
      </div>
      <h3 className="font-display text-2xl tracking-wide text-white uppercase mb-2">{title}</h3>
      <p className="text-cinema-muted max-w-md mx-auto mb-8">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button>{actionLabel}</Button>
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
