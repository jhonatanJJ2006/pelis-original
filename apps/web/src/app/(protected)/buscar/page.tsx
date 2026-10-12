'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

const sections = [
  { href: '/movies', label: 'Películas' },
  { href: '/series', label: 'Series' },
  { href: '/anime', label: 'Anime' },
  { href: '/tv', label: 'TV en vivo' },
  { href: '/favorites', label: 'Mi lista' },
  { href: '/history', label: 'Historial' },
];

export default function BuscarPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/movies?search=${encodeURIComponent(q)}`);
  };

  return (
    <div className="container mx-auto px-4 py-12 md:py-20 max-w-4xl text-center">
      <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-cinema-accent/40 bg-cinema-accent/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cinema-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-cinema-accent" aria-hidden />
        Índice PELIS
      </p>
      <h1 className="font-display text-4xl md:text-6xl text-cinema-chalk mb-4">
        Búsqueda en la bóveda
      </h1>
      <p className="text-cinema-muted max-w-xl mx-auto mb-10">
        Explora películas, series, anime y canales en vivo.
      </p>
      <form onSubmit={onSubmit} role="search" className="relative mb-8 text-left">
        <Search
          className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-cinema-accent"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca películas, series, anime o canales"
          aria-label="Buscar en el catálogo"
          className="w-full h-16 rounded-[2px] border border-cinema-accent/60 bg-cinema-surface pl-14 pr-4 text-lg text-cinema-chalk placeholder:text-cinema-ash shadow-[0_0_40px_rgba(229,194,118,0.08)] focus:outline-none focus:border-cinema-accent focus:ring-1 focus:ring-cinema-accent/50 transition-colors"
        />
      </form>
      <h2 className="sr-only">Secciones</h2>
      <div className="flex flex-wrap justify-center gap-2">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="inline-flex h-9 items-center rounded-[2px] border border-cinema-border bg-cinema-surface px-4 text-xs font-semibold uppercase tracking-[0.12em] text-cinema-muted hover:border-cinema-accent hover:text-cinema-accent transition-colors"
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
