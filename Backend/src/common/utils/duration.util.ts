const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Convierte "15m", "7d", "30s", "2h" (o un número de segundos) a milisegundos. */
export function parseDurationToMs(value: string | number): number {
  if (typeof value === 'number') {
    return value * 1000;
  }
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (!match) {
    throw new Error(`Duración inválida: "${value}"`);
  }
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  return amount * (UNIT_MS[unit] ?? 1000);
}
