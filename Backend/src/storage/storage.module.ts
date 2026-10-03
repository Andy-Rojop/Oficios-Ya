import { Module } from '@nestjs/common';
import { ImageUploadInterceptor } from './image-upload.interceptor';
import { StorageService } from './storage.service';

/** Supabase Storage + sharp — Fase 2 (RNF-040) */
@Module({
  providers: [StorageService, ImageUploadInterceptor],
  exports: [StorageService, ImageUploadInterceptor],
})
export class StorageModule {}
