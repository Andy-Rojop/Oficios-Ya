import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { WorkerServicesService } from './worker-services.service';
import { WorkersPublicController } from './workers-public.controller';
import { WorkersController } from './workers.controller';
import { WorkersService } from './workers.service';

/** RF-011 a RF-020 — Fase 2 */
@Module({
  imports: [StorageModule],
  // El orden importa: las rutas /workers/me/* deben registrarse antes que /workers/:id.
  controllers: [WorkersController, WorkersPublicController],
  providers: [WorkersService, WorkerServicesService],
  exports: [WorkersService],
})
export class WorkersModule {}
