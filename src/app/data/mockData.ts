export interface SetData {
  id: number;
  kg: number;
  reps: number;
  rpe: number;
  completed: boolean;
}

export interface ExerciseData {
  id: number;
  name: string;
  muscle: string;
  implement?: string;
  secondaryMuscles?: string[];
  notes?: string;
  sets: SetData[];
}

export interface DayData {
  name: string;
  focus: string;
  description?: string;
  exercises: ExerciseData[];
}

export interface RoutineCategory {
  name: string;
  percentage: number;
  color: string;
}

export interface Routine {
  id: number;
  name: string;
  daysPerWeek: number;
  color: string;
  categories: RoutineCategory[];
  description?: string;
  tags?: string[];
  avgMinutes?: number;
  days: DayData[];
}

export interface SessionHistoryExercise {
  name: string;
  muscle: string;
  implement?: string;
  secondaryMuscles?: string[];
  sets: { kg: number; reps: number; rpe?: number }[];
  maxKg: number;
}

export interface SessionHistory {
  id: number;
  isoDate: string;
  date: string;
  dayLabel: string;
  name: string;
  muscle: string;
  duration: number;
  kcal: number;
  volume: number;
  avgRpe: number;
  comparisonDelta?: number;
  exercises: SessionHistoryExercise[];
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  age: number;
  heightCm: number;
  weightKg: number;
  goal: string;
  activityLevel: string;
  activityFactor: number;
  activityDescription: string;
  trainingLevel: string;
  memberSince: string;
}

export interface ActivityLevelOption {
  label: string;
  factor: number;
  description: string;
}

export interface AppContext {
  todayIso: string;
  todayLabel: string;
  activeRoutineId: number;
  currentDayName: string;
  nextDayName: string;
  nextDayLabel: string;
  streakDays: number;
}

const buildSets = (entries: Array<{ kg: number; reps: number; rpe: number }>): SetData[] =>
  entries.map((entry, index) => ({
    id: index + 1,
    kg: entry.kg,
    reps: entry.reps,
    rpe: entry.rpe,
    completed: false,
  }));

const logSets = (entries: Array<{ kg: number; reps: number; rpe: number }>) =>
  entries.map((entry) => ({
    kg: entry.kg,
    reps: entry.reps,
    rpe: entry.rpe,
  }));

const utf8Replacements: Array<[RegExp, string]> = [
  [/\bDefinicion\b/g, 'Definición'],
  [/\bDEFINICION\b/g, 'DEFINICIÓN'],
  [/\bEntrenas\b/g, 'Entrenás'],
  [/\bdias\b/g, 'días'],
  [/\bDIAS\b/g, 'DÍAS'],
  [/\btipico\b/g, 'típico'],
  [/\bfisico\b/g, 'físico'],
  [/\batletico\b/g, 'atlético'],
  [/\bMiercoles\b/g, 'Miércoles'],
  [/\bManana\b/g, 'Mañana'],
  [/\bJalon\b/g, 'Jalón'],
  [/\bSesion\b/g, 'Sesión'],
  [/\bsesion\b/g, 'sesión'],
  [/\btiron\b/g, 'tirón'],
  [/\bmas\b/g, 'más'],
  [/\benfasis\b/g, 'énfasis'],
  [/\bbasicos\b/g, 'básicos'],
  [/\bTriceps\b/g, 'Tríceps'],
  [/\bBiceps\b/g, 'Bíceps'],
  [/\bMaquina\b/g, 'Máquina'],
  [/\bCinturon\b/g, 'Cinturón'],
  [/\bCuadriceps\b/g, 'Cuádriceps'],
  [/\bGluteos\b/g, 'Glúteos'],
  [/\bGluteo\b/g, 'Glúteo'],
  [/\bElevacion\b/g, 'Elevación'],
  [/\bExtension\b/g, 'Extensión'],
  [/\bAnconeo\b/g, 'Ancóneo'],
  [/\bSoleo\b/g, 'Sóleo'],
  [/\bNormalice\b/g, 'Normalicé'],
  [/\bnormalice\b/g, 'normalicé'],
  [/\bcomparacion\b/g, 'comparación'],
  [/\bMIE\b/g, 'MIÉ'],
];

function normalizeUtf8Text(value: string) {
  return utf8Replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function normalizeUtf8Value<T>(value: T): T {
  if (typeof value === 'string') {
    return normalizeUtf8Text(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeUtf8Value(entry)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeUtf8Value(entry)])
    ) as T;
  }

  return value;
}

