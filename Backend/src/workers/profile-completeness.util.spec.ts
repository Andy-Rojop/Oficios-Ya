import { WORKER_STUB_DESCRIPTION, WORKER_STUB_HEADLINE } from '../users/worker-profile.stub';
import { computeProfileCompleteness } from './profile-completeness.util';

describe('computeProfileCompleteness', () => {
  it('un perfil recién creado (stub) está en 0%', () => {
    const result = computeProfileCompleteness({
      headline: WORKER_STUB_HEADLINE,
      description: WORKER_STUB_DESCRIPTION,
      experienceYears: null,
      mainCategoryId: null,
      schedule: null,
      zoneCount: 0,
      activeServiceCount: 0,
      portfolioCount: 0,
    });
    expect(result.percentage).toBe(0);
    expect(result.complete).toBe(false);
  });

  it('un perfil completo está en 100% y los pesos suman 100', () => {
    const result = computeProfileCompleteness({
      headline: 'Carpintero',
      description: 'Más de diez años fabricando y reparando muebles en la región.',
      experienceYears: 10,
      mainCategoryId: 'cat-1',
      schedule: { mon: { closed: true } },
      zoneCount: 2,
      activeServiceCount: 1,
      portfolioCount: 3,
    });
    expect(result.percentage).toBe(100);
    expect(result.complete).toBe(true);
    expect(result.items.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
  });
});
