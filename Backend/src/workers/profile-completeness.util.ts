import { WORKER_STUB_DESCRIPTION, WORKER_STUB_HEADLINE } from '../users/worker-profile.stub';

export interface CompletenessInput {
  headline: string;
  description: string;
  experienceYears: number | null;
  mainCategoryId: string | null;
  schedule: unknown;
  zoneCount: number;
  activeServiceCount: number;
  portfolioCount: number;
}

export interface CompletenessItem {
  key: string;
  label: string;
  weight: number;
  done: boolean;
}

export interface ProfileCompleteness {
  /** 0-100 */
  percentage: number;
  complete: boolean;
  items: CompletenessItem[];
}

const MIN_DESCRIPTION_LENGTH = 30;

function hasSchedule(schedule: unknown): boolean {
  return typeof schedule === 'object' && schedule !== null && Object.keys(schedule).length > 0;
}

/** Checklist ponderado (suma 100) del perfil de un trabajador. Los textos del stub no cuentan. */
export function computeProfileCompleteness(input: CompletenessInput): ProfileCompleteness {
  const headline = input.headline.trim();
  const description = input.description.trim();

  const items: CompletenessItem[] = [
    {
      key: 'headline',
      label: 'Escribe tu oficio principal',
      weight: 15,
      done: headline.length >= 3 && headline !== WORKER_STUB_HEADLINE,
    },
    {
      key: 'description',
      label: 'Describe tu experiencia (mínimo 30 caracteres)',
      weight: 15,
      done: description.length >= MIN_DESCRIPTION_LENGTH && description !== WORKER_STUB_DESCRIPTION,
    },
    {
      key: 'mainCategory',
      label: 'Elige tu categoría principal',
      weight: 10,
      done: input.mainCategoryId !== null,
    },
    {
      key: 'zones',
      label: 'Indica al menos una zona de cobertura',
      weight: 15,
      done: input.zoneCount > 0,
    },
    {
      key: 'service',
      label: 'Publica al menos un servicio activo',
      weight: 20,
      done: input.activeServiceCount > 0,
    },
    {
      key: 'schedule',
      label: 'Define tu horario de atención',
      weight: 10,
      done: hasSchedule(input.schedule),
    },
    {
      key: 'portfolio',
      label: 'Sube al menos una foto de tus trabajos',
      weight: 10,
      done: input.portfolioCount > 0,
    },
    {
      key: 'experience',
      label: 'Indica tus años de experiencia',
      weight: 5,
      done: input.experienceYears !== null,
    },
  ];

  const percentage = items.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
  return { percentage, complete: percentage === 100, items };
}
