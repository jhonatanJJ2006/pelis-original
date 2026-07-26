'use client';

import { type ElementType, type ReactNode } from 'react';
import { cn } from '../../shared/utils';
import { useScrollReveal } from '../../shared/hooks/use-scroll-reveal';

type RevealVariant = 'fade-up' | 'fade-in' | 'scale-in' | 'slide-left';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms */
  delay?: number;
  variant?: RevealVariant;
  as?: ElementType;
  id?: string;
}

const variantHidden: Record<RevealVariant, string> = {
  'fade-up': 'opacity-0 translate-y-6',
  'fade-in': 'opacity-0',
  'scale-in': 'opacity-0 scale-[0.96]',
  'slide-left': 'opacity-0 -translate-x-4',
};

export function ScrollReveal({
  children,
  className,
  delay = 0,
  variant = 'fade-up',
  as: Component = 'div',
  id,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <Component
      ref={ref}
      id={id}
      className={cn(
        'motion-safe transition-[opacity,transform] duration-500 ease-out-expo',
        isVisible ? 'opacity-100 translate-x-0 translate-y-0 scale-100' : variantHidden[variant],
        className
      )}
      style={{ transitionDelay: isVisible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Component>
  );
}

interface StaggerRevealProps {
  children: ReactNode[];
  className?: string;
  itemClassName?: string;
  staggerMs?: number;
  variant?: RevealVariant;
}

/** Reveals children with orchestrated stagger on scroll */
export function StaggerReveal({
  children,
  className,
  itemClassName,
  staggerMs = 60,
  variant = 'fade-up',
}: StaggerRevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <div ref={ref} className={className}>
      {children.map((child, i) => (
        <div
          key={i}
          className={cn(
            'motion-safe transition-[opacity,transform] duration-500 ease-out-expo',
            isVisible
              ? 'opacity-100 translate-x-0 translate-y-0 scale-100'
              : variantHidden[variant],
            itemClassName
          )}
          style={{ transitionDelay: isVisible ? `${i * staggerMs}ms` : '0ms' }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
