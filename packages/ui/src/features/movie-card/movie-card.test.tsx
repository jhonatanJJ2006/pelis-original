import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Heart } from 'lucide-react';

vi.mock('@pelis/db/client', () => ({
  useMutation: () => vi.fn().mockResolvedValue(undefined),
  useQuery: () => false,
}));

vi.mock('@pelis/auth/hooks', () => ({
  useUser: () => ({ user: null }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { MovieCard } from './index';

const movie = {
  _id: 'm1',
  name: 'Dune: Parte Dos',
  image: '/posters/dune.jpg',
  genre: 'Ciencia ficción',
  classification: 'PG-13',
  releaseYear: '2024',
  synopsis: 'Paul Atreides se une a los Fremen.',
  token: 'dune',
  mediaType: 'movie' as const,
};

describe('MovieCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the movie name, genre, year and classification', () => {
    render(<MovieCard movie={movie} />);
    expect(screen.getByText('Dune: Parte Dos')).toBeInTheDocument();
    expect(screen.getByText('Ciencia ficción')).toBeInTheDocument();
    expect(screen.getByText('PG-13')).toBeInTheDocument();
    expect(screen.getAllByText('2024').length).toBeGreaterThan(0);
  });

  it('links to the movie detail page', () => {
    render(<MovieCard movie={movie} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/movies/m1');
  });

  it('shows the movie badge for movies and the series badge for series', () => {
    const { rerender } = render(<MovieCard movie={movie} />);
    expect(screen.getByText('Película')).toBeInTheDocument();

    rerender(
      <MovieCard movie={{ ...movie, _id: 's1', mediaType: 'series', episodes: 8 }} />
    );
    expect(screen.getByText('Serie')).toBeInTheDocument();
    expect(screen.getByText('8 episodios')).toBeInTheDocument();
  });

  it('shows the favorite button when showFavorite is true', () => {
    render(<MovieCard movie={movie} />);
    expect(screen.getByRole('button', { name: 'Agregar a favoritos' })).toBeInTheDocument();
  });

  it('hides the favorite button when showFavorite is false', () => {
    render(<MovieCard movie={movie} showFavorite={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});