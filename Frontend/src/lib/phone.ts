import { GUATEMALA_PHONE_PREFIX } from '@/lib/shared';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Normaliza un teléfono de Guatemala a E.164 (+502XXXXXXXX).
 * Acepta "5555 1234", "5555-1234", "+502 5555 1234", "00502 5555 1234".
 * Devuelve null si no es un número válido de Guatemala.
 */
export function normalizeGuatemalaPhone(input: string | null | undefined): string | null {
  const trimmed = input?.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parsePhoneNumberFromString(trimmed, 'GT');
  if (!parsed || !parsed.isValid() || parsed.country !== 'GT') {
    return null;
  }
  return parsed.number;
}

export function isValidGuatemalaPhone(input: string | null | undefined): boolean {
  return normalizeGuatemalaPhone(input) !== null;
}

/** "+50255551234" -> "+502 5555 1234" (para mostrar en pantalla). */
export function formatPhoneDisplay(e164: string): string {
  if (e164.startsWith(GUATEMALA_PHONE_PREFIX)) {
    const local = e164.slice(GUATEMALA_PHONE_PREFIX.length);
    if (local.length === 8) {
      return `${GUATEMALA_PHONE_PREFIX} ${local.slice(0, 4)} ${local.slice(4)}`;
    }
  }
  return e164;
}
