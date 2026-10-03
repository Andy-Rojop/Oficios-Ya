import { buildSearchWhere, haversineKm, resolveSort, splitTerms } from './search-query.util';

describe('buildSearchWhere', () => {
  it('siempre exige teléfono verificado y cuenta activa, aunque no haya filtros', () => {
    const where = buildSearchWhere({});
    expect(where.user).toEqual({ phoneVerifiedAt: { not: null }, status: 'ACTIVE' });
    expect(where.AND).toEqual([]);
  });

  it('mantiene el filtro de verificación al combinar todos los filtros', () => {
    const where = buildSearchWhere({
      q: 'plomero',
      categoryId: '11111111-1111-4111-8111-111111111111',
      zoneId: '22222222-2222-4222-8222-222222222222',
      minRating: 4,
      availability: 'AVAILABLE',
      priceMin: 50,
      priceMax: 300,
    });
    expect(where.user).toEqual({ phoneVerifiedAt: { not: null }, status: 'ACTIVE' });
    expect(where.AND).toHaveLength(6);
  });

  it('el filtro de precio incluye servicios a convenir', () => {
    const where = buildSearchWhere({ priceMin: 10, priceMax: 20 });
    const json = JSON.stringify(where.AND);
    expect(json).toContain('NEGOTIABLE');
    expect(json).toContain('"gte":10');
    expect(json).toContain('"lte":20');
  });

  it('cada palabra de q debe aparecer en titular, descripción, categoría o servicio', () => {
    const where = buildSearchWhere({ q: ' plomero  urgente ' });
    expect(where.AND).toHaveLength(2);
  });
});

describe('helpers', () => {
  it('splitTerms limita y limpia las palabras', () => {
    expect(splitTerms('  a b   c ')).toEqual(['a', 'b', 'c']);
    expect(splitTerms(undefined)).toEqual([]);
    expect(splitTerms('1 2 3 4 5 6 7')).toHaveLength(5);
  });

  it('resolveSort usa calificación si "near" no trae coordenadas', () => {
    expect(resolveSort({ sort: 'near' })).toBe('rating');
    expect(resolveSort({ sort: 'near', lat: 14.5, lng: -91.7 })).toBe('near');
    expect(resolveSort({})).toBe('rating');
  });

  it('haversineKm calcula distancias razonables', () => {
    expect(haversineKm(14.6, -90.5, 14.6, -90.5)).toBeCloseTo(0, 5);
    // ~111 km por grado de latitud
    expect(haversineKm(14, -90, 15, -90)).toBeGreaterThan(110);
    expect(haversineKm(14, -90, 15, -90)).toBeLessThan(112);
  });
});
