import { GUATEMALA_PHONE_COUNTRY } from '../../shared';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Normaliza un teléfono de Guatemala a formato E.164 (+502XXXXXXXX).
 * Acepta formatos locales ("5555 1234") o internacionales ("+502 5555-1234").
 * Devuelve null si no es un número válido de Guatemala.
 */
export function normalizeGuatemalaPhone(input: unknown): string | null {
  if (typeof input !== 'string') {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parsePhoneNumberFromString(trimmed, GUATEMALA_PHONE_COUNTRY);
  if (!parsed || !parsed.isValid() || parsed.country !== GUATEMALA_PHONE_COUNTRY) {
    return null;
  }
  return parsed.number;
}

export function isValidGuatemalaPhone(input: unknown): boolean {
  return normalizeGuatemalaPhone(input) !== null;
}
