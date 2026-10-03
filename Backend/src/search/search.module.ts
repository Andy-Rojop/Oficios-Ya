import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

/** RF-029 a RF-036 — Fase 3 */
@Module({
  imports: [StorageModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
