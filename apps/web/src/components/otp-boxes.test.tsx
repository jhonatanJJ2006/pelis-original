import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OtpBoxes } from './otp-boxes';

describe('OtpBoxes', () => {
  it('muestra 6 casillas con los dígitos', () => {
    render(<OtpBoxes value="12" onChange={() => {}} />);
    const boxes = screen.getAllByTestId('otp-box');
    expect(boxes).toHaveLength(6);
    expect(boxes[0]!.textContent).toBe('1');
    expect(boxes[2]!.textContent).toBe('');
  });

  it('solo acepta dígitos y hasta 6', () => {
    const onChange = vi.fn();
    render(<OtpBoxes value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Código de 6 dígitos'), {
      target: { value: '12a3456789' },
    });
    expect(onChange).toHaveBeenCalledWith('123456');
  });
});
