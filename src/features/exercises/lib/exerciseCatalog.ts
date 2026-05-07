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

const EQUIPMENT_TRANSLATIONS: Record<string, string> = {
  'Barbell': 'barra',
  'Bodyweight': 'peso corporal',
  'Cable': 'polea',
  'Dumbbell': 'mancuernas',
  'EZ Bar': 'barra EZ',
  'Kettlebell': 'kettlebell',
  'Machine': 'maquina',
  'Plate': 'disco',
  'Resistance Band': 'banda',
  'Smith Machine': 'smith',
  'Suspension': 'suspension',
  'Trap Bar': 'trap bar',
  'V Grip': 'agarre V',
  'Wide Grip': 'agarre amplio',
  'Close Grip': 'agarre cerrado',
};

const TITLE_OVERRIDES: Record<string, string> = {
  'around-the-world': 'Aperturas circulares',
  'band-pullaparts': 'Separacion con banda',
  'battle-ropes': 'Cuerdas de batalla',
  'butterfly-pec-deck': 'Contractora (pec deck)',
  'hack-squat-machine': 'Sentadilla hack (maquina)',
};

const TITLE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Incline Bench Press/gi, 'Press inclinado'],
  [/Decline Bench Press/gi, 'Press declinado'],
  [/Bench Press/gi, 'Press de banca'],
  [/Chest Press/gi, 'Press de pecho'],
  [/Arnold Press/gi, 'Press Arnold'],
  [/Overhead Press/gi, 'Press militar'],
  [/Shoulder Press/gi, 'Press de hombros'],
  [/Military Press/gi, 'Press militar'],
  [/Lat Pulldown/gi, 'Jalon al pecho'],
  [/Pulldown/gi, 'Jalon'],
  [/Pull Up/gi, 'Dominadas'],
  [/Chin Up/gi, 'Dominadas supinas'],
  [/Seated Cable Row/gi, 'Remo sentado en polea'],
  [/Seated Row/gi, 'Remo sentado'],
  [/Bent Over Row/gi, 'Remo inclinado'],
  [/T Bar Row/gi, 'Remo T'],
  [/Dumbbell Row/gi, 'Remo con mancuerna'],
  [/Rear Delt Reverse Fly/gi, 'Vuelo posterior'],
  [/Reverse Fly/gi, 'Vuelo posterior'],
  [/Lateral Raise/gi, 'Elevacion lateral'],
  [/Front Raise/gi, 'Elevacion frontal'],
  [/Bicep Curl/gi, 'Curl de biceps'],
  [/Hammer Curl/gi, 'Curl martillo'],
  [/Preacher Curl/gi, 'Curl predicador'],
  [/Concentration Curl/gi, 'Curl concentrado'],
  [/Drag Curl/gi, 'Curl drag'],
  [/Triceps Rope Pushdown/gi, 'Jalon de triceps con cuerda'],
  [/Triceps Pushdown/gi, 'Jalon de triceps'],
  [/Triceps Pressdown/gi, 'Jalon de triceps'],
  [/Triceps Extension/gi, 'Extension de triceps'],
  [/Triceps Kickback/gi, 'Patada de triceps'],
  [/Chest Dip/gi, 'Fondos de pecho'],
  [/Triceps Dip/gi, 'Fondos de triceps'],
  [/Chest Fly/gi, 'Apertura de pecho'],
  [/Cable Fly Crossovers/gi, 'Cruce de poleas'],
  [/Butterfly/gi, 'Contractora'],
  [/Pec Deck/gi, 'pec deck'],
  [/Romanian Deadlift/gi, 'Peso muerto rumano'],
  [/Straight Leg Deadlift/gi, 'Peso muerto piernas rigidas'],
  [/Deadlift/gi, 'Peso muerto'],
  [/Leg Extension/gi, 'Extension de piernas'],
  [/Leg Curl/gi, 'Curl femoral'],
  [/Leg Press/gi, 'Prensa de piernas'],
  [/Hack Squat/gi, 'Sentadilla hack'],
  [/Front Squat/gi, 'Sentadilla frontal'],
  [/Bulgarian Split Squat/gi, 'Sentadilla bulgara'],
  [/Goblet Squat/gi, 'Sentadilla goblet'],
  [/Walking Lunge/gi, 'Zancadas caminando'],
  [/Reverse Lunge/gi, 'Zancada reversa'],
  [/Step Up/gi, 'Step up'],
  [/Hip Abduction/gi, 'Abduccion de cadera'],
  [/Hip Adduction/gi, 'Aduccion de cadera'],
  [/Hip Thrust/gi, 'Hip thrust'],
  [/Glute Bridge/gi, 'Puente de gluteos'],
  [/Calf Raise/gi, 'Elevacion de gemelos'],
  [/Calf Press/gi, 'Prensa de gemelos'],
  [/Cable Crunch/gi, 'Crunch en polea'],
  [/Crunch Machine/gi, 'Crunch en maquina'],
  [/Ab Wheel/gi, 'Rueda abdominal'],
  [/Hanging Leg Raise/gi, 'Elevacion de piernas colgado'],
  [/Hanging Knee Raise/gi, 'Elevacion de rodillas colgado'],
  [/Back Extension/gi, 'Extension lumbar'],
  [/Face Pull/gi, 'Face pull'],
  [/Push Up/gi, 'Flexiones'],
];

