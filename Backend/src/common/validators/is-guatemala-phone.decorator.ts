import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidGuatemalaPhone, normalizeGuatemalaPhone } from '../utils/phone.util';

/**
 * Valida un teléfono de Guatemala y lo normaliza a E.164 (+502XXXXXXXX)
 * antes de que llegue al servicio.
 */
export function IsGuatemalaPhone(validationOptions?: ValidationOptions) {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? (normalizeGuatemalaPhone(value) ?? value) : value,
    ),
    (target: object, propertyName: string | symbol) => {
      registerDecorator({
        name: 'isGuatemalaPhone',
        target: target.constructor,
        propertyName: propertyName as string,
        options: {
          message: 'El teléfono debe ser un número válido de Guatemala (+502)',
          ...validationOptions,
        },
        validator: {
          validate: (value: unknown) => isValidGuatemalaPhone(value),
        },
      });
    },
  );
}
