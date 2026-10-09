import { BadRequestException } from '@nestjs/common';
import { PriceMode } from '../generated/prisma/enums';

/** Máximo permitido por la columna Decimal(10, 2). */
export const MAX_PRICE_AMOUNT = 99_999_999.99;

export const MESSAGE_PRICE_REQUIRED =
  'Indique un precio mayor a cero para precio fijo o "desde"; solo "a convenir" puede ir sin precio';

/**
 * RF-015: valida el precio de un servicio y devuelve el monto a guardar.
 * - NEGOTIABLE: el monto se descarta (null) aunque se envíe.
 * - FIXED / FROM: el monto es obligatorio, positivo y con máximo 2 decimales.
 */
export function resolveServicePrice(
  mode: PriceMode,
  amount: number | null | undefined,
): number | null {
  if (mode === PriceMode.NEGOTIABLE) {
    return null;
  }

  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestException(MESSAGE_PRICE_REQUIRED);
  }
  if (amount > MAX_PRICE_AMOUNT) {
    throw new BadRequestException('El precio es demasiado alto');
  }
  if (Math.round(amount * 100) / 100 !== amount) {
    throw new BadRequestException('El precio admite como máximo 2 decimales');
  }
  return amount;
}
