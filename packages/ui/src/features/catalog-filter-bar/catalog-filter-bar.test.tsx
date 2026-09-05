import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatalogFilterBar } from './index';

const selects = [
  {
    id: 'genre',
    label: 'Género',
    value: '',
    onChange: vi.fn(),
    options: [
      { value: 'action', label: 'Acción' },
      { value: 'drama', label: 'Drama' },
    ],
    placeholder: 'Todos los géneros',
  },
  {
    id: 'year',
    label: 'Año',
    value: '',
    onChange: vi.fn(),
    options: [{ value: '2024', label: '2024' }],
    placeholder: 'Todos los años',
  },
];

function makeProps(overrides: Partial<Parameters<typeof CatalogFilterBar>[0]> = {}) {
  return {
    searchId: 'movies-search',
    searchLabel: 'Buscar películas',
    searchPlaceholder: 'Buscar por título',
    search: '',
    onSearchChange: vi.fn(),
    onClear: vi.fn(),
    selects: selects.map((s) => ({ ...s, onChange: vi.fn() })),
    ...overrides,
  };
}

describe('CatalogFilterBar', () => {
  it('renders the search input with an accessible label', () => {
    render(<CatalogFilterBar {...makeProps()} />);
    expect(screen.getByLabelText('Buscar películas')).toBeInTheDocument();
  });

  it('renders all selects', () => {
    render(<CatalogFilterBar {...makeProps()} />);
    expect(screen.getByLabelText('Género')).toBeInTheDocument();
    expect(screen.getByLabelText('Año')).toBeInTheDocument();
  });

  it('triggers onSearchChange while typing', async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<CatalogFilterBar {...props} />);
    await user.type(screen.getByLabelText('Buscar películas'), 'dune');
    expect(props.onSearchChange).toHaveBeenCalledTimes(4);
  });

  it('triggers select onChange when picking an option', async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<CatalogFilterBar {...props} />);
    await user.selectOptions(screen.getByLabelText('Género'), 'action');
    expect(props.selects[0].onChange).toHaveBeenCalledWith(expect.stringContaining('action'));
  });

  it('shows the clear button when showClear is enabled and invokes onClear', async () => {
    const user = userEvent.setup();
    const props = makeProps({ showClear: true });
    render(<CatalogFilterBar {...props} />);
    await user.click(screen.getByRole('button', { name: /limpiar/i }));
    expect(props.onClear).toHaveBeenCalled();
  });
});
