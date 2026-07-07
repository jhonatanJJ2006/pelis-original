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
    <div className={cn('flex items-end justify-between gap-4 mb-5 group', className)}>
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-cinema-accent to-cinema-violet rounded-full hidden sm:block" />
          <h2 className="font-display text-2xl md:text-3xl tracking-wide text-white uppercase">
            {title}
          </h2>
        </div>
        {subtitle && (
          <p className="text-sm text-zinc-400 mt-1 ml-0 sm:ml-4">{subtitle}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-sm font-medium text-cinema-gold hover:text-cinema-gold-light transition-all duration-300 shrink-0 group-hover:gap-2"
        >
          {linkLabel}
          <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
