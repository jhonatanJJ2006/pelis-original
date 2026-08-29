'use client';

import { Heart, Search, Star, Tv, Play, Film, TrendingUp, X } from 'lucide-react';
import { Badge } from '@pelis/ui/components';
import { Button, Input, Select, Spinner, Skeleton } from '@pelis/ui/components';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { MovieCard } from '@pelis/ui/features/movie-card';
import { CatalogFilterBar } from '@pelis/ui/features/catalog-filter-bar';
import { SectionHeader } from '@pelis/ui/features/section-header';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import type { MediaItem } from '@pelis/ui/types';

const sampleMovies: MediaItem[] = [
  {
    _id: 'playground-movie-1',
    name: 'Dune: Parte Dos',
    image: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=600',
    synopsis: 'Paul Atreides se une a los Fremen para vengar a su familia.',
    genre: 'Ciencia ficción',
    token: 'dune-2',
    actors: 'Timothée Chalamet, Zendaya',
    classification: 'PG-13',
    releaseYear: '2024',
    mediaType: 'movie',
  },
  {
    _id: 'playground-series-1',
    name: 'The Last of Us',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
    synopsis: 'Una pandemia arrasa el mundo y Ellie y Joel cruzan un país devastado.',
    genre: 'Drama',
    token: 'last-of-us',
    actors: 'Pedro Pascal, Bella Ramsey',
    classification: 'R',
    releaseYear: '2023',
    mediaType: 'series',
    episodes: 9,
  },
  {
    _id: 'playground-movie-2',
    name: 'El Secreto de sus Ojos',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600',
    synopsis: 'Un jubilado decide escribir una novela sobre un caso que nunca resolvió.',
    genre: 'Thriller',
    token: 'secreto-ojos',
    actors: 'Ricardo Darín, Soledad Villamil',
    classification: 'R',
    releaseYear: '2009',
    mediaType: 'movie',
  },
];

function PlaygroundSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-cinema-border rounded-2xl p-6 bg-cinema-surface/50">
      <h2 className="font-display text-xl tracking-wide text-white uppercase mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function PlaygroundPage() {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="page-shell py-10 space-y-10">
      <div>
        <p className="text-cinema-violet-light text-sm font-medium uppercase tracking-widest mb-2">
          Dev
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase mb-2">
          Playground de componentes
        </h1>
        <p className="text-cinema-muted">
          Catálogo visual de todos los componentes UI con datos de ejemplo. Solo visible en
          desarrollo.
        </p>
      </div>

      <PlaygroundSection title="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primario</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Peligro</Button>
          <Button variant="gold">Premium</Button>
          <Button size="sm">Pequeño</Button>
          <Button size="lg">Grande</Button>
          <Button disabled>Deshabilitado</Button>
        </div>
      </PlaygroundSection>

      <PlaygroundSection title="Badges">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Default</Badge>
          <Badge variant="primary">Primario</Badge>
          <Badge variant="success">Éxito</Badge>
          <Badge variant="warning">Advertencia</Badge>
          <Badge variant="danger">Peligro</Badge>
          <Badge variant="violet">Violeta</Badge>
          <Badge className="bg-cinema-gold text-black border-0">
            <Tv className="w-3 h-3" /> Serie
          </Badge>
          <Badge variant="primary" className="gap-1">
            <Film className="w-3 h-3" /> Película
          </Badge>
        </div>
      </PlaygroundSection>

      <PlaygroundSection title="Inputs y selects">
        <div className="space-y-4 max-w-md">
          <Input placeholder="Buscar películas..." iconLeft={<Search className="w-[18px] h-[18px]" />} />
          <Input placeholder="Con botón limpiar" clearable defaultValue="algo escrito" />
          <Select aria-label="Género" defaultValue="">
            <option value="">Todos los géneros</option>
            <option value="action">Acción</option>
            <option value="drama">Drama</option>
            <option value="scifi">Ciencia ficción</option>
          </Select>
        </div>
      </PlaygroundSection>

      <PlaygroundSection title="Filtros de catálogo">
        <CatalogFilterBar
          searchId="playground-search"
          searchLabel="Buscar en el playground"
          searchPlaceholder="Buscar por título..."
          search=""
          onSearchChange={() => {}}
          onClear={() => {}}
          showClear
          selects={[
            {
              id: 'pg-genre',
              label: 'Género',
              value: '',
              onChange: () => {},
              options: [
                { value: 'action', label: 'Acción' },
                { value: 'drama', label: 'Drama' },
              ],
              placeholder: 'Todos los géneros',
            },
            {
              id: 'pg-year',
              label: 'Año',
              value: '',
              onChange: () => {},
              options: [{ value: '2024', label: '2024' }],
              placeholder: 'Todos los años',
            },
          ]}
        />
      </PlaygroundSection>

      <PlaygroundSection title="Tarjetas de película">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sampleMovies.map((movie) => (
            <MovieCard key={movie._id} movie={movie} showFavorite={false} />
          ))}
        </div>
      </PlaygroundSection>

      <PlaygroundSection title="Posters">
        <div className="flex flex-wrap gap-4">
          {sampleMovies.map((movie) => (
            <div key={movie._id} className="w-40">
              <MoviePoster src={movie.image} alt={movie.name} />
            </div>
          ))}
        </div>
      </PlaygroundSection>

      <PlaygroundSection title="Headers de sección">
        <div className="space-y-6">
          <SectionHeader title="Tendencias" />
          <SectionHeader
            title="Películas destacadas"
            subtitle="Lo mejor del catálogo"
            href="/movies"
            linkLabel="Ver todo"
          />
        </div>
      </PlaygroundSection>

      <PlaygroundSection title="Estados vacíos">
        <div className="space-y-4">
          <EmptyState
            icon={Heart}
            title="Sin favoritos"
            description="Toca el corazón en cualquier película para guardarla aquí."
            actionLabel="Explorar películas"
            actionHref="/movies"
          />
          <EmptyState
            icon={Star}
            title="Sin historial"
            description="Las películas que veas aparecerán aquí."
          />
        </div>
      </PlaygroundSection>

      <PlaygroundSection title="Spinners y skeletons">
        <div className="flex flex-wrap items-center gap-6">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
          <div className="w-32 space-y-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </PlaygroundSection>

      <PlaygroundSection title="Iconos">
        <div className="flex flex-wrap gap-4 text-cinema-muted">
          <Play className="w-6 h-6" />
          <Heart className="w-6 h-6" />
          <Search className="w-6 h-6" />
          <Star className="w-6 h-6" />
          <Tv className="w-6 h-6" />
          <Film className="w-6 h-6" />
          <TrendingUp className="w-6 h-6" />
          <X className="w-6 h-6" />
        </div>
      </PlaygroundSection>
    </div>
  );
}