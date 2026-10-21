import { z } from 'zod';

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 15;

export const PASSWORD_HINT =
  'Use entre 8 y 15 caracteres, combinando letras y números.';

export function passwordField(messagePrefix = 'La contraseña') {
  return z
    .string()
    .min(PASSWORD_MIN, `${messagePrefix} debe tener al menos ${PASSWORD_MIN} caracteres`)
    .max(PASSWORD_MAX, `${messagePrefix} no puede superar ${PASSWORD_MAX} caracteres`)
    .regex(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/, `${messagePrefix} debe incluir al menos una letra`)
    .regex(/\d/, `${messagePrefix} debe incluir al menos un número`);
}
