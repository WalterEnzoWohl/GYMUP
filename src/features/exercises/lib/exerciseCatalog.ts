import type { ExerciseData } from '@/shared/types/models';
import type {
  ExerciseCatalogEntry,
  ExerciseCatalogLocale,
  ExerciseCatalogLocalizedContent,
  ExerciseCatalogSummary,
} from '@/features/exercises/types';

const CATALOG_URL = '/exercises.json';

const GROUP_LABELS: Record<string, string> = {
  abductors: 'Abductores',
  abs: 'Core',
  adductors: 'Aductores',
  biceps: 'Bíceps',
  calves: 'Pantorrillas',
  cardio: 'Cardio',
  chest: 'Pecho',
  dorsals: 'Espalda',
  forearms: 'Antebrazos',
  full_body: 'Full body',
  glutes: 'Glúteos',
  hamstrings: 'Isquios',
  lower_back: 'Lumbar',
  neck: 'Cuello',
  quadriceps: 'Cuádriceps',
  shoulders: 'Hombros',
  traps: 'Trapecios',
  triceps: 'Tríceps',
  upper_back: 'Espalda alta',
};

const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Barra',
  bodyweight: 'Peso corporal',
  dumbbell: 'Mancuernas',
  kettlebell: 'Kettlebell',
  machine: 'Máquina',
  other: 'Otro',
  plate: 'Disco',
  resistance_band: 'Banda',
  suspension: 'Suspensión',
};

const MUSCLE_LABELS: Record<string, string> = {
  abdominals: 'Abdominales',
  abductors: 'Abductores',
  adductors: 'Aductores',
  biceps: 'Bíceps',
  calves: 'Pantorrillas',
  cardio: 'Cardio',
  deltoids: 'Deltoides',
  erector_spinae: 'Erectores espinales',
  forearms: 'Antebrazos',
  full_body: 'Full body',
  glutes: 'Glúteos',
  hamstrings: 'Isquios',
  latissimus_dorsi: 'Dorsales',
  neck: 'Cuello',
  other: 'Otro',
  pectoralis_major: 'Pecho',
  quadriceps: 'Cuádriceps',
  trapezius: 'Trapecios',
  triceps: 'Tríceps',
  upper_back: 'Espalda alta',
};

let catalogPromise: Promise<ExerciseCatalogSummary[]> | null = null;

function repairPotentialMojibake(value: string) {
  if (!/[ÃÂâ]/.test(value)) {
    return value;
  }

  const bytes = Array.from(value).map((character) => character.charCodeAt(0));
  if (bytes.some((byte) => byte > 255)) {
    return value;
  }

  const repaired = new TextDecoder().decode(Uint8Array.from(bytes));
  const originalNoise = (value.match(/[ÃÂâ]/g) ?? []).length;
  const repairedNoise = (repaired.match(/[ÃÂâ]/g) ?? []).length;

  return repairedNoise < originalNoise ? repaired : value;
}

function sanitizeCatalogObject<T>(value: T): T {
  if (typeof value === 'string') {
    return repairPotentialMojibake(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeCatalogObject(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeCatalogObject(nestedValue)])
    ) as T;
  }

  return value;
}

function humanizeCode(value?: string | null) {
  if (!value) {
    return '';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toPublicAssetPath(path?: string) {
  if (!path) {
    return undefined;
  }

  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
    return path;
  }

  return `/${path}`;
}

function getLocalizedContent(entry: ExerciseCatalogEntry, locale: ExerciseCatalogLocale) {
  return (
    entry.i18n[locale] ??
    entry.i18n.en ??
    ({
      title: entry.source?.original_title ?? humanizeCode(entry.slug),
      description: '',
      overview: '',
      instructions: [],
      tips: [],
      common_mistakes: [],
      benefits: [],
    } satisfies ExerciseCatalogLocalizedContent)
  );
}

function resolveNumericId(externalId: string, slug: string) {
  const numericId = Number.parseInt(externalId, 16);
  if (Number.isFinite(numericId)) {
    return numericId;
  }

  return Array.from(slug).reduce((total, character) => total + character.charCodeAt(0), 0);
}

export function buildExerciseCatalogSummary(
  entry: ExerciseCatalogEntry,
  locale: ExerciseCatalogLocale = 'es'
): ExerciseCatalogSummary {
  const localized = getLocalizedContent(entry, locale);
  const primaryGroupLabel = GROUP_LABELS[entry.primary_group] ?? humanizeCode(entry.primary_group);
  const secondaryMuscles = entry.secondary_muscles.map(
    (muscle) => MUSCLE_LABELS[muscle] ?? GROUP_LABELS[muscle] ?? humanizeCode(muscle)
  );
  const implement =
    EQUIPMENT_LABELS[entry.equipment[0] ?? ''] ??
    humanizeCode(entry.station_or_machine) ??
    humanizeCode(entry.equipment[0]) ??
    'Implemento';

  const searchText = [
    localized.title,
    localized.description,
    primaryGroupLabel,
    implement,
    entry.slug,
    ...(entry.primary_muscles ?? []),
    ...(entry.secondary_muscles ?? []),
    ...(entry.equipment ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return {
    id: resolveNumericId(entry.id, entry.slug),
    externalId: entry.id,
    slug: entry.slug,
    title: localized.title,
    description: localized.description,
    overview: localized.overview,
    instructions: localized.instructions ?? [],
    tips: localized.tips ?? [],
    commonMistakes: localized.common_mistakes ?? [],
    benefits: localized.benefits ?? [],
    muscle: primaryGroupLabel,
    secondaryMuscles,
    implement,
    primaryGroup: entry.primary_group,
    primaryMuscles: entry.primary_muscles ?? [],
    equipment: entry.equipment ?? [],
    stationOrMachine: entry.station_or_machine ?? undefined,
    gripOrStance: entry.grip_or_stance ?? undefined,
    movementPattern: entry.movement_pattern ?? undefined,
    mechanicType: entry.mechanic_type ?? undefined,
    difficulty: entry.difficulty ?? undefined,
    bodyweight: Boolean(entry.bodyweight || entry.equipment?.includes('bodyweight')),
    unilateral: Boolean(entry.unilateral),
    coverImageUrl: toPublicAssetPath(entry.media?.cover_image),
    animationMediaUrl: toPublicAssetPath(entry.media?.animation_media),
    animationMediaType: entry.media?.animation_media_type,
    searchText,
  };
}

export function buildExerciseTemplateFromCatalog(
  entry: ExerciseCatalogSummary,
  defaultSets = 3,
  defaultReps = 10
): ExerciseData {
  return {
    id: entry.id,
    exerciseSlug: entry.slug,
    name: entry.title,
    muscle: entry.muscle,
    implement: entry.implement,
    secondaryMuscles: entry.secondaryMuscles,
    notes: '',
    sets: Array.from({ length: defaultSets }, (_, index) => ({
      id: index + 1,
      kg: 0,
      reps: defaultReps,
      rpe: 0,
      completed: false,
      kind: 'normal',
    })),
  };
}

export async function loadExerciseCatalog(locale: ExerciseCatalogLocale = 'es') {
  if (!catalogPromise) {
    catalogPromise = fetch(CATALOG_URL)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('No pudimos cargar el catálogo de ejercicios.');
        }

        return response.json() as Promise<ExerciseCatalogEntry[]>;
      })
      .then((entries) =>
        sanitizeCatalogObject(entries)
          .filter((entry) => entry.is_active !== false)
          .map((entry) => buildExerciseCatalogSummary(entry, locale))
          .sort((a, b) => a.title.localeCompare(b.title, 'es'))
      );
  }

  return catalogPromise;
}