export const userProfile: UserProfile = normalizeUtf8Value({
  firstName: 'Enzo',
  lastName: 'Wohl',
  fullName: 'Enzo Wohl',
  age: 24,
  heightCm: 182,
  weightKg: 93,
  goal: 'Definicion',
  activityLevel: 'Moderada',
  activityFactor: 1.55,
  activityDescription: 'Entrenas con regularidad, 3 a 5 dias por semana.',
  trainingLevel: 'Intermedio',
  memberSince: 'Marzo 2026',
});

export const activityLevelOptions: ActivityLevelOption[] = normalizeUtf8Value([
  {
    label: 'Sedentario',
    factor: 1.2,
    description: 'Poco o nada de ejercicio, tipico de trabajo de oficina y muy poco movimiento diario.',
  },
  {
    label: 'Actividad ligera',
    factor: 1.375,
    description: 'Entrenamiento 1 a 3 dias por semana, con caminatas suaves o gimnasio ocasional.',
  },
  {
    label: 'Actividad moderada',
    factor: 1.55,
    description: 'Entrenamiento regular 3 a 5 dias por semana, como un esquema de gym 4 dias.',
  },
  {
    label: 'Actividad intensa',
    factor: 1.725,
    description: 'Entrenamiento exigente 6 a 7 dias por semana.',
  },
  {
    label: 'Muy intensa / atleta',
    factor: 1.9,
    description: 'Trabajo fisico fuerte y entrenamiento doble o de nivel atletico.',
  },
]);

export const appContext: AppContext = normalizeUtf8Value({
  todayIso: '2026-04-08',
  todayLabel: 'Miercoles 8 de abril de 2026',
  activeRoutineId: 1,
  currentDayName: 'Upper B',
  nextDayName: 'Lower A',
  nextDayLabel: 'Manana',
  streakDays: 2,
});

