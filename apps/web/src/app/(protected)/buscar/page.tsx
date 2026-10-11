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
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
      <p className="text-label uppercase text-cinema-accent mb-2">Explorar</p>
      <h1 className="font-display text-3xl md:text-4xl font-semibold text-cinema-chalk mb-6">
        Buscar
      </h1>
      <form onSubmit={onSubmit} role="search" className="relative mb-8">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cinema-ash"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Títulos, actores o géneros"
          aria-label="Buscar en el catálogo"
          className="input-field h-12 pl-12 text-[15px]"
        />
      </form>
      <h2 className="text-label uppercase text-cinema-ash mb-3">Secciones</h2>
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="inline-flex h-9 items-center rounded-full border border-cinema-border px-4 text-sm text-cinema-muted hover:border-cinema-accent hover:text-cinema-chalk transition-colors"
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
