import { SearchWorkerCardDto } from './search-response.dto';
import type { SearchCardSource } from './search-response.dto';

const toUrl = (path: string) => `https://cdn.test/${path}`;

function buildDirtySource(): SearchCardSource {
  const row = {
    id: 'profile-1',
    userId: 'user-1',
    headline: 'Carpintero',
    description: 'Muebles a medida. '.repeat(30),
    availability: 'AVAILABLE',
    ratingAverage: { toNumber: () => 4.5 },
    ratingCount: 2,
    dpi: '1234567890101',
    nit: '1234567-8',
    user: {
      name: 'Juan Pérez',
      phone: '+50255551234',
      passwordHash: '$2b$12$secret-hash',
      dpi: '9999999999999',
    },
    mainCategory: { id: 'cat-1', name: 'Carpintería', slug: 'carpinteria' },
    zones: [
      {
        zone: {
          id: 'z1',
          name: 'Centro',
          latitude: { toNumber: () => 14.53 },
          longitude: { toNumber: () => -91.69 },
          address: 'Calle 5, casa 3',
        },
      },
      { zone: { id: 'z2', name: 'Sin coordenadas', latitude: null, longitude: null } },
    ],
    services: [
      {
        priceMode: 'FROM',
        priceAmount: { toNumber: () => 150 },
        priceUnit: 'VISIT',
        photos: ['svc/a.webp'],
      },
      { priceMode: 'FIXED', priceAmount: { toNumber: () => 90 }, priceUnit: 'JOB', photos: [] },
      { priceMode: 'NEGOTIABLE', priceAmount: null, priceUnit: 'JOB', photos: [] },
    ],
    portfolioItems: [{ imagePath: 'portfolio/x.webp' }],
  };
  return row as unknown as SearchCardSource;
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, nested]) => [key, ...collectKeys(nested)]);
  }
  return [];
}

describe('SearchWorkerCardDto', () => {
  it('nunca incluye dpi, nit, passwordHash, teléfono ni dirección', () => {
    const dto = SearchWorkerCardDto.fromEntity(buildDirtySource(), toUrl);
    const json = JSON.stringify(dto);
    const keys = collectKeys(JSON.parse(json));

    for (const forbidden of ['dpi', 'nit', 'passwordHash', 'phone', 'userId', 'address', 'email']) {
      expect(keys).not.toContain(forbidden);
    }
    for (const secret of [
      '1234567890101',
      '9999999999999',
      '1234567-8',
      'secret',
      '+50255551234',
      'Calle 5',
    ]) {
      expect(json).not.toContain(secret);
    }
  });

  it('elige el precio FIXED/FROM más barato y marca a convenir', () => {
    const dto = SearchWorkerCardDto.fromEntity(buildDirtySource(), toUrl);
    expect(dto.price).toEqual({ mode: 'FIXED', amount: 90, unit: 'JOB' });
    expect(dto.negotiable).toBe(true);
  });

  it('solo a convenir: sin precio y con la bandera negotiable', () => {
    const source = buildDirtySource();
    source.services = source.services.filter((service) => service.priceMode === 'NEGOTIABLE');
    const dto = SearchWorkerCardDto.fromEntity(source, toUrl);
    expect(dto.price).toBeNull();
    expect(dto.negotiable).toBe(true);
  });

  it('resume la descripción, convierte coordenadas y resuelve la foto del portafolio', () => {
    const dto = SearchWorkerCardDto.fromEntity(buildDirtySource(), toUrl, 1.234);
    expect(dto.description.length).toBeLessThanOrEqual(160);
    expect(dto.description.endsWith('…')).toBe(true);
    expect(dto.zones).toEqual([
      { id: 'z1', name: 'Centro', lat: 14.53, lng: -91.69 },
      { id: 'z2', name: 'Sin coordenadas', lat: null, lng: null },
    ]);
    expect(dto.photoUrl).toBe('https://cdn.test/portfolio/x.webp');
    expect(dto.distanceKm).toBe(1.234);
  });

  it('usa la foto de un servicio si no hay portafolio', () => {
    const source = buildDirtySource();
    source.portfolioItems = [];
    expect(SearchWorkerCardDto.fromEntity(source, toUrl).photoUrl).toBe(
      'https://cdn.test/svc/a.webp',
    );
  });
});