export const routines: Routine[] = normalizeUtf8Value([
  {
    id: 1,
    name: 'Upper / Lower Wohl',
    daysPerWeek: 4,
    color: '#00C9A7',
    description:
      'Rutina actual orientada a definicion, con enfasis en basicos pesados y accesorios para mantener volumen.',
    categories: [],
    tags: ['UPPER/LOWER', '4 DIAS', 'DEFINICION'],
    avgMinutes: 78,
    days: [
      {
        name: 'Upper A',
        focus: 'Pecho, espalda y brazos',
        description: 'Sesion de torso con banca pesada, tiron vertical y trabajo de brazos.',
        exercises: [
          {
            id: 1,
            name: 'Press banca',
            muscle: 'Pecho',
            implement: 'Barra',
            secondaryMuscles: ['Triceps', 'Deltoides anterior'],
            sets: buildSets([
              { kg: 100, reps: 8, rpe: 8 },
              { kg: 100, reps: 7, rpe: 8.5 },
              { kg: 100, reps: 6, rpe: 9 },
              { kg: 90, reps: 8, rpe: 8.5 },
            ]),
          },
          {
            id: 2,
            name: 'Jalon al pecho cerrado',
            muscle: 'Espalda',
            implement: 'Maquina',
            secondaryMuscles: ['Biceps', 'Redondo mayor'],
            sets: buildSets([
              { kg: 80, reps: 8, rpe: 8 },
              { kg: 80, reps: 7, rpe: 8.5 },
              { kg: 80, reps: 6, rpe: 9 },
            ]),
          },
          {
            id: 3,
            name: 'Fondos en paralelas',
            muscle: 'Pecho',
            implement: 'Cinturon lastrado',
            secondaryMuscles: ['Triceps', 'Deltoides anterior'],
            sets: buildSets([
              { kg: 20, reps: 8, rpe: 8 },
              { kg: 20, reps: 8, rpe: 8.5 },
              { kg: 20, reps: 7, rpe: 9 },
            ]),
          },
          {
            id: 4,
            name: 'Remo horizontal',
            muscle: 'Espalda',
            implement: 'Maquina',
            secondaryMuscles: ['Biceps', 'Trapecio medio'],
            sets: buildSets([
              { kg: 75, reps: 10, rpe: 8 },
              { kg: 75, reps: 10, rpe: 8.5 },
              { kg: 70, reps: 9, rpe: 9 },
              { kg: 70, reps: 8, rpe: 9 },
            ]),
          },
          {
            id: 5,
            name: 'Posteriores',
            muscle: 'Hombros',
            implement: 'Reverse pec deck',
            secondaryMuscles: ['Trapecio medio', 'Romboides'],
            notes:
              'En el Excel figuraba como "Posteriores / Reverce pec deck"; lo normalice a reverse pec deck.',
            sets: buildSets([
              { kg: 45, reps: 12, rpe: 7.5 },
              { kg: 45, reps: 12, rpe: 8 },
              { kg: 45, reps: 12, rpe: 8.5 },
              { kg: 40, reps: 12, rpe: 8.5 },
            ]),
          },
          {
            id: 6,
            name: 'Overhead con barra V',
            muscle: 'Triceps',
            implement: 'Polea',
            secondaryMuscles: ['Deltoides anterior'],
            sets: buildSets([
              { kg: 27.5, reps: 10, rpe: 8 },
              { kg: 27.5, reps: 10, rpe: 8.5 },
              { kg: 25, reps: 9, rpe: 9 },
            ]),
          },
          {
            id: 7,
            name: 'Curl predicador martillo',
            muscle: 'Biceps',
            implement: 'Mancuernas',
            secondaryMuscles: ['Braquial', 'Braquiorradial'],
            sets: buildSets([
              { kg: 18, reps: 10, rpe: 8 },
              { kg: 18, reps: 10, rpe: 8.5 },
              { kg: 16, reps: 9, rpe: 9 },
            ]),
          },
          {
            id: 8,
            name: 'Polea alta con barra V',
            muscle: 'Triceps',
            implement: 'Polea',
            secondaryMuscles: ['Anconeo'],
            sets: buildSets([
              { kg: 40, reps: 12, rpe: 8 },
              { kg: 40, reps: 10, rpe: 8.5 },
              { kg: 35, reps: 10, rpe: 9 },
            ]),
          },
          {
            id: 9,
            name: 'Crunch con peso',
            muscle: 'Abdominales',
            implement: 'Maquina de crunch',
            secondaryMuscles: ['Flexores de cadera'],
            sets: buildSets([
              { kg: 50, reps: 12, rpe: 7.5 },
              { kg: 50, reps: 12, rpe: 8 },
              { kg: 50, reps: 12, rpe: 8 },
            ]),
          },
        ],
      },
      {
        name: 'Lower A',
        focus: 'Cuadriceps e isquios',
        description: 'Pierna con enfasis en hack squat, bisagra de cadera y accesorios de pierna completa.',
        exercises: [
          {
            id: 10,
            name: 'Hack squat',
            muscle: 'Cuadriceps',
            implement: 'Maquina',
            secondaryMuscles: ['Gluteos'],
            sets: buildSets([
              { kg: 160, reps: 8, rpe: 8 },
              { kg: 160, reps: 8, rpe: 8.5 },
              { kg: 150, reps: 7, rpe: 9 },
              { kg: 140, reps: 8, rpe: 8.5 },
            ]),
          },
          {
            id: 11,
            name: 'Peso muerto rumano',
            muscle: 'Isquiotibiales',
            implement: 'Barra',
            secondaryMuscles: ['Gluteos', 'Espalda baja'],
            sets: buildSets([
              { kg: 110, reps: 8, rpe: 8 },
              { kg: 110, reps: 8, rpe: 8.5 },
              { kg: 100, reps: 8, rpe: 9 },
            ]),
          },
          {
            id: 12,
            name: 'Gemelos de pie',
            muscle: 'Gemelos',
            implement: 'Smith',
            secondaryMuscles: ['Soleo'],
            sets: buildSets([
              { kg: 80, reps: 12, rpe: 8 },
              { kg: 80, reps: 12, rpe: 8.5 },
              { kg: 80, reps: 12, rpe: 9 },
              { kg: 75, reps: 12, rpe: 9 },
            ]),
          },
          {
            id: 13,
            name: 'Extension de piernas',
            muscle: 'Cuadriceps',
            implement: 'Maquina',
            secondaryMuscles: ['Recto femoral'],
            sets: buildSets([
              { kg: 80, reps: 12, rpe: 8 },
              { kg: 80, reps: 12, rpe: 8.5 },
              { kg: 75, reps: 12, rpe: 9 },
            ]),
          },
          {
            id: 14,
            name: 'Curl femoral',
            muscle: 'Isquiotibiales',
            implement: 'Maquina',
            secondaryMuscles: ['Gemelos'],
            sets: buildSets([
              { kg: 60, reps: 12, rpe: 8 },
              { kg: 60, reps: 12, rpe: 8.5 },
              { kg: 55, reps: 12, rpe: 9 },
            ]),
          },
          {
            id: 15,
            name: 'Abductores',
            muscle: 'Abductores',
            implement: 'Maquina',
            secondaryMuscles: ['Gluteo medio'],
            sets: buildSets([
              { kg: 75, reps: 15, rpe: 8 },
              { kg: 75, reps: 15, rpe: 8.5 },
              { kg: 70, reps: 15, rpe: 9 },
            ]),
          },
          {
            id: 16,
            name: 'Knee raises',
            muscle: 'Abdominales',
            implement: 'Peso corporal',
            secondaryMuscles: ['Flexores de cadera'],
            sets: buildSets([
              { kg: 0, reps: 12, rpe: 7.5 },
              { kg: 0, reps: 12, rpe: 8 },
              { kg: 0, reps: 12, rpe: 8.5 },
            ]),
          },
        ],
      },
      {
        name: 'Upper B',
        focus: 'Espalda, pecho y hombros',
        description:
          'Torso mas voluminoso con jalon pesado, press inclinado y trabajo de deltoides laterales.',
        exercises: [
          {
            id: 17,
            name: 'Jalon al pecho',
            muscle: 'Espalda',
            implement: 'Maquina',
            secondaryMuscles: ['Biceps', 'Redondo mayor'],
            sets: buildSets([
              { kg: 80, reps: 8, rpe: 8 },
              { kg: 80, reps: 7, rpe: 8.5 },
              { kg: 80, reps: 6, rpe: 9 },
              { kg: 72.5, reps: 8, rpe: 8.5 },
            ]),
          },
          {
            id: 18,
            name: 'Press inclinado',
            muscle: 'Pecho',
            implement: 'Mancuernas',
            secondaryMuscles: ['Triceps', 'Deltoides anterior'],
            sets: buildSets([
              { kg: 36, reps: 10, rpe: 8 },
              { kg: 36, reps: 9, rpe: 8.5 },
              { kg: 34, reps: 8, rpe: 9 },
            ]),
          },
          {
            id: 19,
            name: 'Remo bajo cerrado',
            muscle: 'Espalda',
            implement: 'Maquina',
            secondaryMuscles: ['Biceps', 'Trapecio medio'],
            sets: buildSets([
              { kg: 75, reps: 8, rpe: 8 },
              { kg: 75, reps: 8, rpe: 8.5 },
              { kg: 70, reps: 8, rpe: 9 },
            ]),
          },
          {
            id: 20,
            name: 'Apertura',
            muscle: 'Pecho',
            implement: 'Maquina',
            secondaryMuscles: ['Deltoides anterior'],
            sets: buildSets([
              { kg: 65, reps: 10, rpe: 8 },
              { kg: 65, reps: 10, rpe: 8.5 },
              { kg: 60, reps: 10, rpe: 9 },
              { kg: 55, reps: 10, rpe: 9 },
            ]),
          },
          {
            id: 21,
            name: 'Elevacion lateral',
            muscle: 'Hombros',
            implement: 'Polea',
            secondaryMuscles: ['Trapecio superior'],
            sets: buildSets([
              { kg: 12, reps: 12, rpe: 8 },
              { kg: 12, reps: 12, rpe: 8.5 },
              { kg: 12, reps: 12, rpe: 9 },
              { kg: 10, reps: 12, rpe: 9 },
            ]),
          },
          {
            id: 22,
            name: 'Curl inclinado',
            muscle: 'Biceps',
            implement: 'Mancuernas',
            secondaryMuscles: ['Braquial'],
            sets: buildSets([
              { kg: 16, reps: 10, rpe: 8 },
              { kg: 16, reps: 10, rpe: 8.5 },
              { kg: 14, reps: 10, rpe: 9 },
            ]),
          },
          {
            id: 23,
            name: 'Polea alta con barra V',
            muscle: 'Triceps',
            implement: 'Polea',
            secondaryMuscles: ['Anconeo'],
            sets: buildSets([
              { kg: 42.5, reps: 10, rpe: 8 },
              { kg: 42.5, reps: 10, rpe: 8.5 },
              { kg: 40, reps: 10, rpe: 9 },
            ]),
          },
          {
            id: 24,
            name: 'Curl martillo',
            muscle: 'Biceps',
            implement: 'Mancuernas',
            secondaryMuscles: ['Braquiorradial'],
            sets: buildSets([
              { kg: 20, reps: 12, rpe: 8 },
              { kg: 20, reps: 12, rpe: 8.5 },
              { kg: 18, reps: 12, rpe: 9 },
            ]),
          },
          {
            id: 25,
            name: 'Crunch con peso',
            muscle: 'Abdominales',
            implement: 'Maquina de crunch',
            secondaryMuscles: ['Flexores de cadera'],
            sets: buildSets([
              { kg: 50, reps: 12, rpe: 7.5 },
              { kg: 50, reps: 12, rpe: 8 },
              { kg: 50, reps: 12, rpe: 8.5 },
            ]),
          },
        ],
      },
      {
        name: 'Lower B',
        focus: 'Sentadilla, gluteos y cadena posterior',
        description:
          'Pierna centrada en sentadilla libre, hip thrust y accesorios para completar volumen.',
        exercises: [
          {
            id: 26,
            name: 'Sentadilla libre',
            muscle: 'Cuadriceps',
            implement: 'Rack',
            secondaryMuscles: ['Gluteos', 'Espalda baja'],
            sets: buildSets([
              { kg: 100, reps: 8, rpe: 8 },
              { kg: 100, reps: 7, rpe: 8.5 },
              { kg: 100, reps: 6, rpe: 9 },
              { kg: 90, reps: 8, rpe: 8.5 },
            ]),
          },
          {
            id: 27,
            name: 'Hip thrust',
            muscle: 'Gluteos',
            implement: 'Barra',
            secondaryMuscles: ['Isquiotibiales'],
            notes: 'Normalice "Hip trust" a "Hip thrust".',
            sets: buildSets([
              { kg: 140, reps: 12, rpe: 8 },
              { kg: 140, reps: 11, rpe: 8.5 },
              { kg: 130, reps: 10, rpe: 9 },
            ]),
          },
          {
            id: 28,
            name: 'Gemelos de pie',
            muscle: 'Gemelos',
            implement: 'Rack',
            secondaryMuscles: ['Soleo'],
            sets: buildSets([
              { kg: 80, reps: 12, rpe: 8 },
              { kg: 80, reps: 12, rpe: 8.5 },
              { kg: 80, reps: 12, rpe: 9 },
              { kg: 80, reps: 12, rpe: 9 },
            ]),
          },
          {
            id: 29,
            name: 'Extension de piernas',
            muscle: 'Cuadriceps',
            implement: 'Maquina',
            secondaryMuscles: ['Recto femoral'],
            sets: buildSets([
              { kg: 75, reps: 12, rpe: 8 },
              { kg: 75, reps: 12, rpe: 8.5 },
              { kg: 70, reps: 11, rpe: 9 },
            ]),
          },
          {
            id: 30,
            name: 'Curl femoral',
            muscle: 'Isquiotibiales',
            implement: 'Maquina',
            secondaryMuscles: ['Gemelos'],
            sets: buildSets([
              { kg: 60, reps: 12, rpe: 8 },
              { kg: 60, reps: 11, rpe: 8.5 },
              { kg: 55, reps: 10, rpe: 9 },
            ]),
          },
          {
            id: 31,
            name: 'Abductores',
            muscle: 'Abductores',
            implement: 'Maquina',
            secondaryMuscles: ['Gluteo medio'],
            sets: buildSets([
              { kg: 75, reps: 15, rpe: 8 },
              { kg: 75, reps: 15, rpe: 8.5 },
              { kg: 75, reps: 15, rpe: 9 },
            ]),
          },
          {
            id: 32,
            name: 'Knee raises',
            muscle: 'Abdominales',
            implement: 'Peso corporal',
            secondaryMuscles: ['Flexores de cadera'],
            sets: buildSets([
              { kg: 0, reps: 15, rpe: 7.5 },
              { kg: 0, reps: 12, rpe: 8 },
              { kg: 0, reps: 12, rpe: 8.5 },
            ]),
          },
        ],
      },
    ],
  },
]);

