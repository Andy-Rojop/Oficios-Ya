import { isValidGuatemalaPhone, normalizeGuatemalaPhone } from './phone.util';

describe('phone.util', () => {
  it('normaliza formatos locales e internacionales a E.164', () => {
    expect(normalizeGuatemalaPhone('5555 1234')).toBe('+50255551234');
    expect(normalizeGuatemalaPhone('+502 5555-1234')).toBe('+50255551234');
    expect(normalizeGuatemalaPhone('+50255551234')).toBe('+50255551234');
  });

  it('rechaza números inválidos o de otro país', () => {
    expect(normalizeGuatemalaPhone('123')).toBeNull();
    expect(normalizeGuatemalaPhone('+14155552671')).toBeNull();
    expect(normalizeGuatemalaPhone('')).toBeNull();
    expect(normalizeGuatemalaPhone(undefined)).toBeNull();
    expect(isValidGuatemalaPhone('abc')).toBe(false);
  });
});
