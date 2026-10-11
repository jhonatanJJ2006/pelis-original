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
    <div className={cn('flex items-end justify-between gap-4 mb-3 group', className)}>
      <div className="relative">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-row md:text-2xl font-semibold tracking-tight text-cinema-chalk">
            {title}
          </h2>
        </div>
        {subtitle && <p className="text-sm text-cinema-silver mt-1">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-sm font-medium text-cinema-accent hover:text-cinema-accent-light transition-all duration-200 shrink-0 group-hover:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/50 rounded px-1"
        >
          {linkLabel}
          <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
