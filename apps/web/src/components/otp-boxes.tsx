'use client';

import { useRef } from 'react';

interface OtpBoxesProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

/** Entrada de código en 6 casillas: un input real transparente encima de las casillas visuales. */
export function OtpBoxes({ value, onChange, length = 6, disabled, autoFocus }: OtpBoxesProps) {
  const ref = useRef<HTMLInputElement>(null);
  const digits = value.split('');
  return (
    <div className="relative" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Código de 6 dígitos"
        maxLength={length}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
      <div className="flex justify-between gap-2" aria-hidden>
        {Array.from({ length }).map((_, i) => {
          const active = i === Math.min(value.length, length - 1);
          return (
            <div
              key={i}
              data-testid="otp-box"
              className={`flex h-14 w-full max-w-[52px] items-center justify-center rounded-[6px] border bg-cinema-bg font-display text-2xl text-cinema-chalk ${
                active ? 'border-cinema-accent' : 'border-cinema-border'
              }`}
            >
              {digits[i] ?? ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}
