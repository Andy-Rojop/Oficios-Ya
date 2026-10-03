import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { OtpModule } from '../otp/otp.module';
import { AuthCookieService } from './auth-cookie.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

/** RF-001 a RF-005, RF-008, RF-009, RF-070 */
@Module({
  imports: [PassportModule, JwtModule.register({}), OtpModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService, AuthCookieService, JwtStrategy],
  // JwtStrategy se exporta para que el chat (Socket.IO) reutilice la misma validación de sesión.
  exports: [AuthService, TokenService, AuthCookieService, JwtStrategy],
})
export class AuthModule {}
