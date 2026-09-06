import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Heart } from 'lucide-react';
import { EmptyState, ErrorState } from './index';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState icon={Heart} title="Sin favoritos" description="Aún no guardas nada" />);
    expect(screen.getByRole('heading', { name: 'Sin favoritos' })).toBeInTheDocument();
    expect(screen.getByText('Aún no guardas nada')).toBeInTheDocument();
  });

  it('renders an action link when actionHref is provided', () => {
    render(
      <EmptyState
        icon={Heart}
        title="Vacío"
        description="desc"
        actionLabel="Explorar"
        actionHref="/movies"
      />
    );
    const link = screen.getByRole('link', { name: 'Explorar' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/movies');
  });

  it('renders an action button when onAction is provided', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <EmptyState
        icon={Heart}
        title="Vacío"
        description="desc"
        actionLabel="Recargar"
        onAction={onAction}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Recargar' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('prefers the link over the action callback when both are provided', () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        icon={Heart}
        title="Vacío"
        description="desc"
        actionLabel="Explorar"
        actionHref="/movies"
        onAction={() => {}}
      />
    );
    const link = screen.getByRole('link', { name: 'Explorar' });
    expect(link).toBeInTheDocument();
    expect(link).toContainElement(screen.getByRole('button', { name: 'Explorar' }));
    expect(onAction).not.toHaveBeenCalled();
  });

  it('renders an error state with a retry action', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No se pudo cargar' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
