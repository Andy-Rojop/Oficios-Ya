import { ConflictException, ForbiddenException } from '@nestjs/common';
import { RequestStatus } from '../generated/prisma/enums';
import { allowedTargets, assertTransition } from './request-status.util';

const ALL = Object.values(RequestStatus);

describe('request-status.util', () => {
  describe('assertTransition', () => {
    it.each([
      ['SENT', 'ACCEPTED', 'WORKER'],
      ['SENT', 'REJECTED', 'WORKER'],
      ['SENT', 'CANCELLED', 'CLIENT'],
      ['ACCEPTED', 'IN_PROGRESS', 'WORKER'],
      ['ACCEPTED', 'CANCELLED', 'CLIENT'],
      ['ACCEPTED', 'CANCELLED', 'WORKER'],
      ['IN_PROGRESS', 'COMPLETED', 'WORKER'],
      ['IN_PROGRESS', 'COMPLETED', 'CLIENT'],
    ] as const)('permite %s -> %s para %s', (from, to, actor) => {
      expect(() => assertTransition(from, to, actor)).not.toThrow();
    });

    it.each([
      ['SENT', 'IN_PROGRESS'],
      ['SENT', 'COMPLETED'],
      ['ACCEPTED', 'COMPLETED'],
      ['ACCEPTED', 'REJECTED'],
      ['IN_PROGRESS', 'CANCELLED'],
      ['IN_PROGRESS', 'ACCEPTED'],
      ['COMPLETED', 'CANCELLED'],
      ['REJECTED', 'ACCEPTED'],
      ['CANCELLED', 'SENT'],
      ['SENT', 'SENT'],
    ] as const)('rechaza %s -> %s (transición inválida, 409) para ambos roles', (from, to) => {
      expect(() => assertTransition(from, to, 'WORKER')).toThrow(ConflictException);
      expect(() => assertTransition(from, to, 'CLIENT')).toThrow(ConflictException);
    });

    it('rechaza con 403 cuando la transición existe pero el rol no puede hacerla', () => {
      expect(() => assertTransition('SENT', 'ACCEPTED', 'CLIENT')).toThrow(ForbiddenException);
      expect(() => assertTransition('SENT', 'REJECTED', 'CLIENT')).toThrow(ForbiddenException);
      expect(() => assertTransition('SENT', 'CANCELLED', 'WORKER')).toThrow(ForbiddenException);
      expect(() => assertTransition('ACCEPTED', 'IN_PROGRESS', 'CLIENT')).toThrow(
        ForbiddenException,
      );
    });

    it('los estados finales no tienen salida', () => {
      for (const final of ['REJECTED', 'COMPLETED', 'CANCELLED'] as const) {
        for (const target of ALL) {
          expect(() => assertTransition(final, target, 'WORKER')).toThrow(ConflictException);
          expect(() => assertTransition(final, target, 'CLIENT')).toThrow(ConflictException);
        }
      }
    });
  });

  describe('allowedTargets', () => {
    it('lista lo que cada rol puede hacer', () => {
      expect(allowedTargets('SENT', 'WORKER').sort()).toEqual(['ACCEPTED', 'REJECTED']);
      expect(allowedTargets('SENT', 'CLIENT')).toEqual(['CANCELLED']);
      expect(allowedTargets('ACCEPTED', 'WORKER').sort()).toEqual(['CANCELLED', 'IN_PROGRESS']);
      expect(allowedTargets('ACCEPTED', 'CLIENT')).toEqual(['CANCELLED']);
      expect(allowedTargets('IN_PROGRESS', 'CLIENT')).toEqual(['COMPLETED']);
      expect(allowedTargets('COMPLETED', 'CLIENT')).toEqual([]);
    });
  });
});