export const sessionHistory: SessionHistory[] = normalizeUtf8Value([
  {
    id: 1,
    isoDate: '2026-04-07',
    date: '7 DE ABRIL',
    dayLabel: 'MAR 7',
    name: 'Lower B',
    muscle: 'Cuadriceps, gluteos e isquios',
    duration: 76,
    kcal: 742,
    volume: 19055,
    avgRpe: 8.4,
    comparisonDelta: 4.2,
    exercises: [
      {
        name: 'Sentadilla libre',
        muscle: 'Cuadriceps',
        implement: 'Rack',
        secondaryMuscles: ['Gluteos', 'Espalda baja'],
        sets: logSets([
          { kg: 100, reps: 8, rpe: 8 },
          { kg: 100, reps: 7, rpe: 8.5 },
          { kg: 100, reps: 6, rpe: 9 },
          { kg: 90, reps: 8, rpe: 8.5 },
        ]),
        maxKg: 100,
      },
      {
        name: 'Hip thrust',
        muscle: 'Gluteos',
        implement: 'Barra',
        secondaryMuscles: ['Isquiotibiales'],
        sets: logSets([
          { kg: 140, reps: 12, rpe: 8 },
          { kg: 140, reps: 11, rpe: 8.5 },
          { kg: 130, reps: 10, rpe: 9 },
        ]),
        maxKg: 140,
      },
      {
        name: 'Gemelos de pie',
        muscle: 'Gemelos',
        implement: 'Rack',
        secondaryMuscles: ['Soleo'],
        sets: logSets([
          { kg: 80, reps: 12, rpe: 8 },
          { kg: 80, reps: 12, rpe: 8.5 },
          { kg: 80, reps: 12, rpe: 9 },
          { kg: 80, reps: 12, rpe: 9 },
        ]),
        maxKg: 80,
      },
      {
        name: 'Extension de piernas',
        muscle: 'Cuadriceps',
        implement: 'Maquina',
        secondaryMuscles: ['Recto femoral'],
        sets: logSets([
          { kg: 75, reps: 12, rpe: 8 },
          { kg: 75, reps: 12, rpe: 8.5 },
          { kg: 70, reps: 11, rpe: 9 },
        ]),
        maxKg: 75,
      },
      {
        name: 'Curl femoral',
        muscle: 'Isquiotibiales',
        implement: 'Maquina',
        secondaryMuscles: ['Gemelos'],
        sets: logSets([
          { kg: 60, reps: 12, rpe: 8 },
          { kg: 60, reps: 11, rpe: 8.5 },
          { kg: 55, reps: 10, rpe: 9 },
        ]),
        maxKg: 60,
      },
      {
        name: 'Abductores',
        muscle: 'Abductores',
        implement: 'Maquina',
        secondaryMuscles: ['Gluteo medio'],
        sets: logSets([
          { kg: 75, reps: 15, rpe: 8 },
          { kg: 75, reps: 15, rpe: 8.5 },
          { kg: 75, reps: 15, rpe: 9 },
        ]),
        maxKg: 75,
      },
    ],
  },
  {
    id: 2,
    isoDate: '2026-04-06',
    date: '6 DE ABRIL',
    dayLabel: 'LUN 6',
    name: 'Upper A',
    muscle: 'Pecho, espalda y brazos',
    duration: 82,
    kcal: 689,
    volume: 14059,
    avgRpe: 8.3,
    comparisonDelta: 2.8,
    exercises: [
      {
        name: 'Press banca',
        muscle: 'Pecho',
        implement: 'Barra',
        secondaryMuscles: ['Triceps', 'Deltoides anterior'],
        sets: logSets([
          { kg: 100, reps: 8, rpe: 8 },
          { kg: 100, reps: 7, rpe: 8.5 },
          { kg: 100, reps: 6, rpe: 9 },
          { kg: 90, reps: 8, rpe: 8.5 },
        ]),
        maxKg: 100,
      },
      {
        name: 'Jalon al pecho cerrado',
        muscle: 'Espalda',
        implement: 'Maquina',
        secondaryMuscles: ['Biceps', 'Redondo mayor'],
        sets: logSets([
          { kg: 80, reps: 8, rpe: 8 },
          { kg: 80, reps: 7, rpe: 8.5 },
          { kg: 80, reps: 6, rpe: 9 },
        ]),
        maxKg: 80,
      },
      {
        name: 'Fondos en paralelas',
        muscle: 'Pecho',
        implement: 'Cinturon lastrado',
        secondaryMuscles: ['Triceps', 'Deltoides anterior'],
        sets: logSets([
          { kg: 20, reps: 8, rpe: 8 },
          { kg: 20, reps: 8, rpe: 8.5 },
          { kg: 20, reps: 7, rpe: 9 },
        ]),
        maxKg: 20,
      },
      {
        name: 'Remo horizontal',
        muscle: 'Espalda',
        implement: 'Maquina',
        secondaryMuscles: ['Biceps', 'Trapecio medio'],
        sets: logSets([
          { kg: 75, reps: 10, rpe: 8 },
          { kg: 75, reps: 10, rpe: 8.5 },
          { kg: 70, reps: 9, rpe: 9 },
          { kg: 70, reps: 8, rpe: 9 },
        ]),
        maxKg: 75,
      },
      {
        name: 'Posteriores',
        muscle: 'Hombros',
        implement: 'Reverse pec deck',
        secondaryMuscles: ['Trapecio medio', 'Romboides'],
        sets: logSets([
          { kg: 45, reps: 12, rpe: 7.5 },
          { kg: 45, reps: 12, rpe: 8 },
          { kg: 45, reps: 12, rpe: 8.5 },
          { kg: 40, reps: 12, rpe: 8.5 },
        ]),
        maxKg: 45,
      },
      {
        name: 'Polea alta con barra V',
        muscle: 'Triceps',
        implement: 'Polea',
        secondaryMuscles: ['Anconeo'],
        sets: logSets([
          { kg: 40, reps: 12, rpe: 8 },
          { kg: 40, reps: 10, rpe: 8.5 },
          { kg: 35, reps: 10, rpe: 9 },
        ]),
        maxKg: 40,
      },
    ],
  },
  {
    id: 3,
    isoDate: '2026-04-02',
    date: '2 DE ABRIL',
    dayLabel: 'JUE 2',
    name: 'Upper B',
    muscle: 'Espalda, pecho y hombros',
    duration: 79,
    kcal: 671,
    volume: 13240,
    avgRpe: 8.1,
    comparisonDelta: 1.6,
    exercises: [
      {
        name: 'Jalon al pecho',
        muscle: 'Espalda',
        implement: 'Maquina',
        secondaryMuscles: ['Biceps', 'Redondo mayor'],
        sets: logSets([
          { kg: 77.5, reps: 8, rpe: 8 },
          { kg: 77.5, reps: 8, rpe: 8.5 },
          { kg: 75, reps: 7, rpe: 9 },
          { kg: 72.5, reps: 8, rpe: 8.5 },
        ]),
        maxKg: 77.5,
      },
      {
        name: 'Press inclinado',
        muscle: 'Pecho',
        implement: 'Mancuernas',
        secondaryMuscles: ['Triceps', 'Deltoides anterior'],
        sets: logSets([
          { kg: 34, reps: 10, rpe: 8 },
          { kg: 34, reps: 9, rpe: 8.5 },
          { kg: 32, reps: 8, rpe: 9 },
        ]),
        maxKg: 34,
      },
      {
        name: 'Remo bajo cerrado',
        muscle: 'Espalda',
        implement: 'Maquina',
        secondaryMuscles: ['Biceps', 'Trapecio medio'],
        sets: logSets([
          { kg: 72.5, reps: 8, rpe: 8 },
          { kg: 72.5, reps: 8, rpe: 8.5 },
          { kg: 70, reps: 8, rpe: 9 },
        ]),
        maxKg: 72.5,
      },
    ],
  },
  {
    id: 4,
    isoDate: '2026-03-31',
    date: '31 DE MARZO',
    dayLabel: 'MAR 31',
    name: 'Lower A',
    muscle: 'Cuadriceps, isquios y gemelos',
    duration: 73,
    kcal: 715,
    volume: 17680,
    avgRpe: 8,
    comparisonDelta: 3.1,
    exercises: [
      {
        name: 'Hack squat',
        muscle: 'Cuadriceps',
        implement: 'Maquina',
        secondaryMuscles: ['Gluteos'],
        sets: logSets([
          { kg: 160, reps: 8, rpe: 8 },
          { kg: 160, reps: 8, rpe: 8.5 },
          { kg: 150, reps: 7, rpe: 9 },
          { kg: 140, reps: 8, rpe: 8.5 },
        ]),
        maxKg: 160,
      },
      {
        name: 'Peso muerto rumano',
        muscle: 'Isquiotibiales',
        implement: 'Barra',
        secondaryMuscles: ['Gluteos', 'Espalda baja'],
        sets: logSets([
          { kg: 110, reps: 8, rpe: 8 },
          { kg: 110, reps: 8, rpe: 8.5 },
          { kg: 100, reps: 8, rpe: 9 },
        ]),
        maxKg: 110,
      },
    ],
  },
  {
    id: 5,
    isoDate: '2026-03-27',
    date: '27 DE MARZO',
    dayLabel: 'VIE 27',
    name: 'Upper A',
    muscle: 'Pecho, espalda y brazos',
    duration: 80,
    kcal: 676,
    volume: 13610,
    avgRpe: 8.1,
    comparisonDelta: 1.9,
    exercises: [],
  },
  {
    id: 6,
    isoDate: '2026-03-25',
    date: '25 DE MARZO',
    dayLabel: 'MIE 25',
    name: 'Lower B',
    muscle: 'Cuadriceps, gluteos e isquios',
    duration: 74,
    kcal: 728,
    volume: 18290,
    avgRpe: 8.2,
    comparisonDelta: 2.7,
    exercises: [],
  },
]);

