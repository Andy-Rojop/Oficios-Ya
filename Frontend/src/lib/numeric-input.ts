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

/**
 * Filtra un NIT de Guatemala mientras el usuario escribe:
 * - Solo dígitos en el cuerpo (7 a 9 dígitos habituales, tope 12)
 * - Un guión opcional antes del dígito verificador (0-9 o K en mayúscula)
 */
export function sanitizeNitInput(raw: string): string {
  const upper = raw.toUpperCase().replace(/[^0-9K-]/g, '');
  if (!upper) return '';

  // Solo se permite 'K' o '-' al final (en la posición del verificador)
  const parts = upper.split('-');
  const bodyDigits = (parts[0] ?? '').replace(/\D/g, '').slice(0, 9);

  if (parts.length > 1) {
    const verifier = parts
      .slice(1)
      .join('')
      .replace(/[^0-9K]/g, '')
      .slice(0, 1);
    return bodyDigits ? `${bodyDigits}-${verifier}` : '';
  }

  // Sin guión: dígitos seguidos opcionalmente de una K final
  const trailingK = (parts[0] ?? '').endsWith('K') ? 'K' : '';
  if (trailingK && bodyDigits.length >= 1) {
    return `${bodyDigits.slice(0, 8)}K`;
  }
  return bodyDigits;
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

/**
 * Valida un NIT de Guatemala:
 * - Entre 6 y 9 dígitos de base + guión opcional + verificador (0-9 o K)
 */
export function isValidGuatemalaNit(raw: string): boolean {
  const clean = raw.trim().toUpperCase();
  if (!clean) return true; // Es opcional
  if (!/^\d{5,9}-?[\dK]$/.test(clean)) return false;
  const onlyDigits = clean.replace(/\D/g, '');
  if (/^0+$/.test(onlyDigits)) return false;
  return true;
}
