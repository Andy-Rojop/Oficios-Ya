import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import multer from 'multer';
import type { Observable } from 'rxjs';
import { ALLOWED_IMAGE_MIME_TYPES, MESSAGE_INVALID_FORMAT } from './image-processing';
import { StorageService } from './storage.service';

/** Nombre del campo multipart que contiene la imagen. */
export const IMAGE_FIELD_NAME = 'file';

/** Imagen recibida por multipart (en memoria). */
export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

/**
 * Recibe una sola imagen por multipart (campo "file") en memoria, con el límite UPLOAD_MAX_MB.
 * Se implementa con multer directamente para leer el límite desde la configuración en tiempo de ejecución.
 */
@Injectable()
export class ImageUploadInterceptor implements NestInterceptor {
  private handler: ReturnType<ReturnType<typeof multer>['single']> | null = null;

  constructor(private readonly storage: StorageService) {}

  private getHandler(): ReturnType<ReturnType<typeof multer>['single']> {
    if (!this.handler) {
      this.handler = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: this.storage.maxUploadBytes, files: 1 },
        fileFilter: (_req, file, cb) => {
          if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
            cb(new BadRequestException(MESSAGE_INVALID_FORMAT));
            return;
          }
          cb(null, true);
        },
      }).single(IMAGE_FIELD_NAME);
    }
    return this.handler;
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const handler = this.getHandler();

    await new Promise<void>((resolve, reject) => {
      handler(request, response, (error?: unknown) => {
        if (error) {
          reject(this.toHttpError(error));
          return;
        }
        resolve();
      });
    });

    return next.handle();
  }

  private toHttpError(error: unknown): Error {
    if (error instanceof BadRequestException || error instanceof PayloadTooLargeException) {
      return error;
    }
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        const maxMb = Math.round((this.storage.maxUploadBytes / (1024 * 1024)) * 10) / 10;
        return new PayloadTooLargeException(`La imagen supera el tamaño máximo de ${maxMb} MB`);
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return new BadRequestException(`Envíe una sola imagen en el campo "${IMAGE_FIELD_NAME}"`);
      }
      return new BadRequestException('No se pudo procesar el archivo enviado');
    }
    if (error instanceof Error) {
      return error;
    }
    return new BadRequestException('No se pudo procesar el archivo enviado');
  }
}
