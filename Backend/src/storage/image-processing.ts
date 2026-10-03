import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { LIMITS } from '@oficiosya/shared';
import sharp from 'sharp';

/** Formatos aceptados (RNF-040). */
export const ALLOWED_IMAGE_FORMATS = ['jpeg', 'png', 'webp'] as const;
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const MESSAGE_INVALID_FORMAT = 'Formato de imagen no permitido. Usa JPG, PNG o WebP';

export interface ProcessedImage {
  buffer: Buffer;
  contentType: 'image/webp';
  width: number;
  height: number;
}

/**
 * Valida y normaliza una imagen subida:
 * - Máximo `maxBytes` (por defecto UPLOAD_MAX_MB).
 * - Solo JPG/PNG/WebP, detectado por el contenido real (no por la extensión ni el mimetype).
 * - Corrige la orientación EXIF, reduce a 1600 px como máximo, convierte a WebP y elimina EXIF.
 */
export async function processImage(input: Buffer, maxBytes: number): Promise<ProcessedImage> {
  if (!input || input.length === 0) {
    throw new BadRequestException('Adjunta una imagen');
  }
  if (input.length > maxBytes) {
    const maxMb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
    throw new PayloadTooLargeException(`La imagen supera el tamaño máximo de ${maxMb} MB`);
  }

  try {
    const image = sharp(input, { failOn: 'error' });
    const metadata = await image.metadata();
    if (
      !metadata.format ||
      !(ALLOWED_IMAGE_FORMATS as readonly string[]).includes(metadata.format)
    ) {
      throw new BadRequestException(MESSAGE_INVALID_FORMAT);
    }

    // rotate() aplica la orientación EXIF antes de descartar los metadatos.
    // sharp elimina por defecto EXIF/ICC/XMP al no llamar a withMetadata().
    const { data, info } = await image
      .rotate()
      .resize({
        width: LIMITS.IMAGE_MAX_DIMENSION_PX,
        height: LIMITS.IMAGE_MAX_DIMENSION_PX,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    return { buffer: data, contentType: 'image/webp', width: info.width, height: info.height };
  } catch (error) {
    if (error instanceof BadRequestException || error instanceof PayloadTooLargeException) {
      throw error;
    }
    throw new BadRequestException(
      'No se pudo leer la imagen. Verifica que sea un archivo JPG, PNG o WebP válido',
    );
  }
}
