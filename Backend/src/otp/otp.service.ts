import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LIMITS } from '@oficiosya/shared';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { EnvConfig } from '../config/env.validation';
import type { Prisma } from '../generated/prisma/client';
import type { VerificationPurpose } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeGuatemalaPhone } from '../common/utils/phone.util';

const FIREBASE_APP_NAME = 'oficiosya-otp';
/** El ID token debe provenir de una verificación SMS reciente (evita reutilizar tokens viejos). */
const MAX_AUTH_AGE_SECONDS = 10 * 60;
const ONE_HOUR_MS = 60 * 60 * 1000;

export interface VerifiedFirebasePhone {
  uid: string;
  phoneNumber: string;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private firebaseApp?: App;

  constructor(
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Verifica un ID token de Firebase (Phone Auth) y devuelve uid + teléfono en E.164.
   * Lanza errores en español listos para el usuario.
   */
  async verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebasePhone> {
    const app = this.getFirebaseApp();

    let decoded: Awaited<ReturnType<ReturnType<typeof getAuth>['verifyIdToken']>>;
    try {
      decoded = await getAuth(app).verifyIdToken(idToken);
    } catch (error) {
      this.logger.warn(`Token de Firebase rechazado: ${(error as Error).message}`);
      throw new UnauthorizedException('El código de verificación es inválido o expiró');
    }

    const phoneNumber = normalizeGuatemalaPhone(decoded.phone_number);
    if (!phoneNumber) {
      throw new UnauthorizedException(
        'La verificación no corresponde a un número de teléfono válido de Guatemala',
      );
    }

    const authTime = typeof decoded.auth_time === 'number' ? decoded.auth_time : 0;
    if (Math.floor(Date.now() / 1000) - authTime > MAX_AUTH_AGE_SECONDS) {
      throw new UnauthorizedException('La verificación expiró. Solicita un nuevo código por SMS');
    }

    return { uid: decoded.uid, phoneNumber };
  }

  /** Máximo OTP_PER_PHONE_PER_HOUR verificaciones por teléfono por hora. */
  async assertWithinRateLimit(phone: string): Promise<void> {
    const since = new Date(Date.now() - ONE_HOUR_MS);
    const count = await this.prisma.phoneVerification.count({
      where: { phone, createdAt: { gte: since } },
    });

    if (count >= LIMITS.OTP_PER_PHONE_PER_HOUR) {
      throw new HttpException(
        'Demasiados intentos de verificación para este número. Intenta de nuevo en una hora',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Registra una verificación exitosa (contabiliza para el límite por hora). */
  async recordVerification(
    params: { phone: string; purpose: VerificationPurpose; userId?: string | null },
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<void> {
    await client.phoneVerification.create({
      data: {
        phone: params.phone,
        purpose: params.purpose,
        userId: params.userId ?? null,
      },
    });
  }

  private getFirebaseApp(): App {
    if (this.firebaseApp) {
      return this.firebaseApp;
    }

    const projectId = this.configService.get('FIREBASE_PROJECT_ID', { infer: true });
    const clientEmail = this.configService.get('FIREBASE_CLIENT_EMAIL', { infer: true });
    const rawKey = this.configService.get('FIREBASE_PRIVATE_KEY', { infer: true });

    if (!projectId || !clientEmail || !rawKey) {
      this.logger.error('Firebase Admin no está configurado (FIREBASE_* vacío)');
      throw new ServiceUnavailableException(
        'La verificación por SMS no está disponible en este momento',
      );
    }

    const privateKey = rawKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
    this.firebaseApp =
      getApps().find((app) => app.name === FIREBASE_APP_NAME) ??
      initializeApp(
        { credential: cert({ projectId, clientEmail, privateKey }) },
        FIREBASE_APP_NAME,
      );

    return this.firebaseApp;
  }
}
