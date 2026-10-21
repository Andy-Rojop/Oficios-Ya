/** Evita nombres o descripciones que solo sean números, símbolos o letras repetidas. */
export function isCoherentText(raw: string, minLetters = 3): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const letters = trimmed.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) ?? [];
  if (letters.length < minLetters) return false;
  const compact = trimmed.replace(/\s+/g, '');
  if (/^(.)\1{4,}$/.test(compact)) return false;
  if (/^[0-9\s.,;:!?\-_/#+*]+$/.test(trimmed)) return false;
  return true;
}

export const COHERENT_TEXT_MESSAGE =
  'Escriba un texto claro, con palabras (no solo números ni símbolos).';
