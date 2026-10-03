import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LIMITS } from '../shared';
import * as bcrypt from 'bcryptjs';
import type { User } from '../generated/prisma/client';
import { AccountStatus, ActiveMode, VerificationPurpose } from '../generated/prisma/enums';
import { OtpService } from '../otp/otp.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { ensureWorkerProfileStub } from '../users/worker-profile.stub';
import { LOGIN_LOCK_MINUTES } from './auth.constants';
import type { AuthTokens } from './auth-cookie.service';
import type { ChangePhoneDto } from './dto/change-phone.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import { TokenService } from './token.service';

export interface AuthResult {
  user: UserResponseDto;
  tokens: AuthTokens;
}

const INVALID_CREDENTIALS = 'Teléfono o contraseña incorrectos';
const INVALID_SESSION = 'Tu sesión ya no es válida. Inicia sesión de nuevo';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
  ) {}

  // ---------------------------------------------------------------- RF-001 registro

  async register(dto: RegisterDto, userAgent?: string): Promise<AuthResult> {
    const { uid, phoneNumber } = await this.otpService.verifyFirebaseIdToken(dto.firebaseIdToken);
    await this.otpService.assertWithinRateLimit(phoneNumber);

    const existingPhone = await this.prisma.user.findUnique({ where: { phone: phoneNumber } });
    if (existingPhone) {
      throw new ConflictException('Este número de teléfono ya está registrado');
    }

    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existingEmail) {
        throw new ConflictException('Este correo electrónico ya está registrado');
      }
    }

    const zone = await this.prisma.zone.findFirst({ where: { id: dto.zoneId, active: true } });
    if (!zone) {
      throw new BadRequestException('La zona seleccionada no existe');
    }

    const passwordHash = await bcrypt.hash(dto.password, LIMITS.BCRYPT_COST);
    const startAsWorker = dto.startAsWorker === true;
    const now = new Date();

    let user: User;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            name: dto.name,
            phone: phoneNumber,
            phoneVerifiedAt: now,
            firebaseUid: uid,
            email: dto.email ?? null,
            passwordHash,
            zoneId: dto.zoneId,
            termsAcceptedAt: now,
            activeMode: startAsWorker ? ActiveMode.WORKER : ActiveMode.CLIENT,
          },
        });
        await this.otpService.recordVerification(
          { phone: phoneNumber, purpose: VerificationPurpose.REGISTER, userId: created.id },
          tx,
        );
        if (startAsWorker) {
          await ensureWorkerProfileStub(tx, created.id);
        }
        return created;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('El teléfono o correo electrónico ya está registrado');
      }
      throw error;
    }

    const tokens = await this.createSession(user, userAgent);
    return { user: UserResponseDto.fromEntity(user), tokens };
  }

  // ---------------------------------------------------------------- RF-002 login

  async login(dto: LoginDto, userAgent?: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });

    if (!user || user.status === AccountStatus.DELETED) {
      // Se hace una comparación falsa para que el tiempo de respuesta no revele si la cuenta existe.
      await bcrypt.compare(dto.password, await this.getDummyHash());
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw this.lockedException(user.lockedUntil);
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      await this.registerFailedAttempt(user.id);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (user.status === AccountStatus.SUSPENDED) {
      throw new ForbiddenException('Tu cuenta está suspendida. Contacta a soporte');
    }

    let current = user;
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      current = await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const tokens = await this.createSession(current, userAgent);
    return { user: UserResponseDto.fromEntity(current), tokens };
  }

  // ---------------------------------------------------------------- refresh / logout

  /** Rota el refresh token: el anterior deja de ser válido. */
  async refresh(refreshToken: string | undefined, userAgent?: string): Promise<AuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedException(INVALID_SESSION);
    }

    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException(INVALID_SESSION);
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.userId !== payload.sub
    ) {
      throw new UnauthorizedException(INVALID_SESSION);
    }

    // Token distinto al vigente => ya fue rotado (posible reutilización): se revoca la sesión.
    if (!this.tokenService.tokenMatchesHash(refreshToken, session.refreshTokenHash)) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(INVALID_SESSION);
    }

    if (session.user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException(INVALID_SESSION);
    }

    const newRefreshToken = await this.tokenService.signRefreshToken(session.userId, session.id);
    const rotated = await this.prisma.session.updateMany({
      where: { id: session.id, refreshTokenHash: session.refreshTokenHash, revokedAt: null },
      data: {
        refreshTokenHash: this.tokenService.hashToken(newRefreshToken),
        expiresAt: this.tokenService.newRefreshExpiry(),
        ...(userAgent ? { userAgent } : {}),
      },
    });
    if (rotated.count === 0) {
      throw new UnauthorizedException(INVALID_SESSION);
    }

    const accessToken = await this.tokenService.signAccessToken(session.user, session.id);
    return {
      user: UserResponseDto.fromEntity(session.user),
      tokens: { accessToken, refreshToken: newRefreshToken },
    };
  }

  /** Revoca la sesión del refresh token recibido. Nunca falla: el logout siempre debe poder completarse. */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    if (!payload) {
      return;
    }
    await this.prisma.session.updateMany({
      where: { id: payload.sid, userId: payload.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------- RF-004 recuperar contraseña

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const { phoneNumber } = await this.otpService.verifyFirebaseIdToken(dto.firebaseIdToken);
    await this.otpService.assertWithinRateLimit(phoneNumber);

    const user = await this.prisma.user.findUnique({ where: { phone: phoneNumber } });
    if (!user || user.status === AccountStatus.DELETED) {
      throw new NotFoundException('No existe una cuenta con este número de teléfono');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, LIMITS.BCRYPT_COST);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      });
      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      });
      await this.otpService.recordVerification(
        { phone: phoneNumber, purpose: VerificationPurpose.PASSWORD_RESET, userId: user.id },
        tx,
      );
    });
  }

  // ---------------------------------------------------------------- RF-005 cambiar teléfono

  async changePhone(
    userId: string,
    currentSessionId: string,
    dto: ChangePhoneDto,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException(INVALID_SESSION);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw this.lockedException(user.lockedUntil);
    }

    const passwordOk = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!passwordOk) {
      await this.registerFailedAttempt(user.id);
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    const { uid, phoneNumber } = await this.otpService.verifyFirebaseIdToken(dto.firebaseIdToken);
    if (phoneNumber === user.phone) {
      throw new BadRequestException('El nuevo número es igual al actual');
    }
    await this.otpService.assertWithinRateLimit(phoneNumber);

    const taken = await this.prisma.user.findUnique({ where: { phone: phoneNumber } });
    if (taken) {
      throw new ConflictException('Este número de teléfono ya está registrado');
    }

    const now = new Date();
    let updated: User;
    try {
      updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.user.update({
          where: { id: user.id },
          data: {
            phone: phoneNumber,
            firebaseUid: uid,
            phoneVerifiedAt: now,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });
        await tx.session.updateMany({
          where: { userId: user.id, revokedAt: null, id: { not: currentSessionId } },
          data: { revokedAt: now },
        });
        await this.otpService.recordVerification(
          { phone: phoneNumber, purpose: VerificationPurpose.PHONE_CHANGE, userId: user.id },
          tx,
        );
        return result;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Este número de teléfono ya está registrado');
      }
      throw error;
    }

    return UserResponseDto.fromEntity(updated);
  }

  // ---------------------------------------------------------------- me

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException(INVALID_SESSION);
    }
    return UserResponseDto.fromEntity(user);
  }

  // ---------------------------------------------------------------- helpers

  private async createSession(
    user: Pick<User, 'id' | 'role' | 'activeMode'>,
    userAgent?: string,
  ): Promise<AuthTokens> {
    const sessionId = randomUUID();
    const refreshToken = await this.tokenService.signRefreshToken(user.id, sessionId);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: this.tokenService.hashToken(refreshToken),
        userAgent: userAgent?.slice(0, 255) ?? null,
        expiresAt: this.tokenService.newRefreshExpiry(),
      },
    });

    const accessToken = await this.tokenService.signAccessToken(user, sessionId);
    return { accessToken, refreshToken };
  }

  /**
   * Suma un intento fallido; al llegar a LOGIN_MAX_FAILED_ATTEMPTS bloquea la cuenta
   * y reinicia el contador. Lanza la excepción de bloqueo cuando corresponde.
   */
  private async registerFailedAttempt(userId: string): Promise<void> {
    const { failedLoginAttempts } = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });

    if (failedLoginAttempts >= LIMITS.LOGIN_MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60_000);
      await this.prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: 0, lockedUntil },
      });
      throw this.lockedException(lockedUntil);
    }
  }

  private lockedException(lockedUntil: Date): HttpException {
    const minutes = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000));
    return new HttpException(
      `Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intenta de nuevo en ${minutes} minuto${minutes === 1 ? '' : 's'}`,
      HttpStatus.LOCKED,
    );
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= bcrypt.hash('oficiosya-dummy-password', LIMITS.BCRYPT_COST);
    return this.dummyHash;
  }
}
