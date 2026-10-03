import { describe, expect, it } from 'vitest';
import { PriceMode, PriceUnit } from './enums';
import { formatReferencePrice } from './format-price';

describe('formatReferencePrice', () => {
  it('formats FIXED prices', () => {
    expect(formatReferencePrice(PriceMode.FIXED, 350, PriceUnit.JOB)).toBe('Q350 por trabajo');
  });

  it('formats FROM prices', () => {
    expect(formatReferencePrice(PriceMode.FROM, 150, PriceUnit.VISIT)).toBe(
      'Desde Q150 por visita',
    );
  });

  it('formats NEGOTIABLE prices', () => {
    expect(formatReferencePrice(PriceMode.NEGOTIABLE, null)).toBe('A convenir');
  });
});
