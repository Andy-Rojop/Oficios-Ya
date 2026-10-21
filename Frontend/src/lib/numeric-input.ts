/**
 * Utilidades de sanitización y validación de entradas numéricas:
 * - Precios / tarifas en quetzales (sin negativos, máx. 2 decimales, rango válido)
 * - Enteros positivos (años de experiencia, códigos OTP, teléfonos)
 * - DPI (13 dígitos numéricos de Guatemala) y NIT (dígitos con guión opcional y verificador 0-9 o K)
 */

export const MAX_VALID_PRICE_GTQ = 99_999.99;

/**
 * Filtra en vivo lo que escribe el usuario en un campo de precio:
 * - Elimina signos negativos (-), letras y símbolos
 * - Convierte coma en punto decimal
 * - Permite un solo punto y como máximo 2 decimales
 * - Limita la parte entera a 5 dígitos (hasta 99,999.99)
 */
export function sanitizeMoneyInput(raw: string, maxIntegerDigits = 5): string {
  const normalized = raw.replace(/,/g, '.').replace(/[^\d.]/g, '');
  if (!normalized) return '';

  const [intRaw = '', ...decimalParts] = normalized.split('.');
  // Quitar ceros a la izquierda innecesarios (ej. "005" -> "5"), conservando "0" si va seguido de "."
  const intTrimmed = intRaw.replace(/^0+(?=\d)/, '').slice(0, maxIntegerDigits);

  if (decimalParts.length === 0) {
    return intTrimmed;
  }

  const decimals = decimalParts.join('').slice(0, 2);
  const safeInt = intTrimmed === '' ? '0' : intTrimmed;
  return `${safeInt}.${decimals}`;
}

/**
 * Valida un precio obligatorio (servicios y cotizaciones):
 * - Mayor a 0 y hasta MAX_VALID_PRICE_GTQ
 * - Máximo 2 decimales
 */
export function parseValidPrice(
  raw: string,
  options: { allowZero?: boolean; max?: number } = {},
): number | null {
  const trimmed = raw.trim().replace(/,/g, '.');
  if (!trimmed) return null;
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(trimmed)) return null;

  const value = Number(trimmed);
  const max = options.max ?? MAX_VALID_PRICE_GTQ;
  if (!Number.isFinite(value)) return null;
  if (options.allowZero ? value < 0 : value <= 0) return null;
  if (value > max) return null;
  return value;
}

/** Filtra solo dígitos enteros con un largo máximo. */
export function sanitizeDigitsInput(raw: string, maxLength: number): string {
  return raw.replace(/\D/g, '').slice(0, maxLength);
}

/** Solo caracteres habituales de un correo, con tope de 80. */
export function sanitizeEmailInput(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9.@_+-]/g, '').slice(0, 80);
}

/** NIT de Guatemala: 9 dígitos seguidos, sin guiones ni espacios. */
export function sanitizeNitInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 9);
}

/**
 * Valida un DPI de Guatemala:
 * - Exactamente 13 dígitos numéricos (8 de CUI + 2 de departamento 01..22 + 2 de municipio)
 * - Rechaza secuencias repetidas inválidas como 0000000000000
 */
export function isValidGuatemalaDpi(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (!/^\d{13}$/.test(digits)) return false;
  if (/^(\d)\1{12}$/.test(digits)) return false;
  const dept = Number(digits.slice(9, 11));
  const muni = Number(digits.slice(11, 13));
  if (dept < 1 || dept > 22) return false;
  if (muni < 1 || muni > 40) return false;
  return true;
}

/** Valida un NIT de Guatemala: exactamente 9 dígitos, opcional. */
export function isValidGuatemalaNit(raw: string): boolean {
  const clean = raw.trim();
  if (!clean) return true;
  return /^\d{9}$/.test(clean) && !/^0+$/.test(clean);
}
