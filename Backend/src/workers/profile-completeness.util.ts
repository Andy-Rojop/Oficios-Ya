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

  // Portafolio es opcional (QA Johan #11): no entra en el 100%.
  const items: CompletenessItem[] = [
    {
      key: 'oficio',
      label: 'Elija su oficio',
      weight: 20,
      done:
        (headline.length >= 3 && headline !== WORKER_STUB_HEADLINE) ||
        input.mainCategoryId !== null,
    },
    {
      key: 'description',
      label: 'Describa de manera breve a qué se dedica (mínimo 30 caracteres)',
      weight: 15,
      done: description.length >= MIN_DESCRIPTION_LENGTH && description !== WORKER_STUB_DESCRIPTION,
    },
    {
      key: 'zones',
      label: 'Indique la zona donde se ubica o trabaja',
      weight: 15,
      done: input.zoneCount > 0,
    },
    {
      key: 'service',
      label: 'Publique al menos un servicio activo',
      weight: 25,
      done: input.activeServiceCount > 0,
    },
    {
      key: 'schedule',
      label: 'Defina su horario de atención',
      weight: 15,
      done: hasSchedule(input.schedule),
    },
    {
      key: 'experience',
      label: 'Indique sus años de experiencia',
      weight: 10,
      done: input.experienceYears !== null,
    },
  ];

  const percentage = items.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
  return { percentage, complete: percentage === 100, items };
}
