import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EnvConfig } from '../config/env.validation';
import { processImage } from './image-processing';

export type StorageBucketKind = 'public' | 'private';

const SIGNED_URL_MAX_TTL_SECONDS = 60 * 60 * 24;

/** Supabase Storage + sharp (RNF-040). Solo se sube desde la API (multipart), nunca desde el cliente. */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: SupabaseClient | null = null;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  /** Máximo de bytes por imagen (UPLOAD_MAX_MB, por defecto 5). */
  get maxUploadBytes(): number {
    const maxMb = this.config.get('UPLOAD_MAX_MB', { infer: true }) ?? 5;
    return Math.floor(maxMb * 1024 * 1024);
  }

  private get publicBucket(): string {
    return this.config.get('SUPABASE_PUBLIC_BUCKET', { infer: true }) ?? 'public-media';
  }

  private get privateBucket(): string {
    return this.config.get('SUPABASE_PRIVATE_BUCKET', { infer: true }) ?? 'chat-media';
  }

  private bucketName(kind: StorageBucketKind): string {
    return kind === 'public' ? this.publicBucket : this.privateBucket;
  }

  private get supabaseUrl(): string {
    return (this.config.get('SUPABASE_URL', { infer: true }) ?? '').replace(/\/+$/, '');
  }

  isConfigured(): boolean {
    return Boolean(
      this.supabaseUrl && this.config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true }),
    );
  }

  /** Crea los buckets si faltan (best-effort: nunca impide arrancar la API). */
  onModuleInit(): void {
    if (!this.isConfigured()) {
      this.logger.warn(
        'Supabase Storage no está configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY): las subidas devolverán 503',
      );
      return;
    }
    void this.ensureBuckets();
  }

  private async ensureBuckets(): Promise<void> {
    try {
      const client = this.getClient();
      const { data, error } = await client.storage.listBuckets();
      if (error) {
        throw error;
      }
      const existing = new Set((data ?? []).map((bucket) => bucket.name));
      const wanted: { name: string; isPublic: boolean }[] = [
        { name: this.publicBucket, isPublic: true },
        { name: this.privateBucket, isPublic: false },
      ];
      for (const bucket of wanted) {
        if (existing.has(bucket.name)) continue;
        const { error: createError } = await client.storage.createBucket(bucket.name, {
          public: bucket.isPublic,
        });
        if (createError) {
          throw createError;
        }
        this.logger.log(
          `Bucket "${bucket.name}" creado (${bucket.isPublic ? 'público' : 'privado'})`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo verificar los buckets de Storage: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private getClient(): SupabaseClient {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'El almacenamiento de archivos no está disponible en este momento',
      );
    }
    if (!this.client) {
      this.client = createClient(
        this.supabaseUrl,
        this.config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true }),
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
    }
    return this.client;
  }

  /** Normaliza la ruta: sin "..", sin "/" inicial y con extensión .webp (todo se convierte a WebP). */
  private normalizePath(path: string): string {
    const segments = path.split('/').filter((segment) => segment.length > 0);
    if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) {
      throw new InternalServerErrorException('Ruta de archivo inválida');
    }
    const joined = segments.join('/');
    return joined.replace(/\.[A-Za-z0-9]+$/, '') + '.webp';
  }

  private async upload(kind: StorageBucketKind, buffer: Buffer, path: string): Promise<string> {
    const processed = await processImage(buffer, this.maxUploadBytes);
    const finalPath = this.normalizePath(path);
    const { error } = await this.getClient()
      .storage.from(this.bucketName(kind))
      .upload(finalPath, processed.buffer, {
        contentType: processed.contentType,
        upsert: false,
        cacheControl: kind === 'public' ? '31536000' : '3600',
      });
    if (error) {
      this.logger.error(`Fallo al subir "${finalPath}" a Storage: ${error.message}`);
      throw new ServiceUnavailableException('No se pudo guardar la imagen. Inténtalo de nuevo');
    }
    return finalPath;
  }

  /** Valida, procesa (1600 px, WebP, sin EXIF) y sube al bucket público. Devuelve la ruta final. */
  uploadPublic(buffer: Buffer, path: string): Promise<string> {
    return this.upload('public', buffer, path);
  }

  /** Igual que uploadPublic pero en el bucket privado (chat). Devuelve la ruta final. */
  uploadPrivate(buffer: Buffer, path: string): Promise<string> {
    return this.upload('private', buffer, path);
  }

  /** URL pública estable de un objeto del bucket público (se calcula sin llamar a la red). */
  getPublicUrl(path: string): string {
    const encoded = path.split('/').map(encodeURIComponent).join('/');
    return `${this.supabaseUrl}/storage/v1/object/public/${encodeURIComponent(this.publicBucket)}/${encoded}`;
  }

  /** URL firmada temporal para un objeto del bucket privado. */
  async getSignedUrl(path: string, ttlSeconds: number): Promise<string> {
    const ttl = Math.min(Math.max(Math.floor(ttlSeconds), 1), SIGNED_URL_MAX_TTL_SECONDS);
    const { data, error } = await this.getClient()
      .storage.from(this.privateBucket)
      .createSignedUrl(path, ttl);
    if (error || !data) {
      this.logger.error(`Fallo al firmar "${path}": ${error?.message ?? 'sin datos'}`);
      throw new ServiceUnavailableException('No se pudo obtener el archivo. Inténtalo de nuevo');
    }
    return data.signedUrl;
  }

  /** Elimina un objeto (bucket público por defecto). No falla si el objeto ya no existe. */
  async deleteObject(path: string, kind: StorageBucketKind = 'public'): Promise<void> {
    const { error } = await this.getClient().storage.from(this.bucketName(kind)).remove([path]);
    if (error) {
      this.logger.error(`Fallo al eliminar "${path}" de Storage: ${error.message}`);
      throw new ServiceUnavailableException('No se pudo eliminar el archivo. Inténtalo de nuevo');
    }
  }

  /** Eliminación best-effort (limpieza tras un fallo o al borrar registros): nunca lanza. */
  async deleteObjectSilently(path: string, kind: StorageBucketKind = 'public'): Promise<void> {
    try {
      await this.deleteObject(path, kind);
    } catch {
      // ya se registró en deleteObject
    }
  }
}
