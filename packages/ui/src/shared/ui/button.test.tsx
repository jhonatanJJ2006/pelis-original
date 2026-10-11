import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Hola</Button>);
    expect(screen.getByRole('button', { name: 'Hola' })).toBeInTheDocument();
  });

  it('applies the primary variant by default', () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-base', 'bg-cinema-accent');
  });

  it('applies the danger variant class', () => {
    render(<Button variant="danger">Eliminar</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-cinema-danger');
  });

  it('applies the gold variant class', () => {
    render(<Button variant="gold">Premium</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-cinema-accent');
  });

  it('applies the small size class', () => {
    render(<Button size="sm">Pequeño</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-9');
  });

  it('merges custom className with variant classes', () => {
    render(<Button className="custom-class">Mixto</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class', 'bg-cinema-accent');
  });

  it('fires onClick handlers', async () => {
    const user = userEvent.setup();
    const onClick = () => ({});
    const spy = () => {};
    let called = false;
    render(
      <Button
        onClick={() => {
          called = true;
        }}
      >
        Click
      </Button>
    );
    await user.click(screen.getByRole('button'));
    expect(called).toBe(true);
  });
});
