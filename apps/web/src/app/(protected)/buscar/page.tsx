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
    <div className="container mx-auto px-4 py-10 md:py-16 max-w-4xl">
      <p className="text-label uppercase text-cinema-accent mb-2">Explorar</p>
      <h1 className="font-display text-4xl md:text-5xl text-cinema-chalk mb-8">
        Buscar en <span className="italic text-cinema-accent">PELIS</span>
      </h1>
      <form onSubmit={onSubmit} role="search" className="relative mb-10">
        <Search
          className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 text-cinema-accent"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca películas, series, anime o canales"
          aria-label="Buscar en el catálogo"
          className="w-full h-16 bg-transparent border-0 border-b border-cinema-border pl-10 pr-2 font-display text-2xl md:text-3xl text-cinema-chalk placeholder:text-cinema-ash focus:outline-none focus:border-cinema-accent transition-colors"
        />
      </form>
      <h2 className="text-label uppercase text-cinema-ash mb-3">Secciones</h2>
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="inline-flex h-9 items-center rounded-full border border-cinema-border bg-cinema-surface px-4 text-sm text-cinema-muted hover:border-cinema-accent hover:text-cinema-chalk transition-colors"
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
