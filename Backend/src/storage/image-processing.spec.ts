import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import sharp from 'sharp';
import { processImage } from './image-processing';

const MAX_BYTES = 5 * 1024 * 1024;

async function makeImage(format: 'jpeg' | 'png' | 'webp', width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: '#2f8f4e' } })
    .withExif({ IFD0: { Copyright: 'privado' } })
    .toFormat(format)
    .toBuffer();
}

describe('processImage', () => {
  it('reduce a 1600 px, convierte a WebP y elimina EXIF', async () => {
    const input = await makeImage('jpeg', 3200, 1600);
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const result = await processImage(input, MAX_BYTES);
    const metadata = await sharp(result.buffer).metadata();

    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(1600);
    expect(metadata.height).toBe(800);
    expect(metadata.exif).toBeUndefined();
  });

  it('no agranda imágenes pequeñas', async () => {
    const result = await processImage(await makeImage('png', 200, 100), MAX_BYTES);
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  it('rechaza formatos no permitidos', async () => {
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } })
      .gif()
      .toBuffer();
    await expect(processImage(gif, MAX_BYTES)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza archivos que no son imagen', async () => {
    await expect(processImage(Buffer.from('no soy una imagen'), MAX_BYTES)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza imágenes que superan el máximo', async () => {
    const input = await makeImage('png', 100, 100);
    await expect(processImage(input, 10)).rejects.toBeInstanceOf(PayloadTooLargeException);
  });
});
