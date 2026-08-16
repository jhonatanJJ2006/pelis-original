'use client';

import { useQuery } from '@pelis/db/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Search, Film, Tv, TrendingUp, Loader2, X, User, Sparkles } from 'lucide-react';
import { api } from '@pelis/db/api';
import { cn } from '@pelis/ui/utils';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import type { MediaItem } from '@pelis/ui/types';

interface SearchDropdownProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  className?: string;
  placeholder?: string;
  id?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function SearchDropdown({
  value,
  onChange,
  onSubmit,
  inputRef,
  className,
  placeholder = 'Buscar por título o actor...',
  id = 'search-dropdown',
}: SearchDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(value, 300);
  const hasQuery = debouncedQuery.trim().length > 0;
  const trimmedQuery = debouncedQuery.trim().toLowerCase();

  const results = useQuery(
    api.movies.search,
    hasQuery ? { q: debouncedQuery.trim(), limit: 8 } : 'skip'
  ) as MediaItem[] | undefined;

  const animeResults = useQuery(
    api.anime.search,
    hasQuery ? { query: debouncedQuery.trim(), limit: 5 } : 'skip'
  ) as Array<{ _id: string; title: string; image: string; year: number; genre: string[] }> | undefined;

  type SearchResult =
    | { type: 'movie'; item: MediaItem }
    | { type: 'anime'; item: { _id: string; title: string; image: string; year: number; genre: string[] } };

  const combinedResults: SearchResult[] = [
    ...(results ?? []).map((item) => ({ type: 'movie' as const, item })),
    ...(animeResults ?? []).map((item) => ({ type: 'anime' as const, item })),
  ];

  const matchesByActor = (m: MediaItem): boolean => {
    if (!hasQuery) return false;
    if (m.name.toLowerCase().includes(trimmedQuery)) return false;
    return (m.actors ?? '').toLowerCase().includes(trimmedQuery);
  };

  const showDropdown = isOpen && hasQuery;
  const isLoading = showDropdown && (results === undefined || animeResults === undefined);
  const hasResults = showDropdown && combinedResults.length > 0;
  const noResults = showDropdown && results !== undefined && animeResults !== undefined && combinedResults.length === 0;

  useEffect(() => {
    if (hasQuery) {
      setIsOpen(true);
      setSelectedIndex(-1);
    }
  }, [hasQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigateTo = useCallback(
    (result: SearchResult) => {
      setIsOpen(false);
      onChange('');
      if (result.type === 'movie') {
        router.push(`/movies/${result.item._id}`);
      } else {
        router.push(`/anime/${result.item._id}`);
      }
    },
    [router, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || combinedResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < combinedResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : combinedResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && combinedResults[selectedIndex]) {
          navigateTo(combinedResults[selectedIndex]);
        } else {
          onSubmit(e as unknown as React.FormEvent);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const items = resultsRef.current.querySelectorAll<HTMLButtonElement>('[data-result-index]');
      items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <div ref={containerRef} className="relative w-full" role="combobox" aria-expanded={showDropdown} aria-haspopup="listbox">
      <form onSubmit={onSubmit} role="search" className="w-full relative">
        <label htmlFor={id} className="sr-only">{placeholder}</label>
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cinema-ash pointer-events-none"
          aria-hidden
        />
        <input
          ref={inputRef}
          id={id}
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!e.target.value) setIsOpen(false);
          }}
          onFocus={() => { if (value.trim()) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full h-11 bg-cinema-surface border border-cinema-border rounded-[10px] pl-10 text-sm text-white placeholder-cinema-ash',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
            value ? 'pr-10' : 'pr-4',
            'hover:border-cinema-silver/40 hover:bg-cinema-elevated/60',
            'focus:outline-none focus:ring-2 focus:ring-cinema-accent/50 focus:border-cinema-accent/60 focus:hover:bg-cinema-surface focus:hover:border-cinema-accent/60',
            'transition-all duration-200',
            showDropdown && 'rounded-b-none border-b-transparent'
          )}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={showDropdown ? 'search-results' : undefined}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
              if (typeof inputRef === 'object' && inputRef?.current) inputRef.current.focus();
            }}
            aria-label="Limpiar búsqueda"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-md text-cinema-ash hover:text-white hover:bg-cinema-elevated transition-colors duration-150 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden />
          </button>
        )}
      </form>

      {showDropdown && (
        <div
          ref={resultsRef}
          id="search-results"
          role="listbox"
          aria-label="Resultados de búsqueda"
          className={cn(
            'absolute top-full left-0 right-0 z-50',
            'bg-cinema-elevated border border-cinema-border border-t-0 rounded-b-[10px]',
            'shadow-[0_16px_40px_rgba(0,0,0,0.55)]',
            'overflow-hidden animate-slide-down'
          )}
        >
          {isLoading && (
            <div className="flex items-center justify-center gap-3 py-8 text-cinema-muted text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Buscando...</span>
            </div>
          )}

          {noResults && (
            <div className="flex flex-col items-center py-8 text-cinema-muted">
              <Search className="w-8 h-8 mb-2 opacity-50" aria-hidden />
              <p className="text-sm">No se encontraron resultados</p>
              <p className="text-xs text-cinema-ash mt-1">Prueba con otros términos</p>
            </div>
          )}

          {hasResults && (
            <div className="max-h-[70vh] overflow-y-auto">
              {combinedResults.map((result, index) => {
                if (result.type === 'movie') {
                  const movie = result.item;
                  const isActorMatch = matchesByActor(movie);
                  return (
                <button
                  key={`movie-${movie._id}`}
                  type="button"
                  role="option"
                  aria-selected={index === selectedIndex}
                  data-result-index={index}
                  onClick={() => navigateTo(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors duration-150',
                    index === selectedIndex
                      ? 'bg-cinema-violet/20'
                      : 'hover:bg-cinema-elevated/50'
                  )}
                >
                  <div className="w-10 h-14 shrink-0 rounded overflow-hidden bg-cinema-elevated">
                    <MoviePoster
                      src={movie.image}
                      alt={movie.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate leading-tight">
                      {movie.name}
                    </p>
                    <p className="text-xs text-cinema-silver mt-0.5 truncate">
                      {movie.actors}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {isActorMatch && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-cinema-gold bg-cinema-gold/10 px-1.5 py-0.5 rounded">
                          <User className="w-2.5 h-2.5" />
                          Coincide con actor
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[10px] text-cinema-ash bg-cinema-elevated/80 px-1.5 py-0.5 rounded">
                        {movie.mediaType === 'series' ? (
                          <><Tv className="w-2.5 h-2.5" /> Serie</>
                        ) : (
                          <><Film className="w-2.5 h-2.5" /> Película</>
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-cinema-ash bg-cinema-elevated/80 px-1.5 py-0.5 rounded">
                        <TrendingUp className="w-2.5 h-2.5" />
                        {movie.releaseYear}
                      </span>
                      <span className="ml-auto text-[10px] text-cinema-violet">{movie.classification}</span>
                    </div>
                  </div>
                </button>
                  );
                }

                const anime = result.item;
                return (
                  <button
                    key={`anime-${anime._id}`}
                    type="button"
                    role="option"
                    aria-selected={index === selectedIndex}
                    data-result-index={index}
                    onClick={() => navigateTo(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors duration-150',
                      index === selectedIndex
                        ? 'bg-cinema-violet/20'
                        : 'hover:bg-cinema-elevated/50'
                    )}
                  >
                    <div className="w-10 h-14 shrink-0 rounded overflow-hidden bg-cinema-elevated">
                      <img src={anime.image} alt={anime.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate leading-tight">{anime.title}</p>
                      <p className="text-xs text-cinema-silver mt-0.5 truncate">{anime.genre.slice(0, 2).join(', ')}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] text-cinema-ash bg-cinema-elevated/80 px-1.5 py-0.5 rounded">
                          <Sparkles className="w-2.5 h-2.5" /> Anime
                        </span>
                        <span className="text-[10px] text-cinema-ash">{anime.year}</span>
                      </div>
                    </div>
                  </button>
                );
              })}

              <div className="border-t border-cinema-border/50 px-3 py-2">
                <button
                  type="button"
                  onClick={(e) => {
                    onSubmit(e as unknown as React.FormEvent);
                    setIsOpen(false);
                  }}
                  className="w-full text-xs text-cinema-violet-light hover:text-cinema-teal transition-colors text-center"
                >
                  Ver todos los resultados para &ldquo;{value}&rdquo;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