const ALIAS_RULES: Array<{ match: RegExp; aliases: string[] }> = [
  { match: /\bbench press\b/i, aliases: ['press banca', 'press de banca'] },
  { match: /\bincline bench press\b/i, aliases: ['press inclinado', 'press de banca inclinado'] },
  { match: /\bdecline bench press\b/i, aliases: ['press declinado', 'press de banca declinado'] },
  { match: /\b(chest fly|fly|butterfly|pec deck)\b/i, aliases: ['apertura', 'aperturas', 'pec deck', 'contractora'] },
  { match: /\b(lat pulldown|pulldown)\b/i, aliases: ['jalon', 'jalon al pecho'] },
  { match: /\brow\b/i, aliases: ['remo'] },
  { match: /\bpull up\b/i, aliases: ['dominadas'] },
  { match: /\bchin up\b/i, aliases: ['dominadas supinas'] },
  { match: /\bbicep curl\b/i, aliases: ['curl de biceps'] },
  { match: /\bhammer curl\b/i, aliases: ['curl martillo'] },
  { match: /\bpreacher curl\b/i, aliases: ['curl predicador'] },
  { match: /\btriceps (rope )?(pushdown|pressdown)\b/i, aliases: ['jalon de triceps', 'triceps polea'] },
  { match: /\btriceps extension\b/i, aliases: ['extension de triceps'] },
  { match: /\b(chest dip|triceps dip|dip)\b/i, aliases: ['fondos'] },
  { match: /\boverhead press|shoulder press|arnold press\b/i, aliases: ['press de hombros', 'press militar'] },
  { match: /\blateral raise\b/i, aliases: ['elevacion lateral'] },
  { match: /\bfront raise\b/i, aliases: ['elevacion frontal'] },
  { match: /\brear delt reverse fly|reverse fly\b/i, aliases: ['vuelo posterior', 'pajaro'] },
  { match: /\bromanian deadlift\b/i, aliases: ['peso muerto rumano'] },
  { match: /\bdeadlift\b/i, aliases: ['peso muerto'] },
  { match: /\bleg extension\b/i, aliases: ['extension de piernas'] },
  { match: /\bleg curl\b/i, aliases: ['curl femoral'] },
  { match: /\bleg press\b/i, aliases: ['prensa', 'prensa de piernas'] },
  { match: /\bhack squat\b/i, aliases: ['sentadilla hack'] },
  { match: /\bhip abduction\b/i, aliases: ['abduccion', 'abduccion de cadera'] },
  { match: /\bhip adduction\b/i, aliases: ['aduccion', 'aduccion de cadera'] },
  { match: /\bhip thrust\b/i, aliases: ['empuje de cadera'] },
  { match: /\bcalf (raise|press)\b/i, aliases: ['gemelos', 'elevacion de gemelos'] },
  { match: /\bcrunch\b/i, aliases: ['abdominales'] },
];

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

