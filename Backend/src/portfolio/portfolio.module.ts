import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { WorkersModule } from '../workers/workers.module';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

/** RF-021 a RF-028 — Fase 2 */
@Module({
  imports: [StorageModule, WorkersModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}
