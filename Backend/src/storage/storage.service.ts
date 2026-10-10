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
    void this.verifySharpRuntime();
    if (!this.isConfigured()) {
      this.logger.warn(
        'Supabase Storage no está configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY): las subidas devolverán 503',
      );
      return;
    }
    this.logger.log(
      `Storage listo: host=${this.supabaseHost()} buckets=${this.publicBucket},${this.privateBucket}`,
    );
    void this.ensureBuckets();
  }

  private supabaseHost(): string {
    try {
      return new URL(this.supabaseUrl).host;
    } catch {
      return '(url inválida)';
    }
  }

  private formatStorageError(error: unknown): string {
    if (!error || typeof error !== 'object') return String(error);
    const e = error as { message?: string; statusCode?: string | number; error?: string; name?: string };
    return JSON.stringify({
      message: e.message,
      statusCode: e.statusCode,
      error: e.error,
      name: e.name,
    });
  }

  private isBucketMissingError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const e = error as { message?: string; error?: string; statusCode?: string | number };
    const text = `${e.message ?? ''} ${e.error ?? ''}`.toLowerCase();
    return (
      text.includes('bucket not found') ||
      (text.includes('not found') && Number(e.statusCode) === 404)
    );
  }

  private async ensureBucket(kind: StorageBucketKind): Promise<void> {
    const name = this.bucketName(kind);
    const isPublic = kind === 'public';
    const { error } = await this.getClient().storage.createBucket(name, { public: isPublic });
    if (error && !this.isBucketMissingError(error)) {
      // "already exists" u otros: no bloquear si el bucket ya está
      const text = `${(error as { message?: string }).message ?? ''}`.toLowerCase();
      if (text.includes('already exists') || text.includes('duplicate')) return;
      throw error;
    }
    this.logger.log(`Bucket "${name}" asegurado (${isPublic ? 'público' : 'privado'})`);
  }

  /** Comprueba al arranque si el binario nativo de sharp carga (útil en logs de Railway). */
  private async verifySharpRuntime(): Promise<void> {
    try {
      const { default: sharpRuntime } = await import('sharp');
      const meta = await sharpRuntime({
        create: { width: 1, height: 1, channels: 3, background: '#000' },
      })
        .png()
        .toBuffer();
      this.logger.log(`sharp OK (${meta.length} bytes de prueba)`);
    } catch (error) {
      this.logger.error(
        `sharp NO disponible en este runtime: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
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
    let processed;
    try {
      processed = await processImage(buffer, this.maxUploadBytes);
    } catch (error) {
      if (
        error instanceof ServiceUnavailableException ||
        (error instanceof Error && /sharp|Could not load|libvips|dlopen|ERR_DLOPEN/i.test(error.message))
      ) {
        this.logger.error(
          `Fallo de sharp al procesar imagen (¿binario linux-x64/musl ausente?): ${
            error instanceof Error ? error.message : String(error)
          }`,
          error instanceof Error ? error.stack : undefined,
        );
        throw new ServiceUnavailableException('No se pudo guardar la imagen. Intente de nuevo');
      }
      throw error;
    }

    const finalPath = this.normalizePath(path);
    const bucket = this.bucketName(kind);
    try {
      await this.uploadToBucket(kind, finalPath, processed.buffer, processed.contentType);
      return finalPath;
    } catch (error) {
      if (this.isBucketMissingError(error)) {
        this.logger.warn(`Bucket "${bucket}" ausente; intentando crearlo y reintentar la subida`);
        try {
          await this.ensureBucket(kind);
          await this.uploadToBucket(kind, finalPath, processed.buffer, processed.contentType);
          return finalPath;
        } catch (retryError) {
          this.logger.error(
            `Reintento de subida a "${bucket}/${finalPath}" falló: ${this.formatStorageError(retryError)}`,
          );
          throw new ServiceUnavailableException(this.userMessageForStorageError(retryError));
        }
      }
      if (error instanceof ServiceUnavailableException || error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(
        `Fallo al subir "${finalPath}" a Storage (${bucket}): ${this.formatStorageError(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(this.userMessageForStorageError(error));
    }
  }

  private async uploadToBucket(
    kind: StorageBucketKind,
    finalPath: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    // Uint8Array evita fallos del SDK con Buffer en algunos runtimes Node.
    const body = new Uint8Array(buffer);
    const { error } = await this.getClient()
      .storage.from(this.bucketName(kind))
      .upload(finalPath, body, {
        contentType,
        upsert: false,
        cacheControl: kind === 'public' ? '31536000' : '3600',
      });
    if (error) {
      throw error;
    }
  }

  /** Mensaje seguro para el usuario según el error de Supabase Storage. */
  private userMessageForStorageError(error: unknown): string {
    const text = this.formatStorageError(error).toLowerCase();
    if (text.includes('bucket not found') || this.isBucketMissingError(error)) {
      return (
        `No existe el bucket de imágenes en Supabase (${this.publicBucket}). ` +
        'Créelo en Storage (público) o revise SUPABASE_PUBLIC_BUCKET en Railway.'
      );
    }
    if (
      text.includes('invalid api key') ||
      text.includes('invalid jwt') ||
      text.includes('jwt') ||
      text.includes('unauthorized') ||
      text.includes('not allowed') ||
      text.includes('403')
    ) {
      return (
        'Credenciales de Supabase Storage inválidas. ' +
        'En Railway use SUPABASE_SERVICE_ROLE_KEY (service_role), no la clave anon.'
      );
    }
    if (text.includes('fetch failed') || text.includes('enotfound') || text.includes('network')) {
      return (
        'No se pudo conectar con Supabase Storage. ' +
        'Verifique SUPABASE_URL en Railway (https://xxxx.supabase.co).'
      );
    }
    if (text.includes('payload too large') || text.includes('entity too large')) {
      return 'La imagen es demasiado grande. Use un archivo de máximo 5 MB.';
    }
    return 'No se pudo guardar la imagen. Intente de nuevo';
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
      throw new ServiceUnavailableException('No se pudo obtener el archivo. Inténtelo de nuevo');
    }
    return data.signedUrl;
  }

  /** Elimina un objeto (bucket público por defecto). No falla si el objeto ya no existe. */
  async deleteObject(path: string, kind: StorageBucketKind = 'public'): Promise<void> {
    const { error } = await this.getClient().storage.from(this.bucketName(kind)).remove([path]);
    if (error) {
      this.logger.error(`Fallo al eliminar "${path}" de Storage: ${error.message}`);
      throw new ServiceUnavailableException('No se pudo eliminar el archivo. Inténtelo de nuevo');
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
