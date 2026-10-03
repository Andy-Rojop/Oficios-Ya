import { PriceMode, PriceUnit } from './enums';

const UNIT_LABELS: Record<PriceUnit, string> = {
  [PriceUnit.JOB]: 'por trabajo',
  [PriceUnit.HOUR]: 'por hora',
  [PriceUnit.VISIT]: 'por visita',
  [PriceUnit.METER]: 'por metro',
};

function formatQuetzales(amount: number): string {
  const rounded = Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2);
  return `Q${rounded}`;
}

/**
 * Formatea el precio de referencia de un servicio (RF-015).
 * Ejemplos: "Q350 por trabajo", "Desde Q150 por visita", "A convenir".
 */
export function formatReferencePrice(
  mode: PriceMode,
  amount: number | null | undefined,
  unit: PriceUnit = PriceUnit.JOB,
): string {
  if (mode === PriceMode.NEGOTIABLE) {
    return 'A convenir';
  }

  if (amount == null || Number.isNaN(amount) || amount <= 0) {
    return 'A convenir';
  }

  const unitLabel = UNIT_LABELS[unit];
  const money = formatQuetzales(amount);

  if (mode === PriceMode.FROM) {
    return `Desde ${money} ${unitLabel}`;
  }

  return `${money} ${unitLabel}`;
}
