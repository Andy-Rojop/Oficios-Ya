import { BadRequestException } from '@nestjs/common';
import { PriceMode } from '../generated/prisma/enums';
import { resolveServicePrice } from './service-pricing.util';

describe('resolveServicePrice', () => {
  it('NEGOTIABLE permite monto nulo o ausente', () => {
    expect(resolveServicePrice(PriceMode.NEGOTIABLE, null)).toBeNull();
    expect(resolveServicePrice(PriceMode.NEGOTIABLE, undefined)).toBeNull();
  });

  it('NEGOTIABLE descarta cualquier monto enviado', () => {
    expect(resolveServicePrice(PriceMode.NEGOTIABLE, 250)).toBeNull();
  });

  it.each([PriceMode.FIXED, PriceMode.FROM])('%s acepta un monto positivo', (mode) => {
    expect(resolveServicePrice(mode, 150)).toBe(150);
    expect(resolveServicePrice(mode, 99.5)).toBe(99.5);
  });

  it.each([PriceMode.FIXED, PriceMode.FROM])(
    '%s rechaza monto nulo, ausente, cero o negativo',
    (mode) => {
      for (const amount of [null, undefined, 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(() => resolveServicePrice(mode, amount)).toThrow(BadRequestException);
      }
    },
  );

  it('rechaza más de 2 decimales y montos fuera de rango', () => {
    expect(() => resolveServicePrice(PriceMode.FIXED, 10.123)).toThrow(BadRequestException);
    expect(() => resolveServicePrice(PriceMode.FIXED, 1_000_000_000)).toThrow(BadRequestException);
  });
});
