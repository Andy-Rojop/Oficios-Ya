import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';

/** Verificación Firebase encapsulada (RNF-027). */
@Module({
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