export const weekDays = [
  { day: 'L', completed: true, missed: false, active: false, hasData: true },
  { day: 'M', completed: true, missed: false, active: false, hasData: true },
  { day: 'X', completed: false, missed: false, active: true, hasData: false },
  { day: 'J', completed: false, missed: false, active: false, hasData: false },
  { day: 'V', completed: false, missed: false, active: false, hasData: false },
  { day: 'S', completed: false, missed: false, active: false, hasData: false },
  { day: 'D', completed: false, missed: false, active: false, hasData: false },
];

export const muscleGroups = normalizeUtf8Value([
  {
    id: 'pecho',
    name: 'Pecho',
    level: 7,
    xp: 68,
    xpNeeded: 100,
    color: '#00C9A7',
    weeklyVolume: [5400, 5750, 5900, 6100, 6240, 6320, 6480, 6710],
    exercises: [
      { name: 'Press banca', pr: 100, unit: 'kg' },
      { name: 'Press inclinado', pr: 36, unit: 'kg' },
      { name: 'Fondos en paralelas', pr: 20, unit: 'kg' },
    ],
  },
  {
    id: 'espalda',
    name: 'Espalda',
    level: 7,
    xp: 74,
    xpNeeded: 100,
    color: '#00C9A7',
    weeklyVolume: [6200, 6480, 6660, 6830, 7010, 7180, 7360, 7540],
    exercises: [
      { name: 'Jalon al pecho', pr: 80, unit: 'kg' },
      { name: 'Remo horizontal', pr: 75, unit: 'kg' },
      { name: 'Remo bajo cerrado', pr: 75, unit: 'kg' },
    ],
  },
  {
    id: 'piernas',
    name: 'Piernas',
    level: 8,
    xp: 61,
    xpNeeded: 100,
    color: '#00C9A7',
    weeklyVolume: [14200, 15100, 15850, 16400, 17250, 17980, 18520, 19055],
    exercises: [
      { name: 'Sentadilla libre', pr: 100, unit: 'kg' },
      { name: 'Hack squat', pr: 160, unit: 'kg' },
      { name: 'Hip thrust', pr: 140, unit: 'kg' },
    ],
  },
  {
    id: 'hombros',
    name: 'Hombros',
    level: 6,
    xp: 49,
    xpNeeded: 100,
    color: '#00C9A7',
    weeklyVolume: [2500, 2680, 2790, 2960, 3110, 3260, 3390, 3520],
    exercises: [
      { name: 'Posteriores (reverse pec deck)', pr: 45, unit: 'kg' },
      { name: 'Elevacion lateral', pr: 12, unit: 'kg' },
      { name: 'Press inclinado', pr: 36, unit: 'kg' },
    ],
  },
  {
    id: 'brazos',
    name: 'Brazos',
    level: 6,
    xp: 57,
    xpNeeded: 100,
    color: '#00C9A7',
    weeklyVolume: [3200, 3360, 3490, 3620, 3780, 3910, 4060, 4210],
    exercises: [
      { name: 'Polea alta con barra V', pr: 42.5, unit: 'kg' },
      { name: 'Curl martillo', pr: 20, unit: 'kg' },
      { name: 'Curl predicador martillo', pr: 18, unit: 'kg' },
    ],
  },
]);