export function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function translateEquipmentLabel(label: string) {
  return EQUIPMENT_TRANSLATIONS[label] ?? label.toLowerCase();
}

function translateEnglishTitle(englishTitle: string, slug: string) {
  const titleOverride = TITLE_OVERRIDES[slug];
  if (titleOverride) {
    return titleOverride;
  }

  let title = englishTitle;
  for (const [pattern, replacement] of TITLE_REPLACEMENTS) {
    title = title.replace(pattern, replacement);
  }

  title = title.replace(/\(([^)]+)\)/g, (_, token: string) => `(${translateEquipmentLabel(token.trim())})`);
  title = title.replace(/\bClose Grip\b/gi, 'agarre cerrado');
  title = title.replace(/\bWide Grip\b/gi, 'agarre amplio');
  title = title.replace(/\bAssisted\b/gi, 'asistido');
  title = title.replace(/\bWeighted\b/gi, 'lastrado');
  title = title.replace(/\bSingle Arm\b/gi, 'a una mano');
  title = title.replace(/\bOne Arm\b/gi, 'a una mano');
  title = title.replace(/\bStanding\b/gi, 'de pie');
  title = title.replace(/\bSeated\b/gi, 'sentado');
  title = title.replace(/\bLying\b/gi, 'acostado');

  return title.replace(/\s+/g, ' ').trim();
}

function buildTitleAliases(title: string) {
  return [title, title.replace(/\s*\([^)]*\)/g, '').trim()].filter(Boolean);
}

function buildExerciseNameMetadata(entry: ExerciseCatalogEntry, localizedTitle: string) {
  const englishTitle =
    entry.i18n.en?.title?.trim() ||
    entry.source?.original_title?.trim() ||
    humanizeCode(entry.slug);
  const translatedEnglishTitle = translateEnglishTitle(englishTitle, entry.slug);
  const displayTitle =
    translatedEnglishTitle !== englishTitle
      ? translatedEnglishTitle
      : localizedTitle.trim() || translatedEnglishTitle;

  const aliases = new Set<string>([
    ...buildTitleAliases(displayTitle),
    ...buildTitleAliases(localizedTitle),
    ...buildTitleAliases(englishTitle),
    humanizeCode(entry.slug),
    entry.slug.replace(/-/g, ' '),
  ]);

  for (const rule of ALIAS_RULES) {
    if (rule.match.test(englishTitle) || rule.match.test(displayTitle) || rule.match.test(entry.slug)) {
      for (const alias of rule.aliases) {
        aliases.add(alias);
      }
    }
  }

  return {
    title: displayTitle,
    titleEn: englishTitle,
    aliases: Array.from(aliases).filter(Boolean),
  };
}

export function buildExerciseCatalogSummary(
  entry: ExerciseCatalogEntry,
  locale: ExerciseCatalogLocale = 'es'
): ExerciseCatalogSummary {
  const localized = getLocalizedContent(entry, locale);
  const nameMetadata = buildExerciseNameMetadata(entry, localized.title);
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
    nameMetadata.title,
    nameMetadata.titleEn,
    localized.description,
    primaryGroupLabel,
    implement,
    entry.slug,
    ...nameMetadata.aliases,
    ...(entry.primary_muscles ?? []),
    ...(entry.secondary_muscles ?? []),
    ...(entry.equipment ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    id: resolveNumericId(entry.id, entry.slug),
    externalId: entry.id,
    slug: entry.slug,
    title: nameMetadata.title,
    titleEn: nameMetadata.titleEn,
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
    aliases: nameMetadata.aliases,
    searchText: normalizeSearchValue(searchText),
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
