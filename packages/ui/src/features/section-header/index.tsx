import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../shared/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel = 'Ver todo',
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4 mb-5', className)}>
      <div>
        <h2 className="font-display text-2xl md:text-3xl tracking-wide text-white uppercase">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-sm font-medium text-cinema-gold hover:text-cinema-gold-light transition-colors shrink-0"
        >
          {linkLabel}
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
