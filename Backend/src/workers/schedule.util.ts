import { BadRequestException } from '@nestjs/common';
import {
  SCHEDULE_DAYS,
  type ScheduleDto,
  type StoredSchedule,
  type StoredVisibleChannels,
  type VisibleChannelsDto,
} from './dto/schedule.dto';

const DAY_LABELS: Record<(typeof SCHEDULE_DAYS)[number], string> = {
  mon: 'lunes',
  tue: 'martes',
  wed: 'miércoles',
  thu: 'jueves',
  fri: 'viernes',
  sat: 'sábado',
  sun: 'domingo',
};

/** Convierte el DTO validado al JSON que se guarda: un día abierto exige "from" < "to". */
export function normalizeSchedule(schedule: ScheduleDto): StoredSchedule {
  const result: StoredSchedule = {};
  for (const day of SCHEDULE_DAYS) {
    const value = schedule[day];
    if (!value) continue;

    if (value.closed) {
      result[day] = { closed: true };
      continue;
    }
    if (!value.from || !value.to) {
      throw new BadRequestException(
        `Indique la hora de inicio y de fin para el ${DAY_LABELS[day]}, o márquelo como cerrado`,
      );
    }
    if (value.from >= value.to) {
      throw new BadRequestException(
        `La hora de inicio debe ser anterior a la hora de fin el ${DAY_LABELS[day]}`,
      );
    }
    result[day] = { closed: false, from: value.from, to: value.to };
  }
  return result;
}

export function normalizeVisibleChannels(channels: VisibleChannelsDto): StoredVisibleChannels {
  return {
    phone: channels.phone === true,
    whatsapp: channels.whatsapp === true,
    email: channels.email === true,
  };
}

/** Lee de forma segura el JSON `schedule` guardado (puede venir de datos antiguos o ajenos). */
export function readStoredSchedule(value: unknown): StoredSchedule | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const source = value as Record<string, unknown>;
  const result: StoredSchedule = {};
  for (const day of SCHEDULE_DAYS) {
    const entry = source[day];
    if (typeof entry !== 'object' || entry === null) continue;
    const { closed, from, to } = entry as Record<string, unknown>;
    if (typeof closed !== 'boolean') continue;
    result[day] =
      closed || typeof from !== 'string' || typeof to !== 'string'
        ? { closed: true }
        : { closed: false, from, to };
  }
  return Object.keys(result).length > 0 ? result : null;
}

/** Lee de forma segura el JSON `visibleChannels` guardado. Por defecto no se muestra ningún canal. */
export function readStoredVisibleChannels(value: unknown): StoredVisibleChannels {
  const source =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  return {
    phone: source.phone === true,
    whatsapp: source.whatsapp === true,
    email: source.email === true,
  };
}
