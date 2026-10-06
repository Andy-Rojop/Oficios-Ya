import { PublicWorkerProfileDto } from './worker-profile-response.dto';
import type { PublicWorkerProfileSource } from './worker-profile-response.dto';

const toUrl = (path: string) => `https://cdn.test/${path}`;

/** Fila "sucia": además de lo público trae dpi, nit, passwordHash, etc., como podría devolver Prisma. */
function buildDirtySource(visibleChannels: unknown): PublicWorkerProfileSource {
  const row = {
    id: 'profile-1',
    userId: 'user-1',
    headline: 'Carpintero',
    description: 'Muebles a medida y reparaciones en El Asintal',
    experienceYears: 8,
    schedule: { mon: { closed: false, from: '08:00', to: '17:00' }, sun: { closed: true } },
    availability: 'AVAILABLE',
    visibleChannels,
    identityStatus: 'PENDING',
    dpi: '1234567890101',
    nit: '1234567-8',
    ratingAverage: { toNumber: () => 4.5 },
    ratingCount: 2,
    completedJobs: 3,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    user: {
      name: 'Juan Pérez',
      phone: '+50255551234',
      email: 'juan@example.com',
      passwordHash: '$2b$12$secret-hash',
      firebaseUid: 'firebase-secret',
      dpi: '9999999999999',
    },
    mainCategory: { id: 'cat-1', name: 'Carpintería', slug: 'carpinteria' },
    zones: [{ zone: { id: 'zone-1', name: 'Zona ejemplo centro', type: 'sector' } }],
    services: [
      {
        id: 'svc-1',
        categoryId: 'cat-1',
        category: { name: 'Carpintería' },
        name: 'Puertas',
        description: 'Reparación de puertas de madera',
        priceMode: 'FROM',
        priceAmount: { toNumber: () => 150 },
        priceUnit: 'VISIT',
        photos: ['workers/profile-1/services/svc-1/a.webp'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'svc-2',
        categoryId: 'cat-1',
        category: { name: 'Carpintería' },
        name: 'Servicio pausado',
        description: 'No debe aparecer en el perfil público',
        priceMode: 'NEGOTIABLE',
        priceAmount: null,
        priceUnit: 'JOB',
        photos: [],
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    portfolioItems: [
      {
        id: 'p-1',
        title: 'Closet',
        description: null,
        imagePath: 'workers/profile-1/portfolio/x.webp',
        createdAt: new Date(),
      },
    ],
  };
  return row as unknown as PublicWorkerProfileSource;
}

/** Todas las claves de un JSON, a cualquier profundidad. */
function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, nested]) => [key, ...collectKeys(nested)]);
  }
  return [];
}

describe('PublicWorkerProfileDto', () => {
  it('nunca incluye dpi, nit ni passwordHash, aunque la entrada los traiga', () => {
    const dto = PublicWorkerProfileDto.fromEntity(
      buildDirtySource({ phone: true, whatsapp: true, email: true }),
      toUrl,
      { includeContact: true },
    );
    const json = JSON.stringify(dto);

    const keys = collectKeys(JSON.parse(json));
    for (const forbidden of ['dpi', 'nit', 'passwordHash', 'firebaseUid', 'userId']) {
      expect(keys).not.toContain(forbidden);
    }
    expect(json).not.toContain('1234567890101');
    expect(json).not.toContain('9999999999999');
    expect(json).not.toContain('1234567-8');
    expect(json).not.toContain('secret');
  });

  it('oculta el teléfono, WhatsApp y correo cuando el trabajador no los muestra', () => {
    const dto = PublicWorkerProfileDto.fromEntity(
      buildDirtySource({ phone: false, whatsapp: false, email: false }),
      toUrl,
      { includeContact: true },
    );
    const json = JSON.stringify(dto);

    expect(dto.contact).toEqual({ phone: null, whatsapp: null, email: null });
    expect(json).not.toContain('+50255551234');
    expect(json).not.toContain('juan@example.com');
  });

  it('oculta el contacto por defecto cuando visibleChannels no está definido', () => {
    const dto = PublicWorkerProfileDto.fromEntity(buildDirtySource(null), toUrl, {
      includeContact: true,
    });
    expect(dto.contact).toEqual({ phone: null, whatsapp: null, email: null });
  });

  it('muestra solo los canales elegidos cuando hay sesión', () => {
    const dto = PublicWorkerProfileDto.fromEntity(
      buildDirtySource({ phone: true, whatsapp: false, email: false }),
      toUrl,
      { includeContact: true },
    );
    expect(dto.contact).toEqual({ phone: '+50255551234', whatsapp: null, email: null });
  });

  it('nunca expone contacto a invitados aunque el trabajador lo tenga visible', () => {
    const dto = PublicWorkerProfileDto.fromEntity(
      buildDirtySource({ phone: true, whatsapp: true, email: true }),
      toUrl,
    );
    const json = JSON.stringify(dto);
    expect(dto.contact).toEqual({ phone: null, whatsapp: null, email: null });
    expect(json).not.toContain('+50255551234');
    expect(json).not.toContain('juan@example.com');
  });

  it('solo lista servicios activos y resuelve las URLs de las fotos', () => {
    const dto = PublicWorkerProfileDto.fromEntity(buildDirtySource(null), toUrl);

    expect(dto.services).toHaveLength(1);
    expect(dto.services[0]?.priceAmount).toBe(150);
    expect(dto.services[0]?.photos).toEqual([
      'https://cdn.test/workers/profile-1/services/svc-1/a.webp',
    ]);
    expect(dto.portfolio[0]?.imageUrl).toBe('https://cdn.test/workers/profile-1/portfolio/x.webp');
    expect(dto.identityVerified).toBe(false);
    expect(dto.ratingAverage).toBe(4.5);
  });
});
