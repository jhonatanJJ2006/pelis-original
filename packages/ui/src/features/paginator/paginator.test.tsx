import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Paginator, getPageCount, getPageWindow } from './index';

describe('Paginator', () => {
  it('calcula páginas y ventana con elipsis', () => {
    expect(getPageCount(0, 24)).toBe(1);
    expect(getPageCount(49, 24)).toBe(3);
    expect(getPageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(getPageWindow(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
  });

  it('cambia de página', () => {
    const onPageChange = vi.fn();
    window.scrollTo = vi.fn() as never;
    render(<Paginator page={1} total={60} pageSize={24} onPageChange={onPageChange} />);
    expect(screen.getByText(/Página 1 de 3/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Página siguiente'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
