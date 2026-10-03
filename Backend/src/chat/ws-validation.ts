import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

/** Valida el payload de un evento Socket.IO con los mismos DTO/class-validator que HTTP. */
export async function parseWsPayload<T extends object>(
  cls: new () => T,
  payload: unknown,
): Promise<T> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new BadRequestException('Datos inválidos');
  }
  const instance = plainToInstance(cls, payload);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) {
    const first = errors[0];
    const message = Object.values(first?.constraints ?? {})[0] ?? 'Datos inválidos';
    throw new BadRequestException(message);
  }
  return instance;
}
