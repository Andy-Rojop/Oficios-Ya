import { ConflictException, HttpException, UnauthorizedException } from '@nestjs/common';
import { LIMITS } from '@oficiosya/shared';
import * as bcrypt from 'bcryptjs';
import type { OtpService } from '../otp/otp.service';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import type { TokenService } from './token.service';

// Nota: Jest corre en modo ESM (NestJS 12 es ESM), por eso no se usa el global `jest`.

type FakeUser = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  passwordHash: string;
  role: 'USER';
  activeMode: 'CLIENT';
  status: 'ACTIVE';
  zoneId: string | null;
  phoneVerifiedAt: Date | null;
  emailVerifiedAt: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
};

type UpdateArgs = {
  data: { failedLoginAttempts?: number | { increment: number }; lockedUntil?: Date | null };
};

const PHONE = '+50255551234';
const PASSWORD = 'correct-password';

function buildUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id: 'user-1',
    name: 'María López',
    phone: PHONE,
    email: null,
    passwordHash: bcrypt.hashSync(PASSWORD, 4),
    role: 'USER',
    activeMode: 'CLIENT',
    status: 'ACTIVE',
    zoneId: null,
    phoneVerifiedAt: new Date(),
    emailVerifiedAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let state: FakeUser;
  let sessionsCreated: number;
  let transactionCalls: number;
  let service: AuthService;
  let verifiedPhone: { uid: string; phoneNumber: string };

  beforeEach(() => {
    state = buildUser();
    sessionsCreated = 0;
    transactionCalls = 0;
    verifiedPhone = { uid: 'firebase-uid', phoneNumber: PHONE };

    const prisma = {
      user: {
        findUnique: async ({ where }: { where: { phone?: string; email?: string } }) => {
          if (where.phone && where.phone === state.phone) return { ...state };
          if (where.email && where.email === state.email) return { ...state };
          return null;
        },
        update: async ({ data }: UpdateArgs) => {
          const attempts = data.failedLoginAttempts;
          if (typeof attempts === 'object') {
            state.failedLoginAttempts += attempts.increment;
          } else if (typeof attempts === 'number') {
            state.failedLoginAttempts = attempts;
          }
          if (data.lockedUntil !== undefined) {
            state.lockedUntil = data.lockedUntil;
          }
          return { ...state };
        },
      },
      session: {
        create: async () => {
          sessionsCreated += 1;
          return {};
        },
      },
      zone: { findFirst: async () => null },
      $transaction: async () => {
        transactionCalls += 1;
        return state;
      },
    };

    const otp = {
      verifyFirebaseIdToken: async () => verifiedPhone,
      assertWithinRateLimit: async () => undefined,
      recordVerification: async () => undefined,
    };

    const tokens = {
      signAccessToken: async () => 'access-token',
      signRefreshToken: async () => 'refresh-token',
      hashToken: () => 'hash',
      newRefreshExpiry: () => new Date(Date.now() + 7 * 86_400_000),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      otp as unknown as OtpService,
      tokens as unknown as TokenService,
    );
  });

  describe('login', () => {
    it('devuelve la sesión con credenciales correctas y no expone passwordHash', async () => {
      const result = await service.login({ phone: PHONE, password: PASSWORD });

      expect(result.tokens).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
      expect(result.user.phone).toBe(PHONE);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(sessionsCreated).toBe(1);
    });

    it('rechaza una contraseña incorrecta con mensaje genérico', async () => {
      await expect(service.login({ phone: PHONE, password: 'wrong' })).rejects.toThrow(
        new UnauthorizedException('Teléfono o contraseña incorrectos'),
      );
      expect(state.failedLoginAttempts).toBe(1);
    });

    it('bloquea la cuenta tras 5 intentos fallidos', async () => {
      const max = LIMITS.LOGIN_MAX_FAILED_ATTEMPTS;
      expect(max).toBe(5);

      for (let attempt = 1; attempt < max; attempt++) {
        await expect(service.login({ phone: PHONE, password: 'wrong' })).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
      }
      expect(state.lockedUntil).toBeNull();

      // 5.º intento fallido: la cuenta queda bloqueada (423)
      const fifth = await service
        .login({ phone: PHONE, password: 'wrong' })
        .catch((e: unknown) => e);
      expect(fifth).toBeInstanceOf(HttpException);
      expect((fifth as HttpException).getStatus()).toBe(423);
      expect(state.lockedUntil).toBeInstanceOf(Date);
      expect(state.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

      // Aun con la contraseña correcta, mientras dure el bloqueo no se inicia sesión
      const blocked = await service
        .login({ phone: PHONE, password: PASSWORD })
        .catch((e: unknown) => e);
      expect(blocked).toBeInstanceOf(HttpException);
      expect((blocked as HttpException).getStatus()).toBe(423);
      expect(sessionsCreated).toBe(0);
    });

    it('limpia los intentos fallidos tras un login exitoso', async () => {
      state = buildUser({ failedLoginAttempts: 3 });

      await service.login({ phone: PHONE, password: PASSWORD });

      expect(state.failedLoginAttempts).toBe(0);
      expect(state.lockedUntil).toBeNull();
    });

    it('permite iniciar sesión cuando el bloqueo ya expiró', async () => {
      state = buildUser({ lockedUntil: new Date(Date.now() - 1000) });

      const result = await service.login({ phone: PHONE, password: PASSWORD });

      expect(result.tokens.accessToken).toBe('access-token');
      expect(state.lockedUntil).toBeNull();
    });
  });

  describe('register', () => {
    it('rechaza un teléfono que ya existe', async () => {
      await expect(
        service.register({
          firebaseIdToken: 'token',
          name: 'Otra Persona',
          password: 'password-123',
          zoneId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
          acceptTerms: true,
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(transactionCalls).toBe(0);
      expect(sessionsCreated).toBe(0);
    });
  });
});
