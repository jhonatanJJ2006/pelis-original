import { afterEach, describe, expect, it } from 'vitest';
import {
  isConsumetProviderDown,
  markConsumetProviderDown,
  resetConsumetCircuit,
} from './consumet-client';

describe('circuit breaker de Consumet', () => {
  afterEach(() => resetConsumetCircuit());

  it('salta un proveedor caído durante 10 minutos', () => {
    const t0 = 1_000_000;
    expect(isConsumetProviderDown('zoro', t0)).toBe(false);
    markConsumetProviderDown('zoro', t0);
    expect(isConsumetProviderDown('zoro', t0 + 60_000)).toBe(true);
    expect(isConsumetProviderDown('animepahe', t0 + 60_000)).toBe(false);
    expect(isConsumetProviderDown('zoro', t0 + 10 * 60_000)).toBe(false);
  });
});
