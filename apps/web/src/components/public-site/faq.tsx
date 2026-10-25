import { ChevronDown } from 'lucide-react';
import { cn } from '@pelis/ui/utils';

export interface FaqItem {
  q: string;
  a: string;
  webOnly?: boolean;
}

/** Acordeón sin JS (<details>), líneas finas PELIS. */
export function Faq({ items, className }: { items: FaqItem[]; className?: string }) {
  return (
    <div
      className={cn('divide-y divide-cinema-border/70 border-y border-cinema-border/70', className)}
    >
      {items.map((item) => (
        <details key={item.q} className={cn('group', item.webOnly && 'web-only')}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-base text-cinema-chalk transition-colors hover:text-cinema-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60 md:text-lg [&::-webkit-details-marker]:hidden">
            <span className="font-display">{item.q}</span>
            <ChevronDown
              className="h-5 w-5 shrink-0 text-cinema-accent transition-transform duration-200 group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="max-w-3xl pb-6 text-sm leading-relaxed text-cinema-silver md:text-base">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}
