import {
  CalendarDays,
  Clock3,
  Dumbbell,
  Flame,
  Home,
  MapPinned,
  MoonStar,
  Ruler,
  Scale,
  Sparkles,
  Target,
  VenusAndMars,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { ACTIVITY_LEVEL_OPTIONS, TRAINING_LEVEL_OPTIONS } from '@/shared/constants';
import { GOAL_OPTIONS } from '@/core/domain/profileInsights';

export const STEP_FLOW = [
  'identity',
  'experience',
  'goal',
  'activity',
  'personal',
  'metrics',
  'location',
  'days',
  'schedule',
  'summary',
] as const;

export const WEEK_DAYS = [
  { value: 'Lunes', short: 'LU' },
  { value: 'Martes', short: 'MA' },
  { value: 'Miércoles', short: 'MI' },
  { value: 'Jueves', short: 'JU' },
  { value: 'Viernes', short: 'VI' },
  { value: 'Sábado', short: 'SA' },
  { value: 'Domingo', short: 'DO' },
] as const;

export const GENDER_OPTIONS = [
  { value: 'Masculino', description: 'Usamos esta referencia para cálculos fisiológicos y reportes.' },
  { value: 'Femenino', description: 'Ajustamos recomendaciones y métricas a partir de este dato.' },
  { value: 'Prefiero no decirlo', description: 'Puedes continuar igual y cambiarlo más adelante cuando quieras.' },
] as const;

export const LOCATION_OPTIONS = [
  {
    value: 'Gimnasio completo',
    description: 'Acceso a máquinas, poleas, barras, mancuernas y más variantes para progresar fuerte.',
  },
  {
    value: 'Home gym',
    description: 'Entrenas en casa con equipamiento útil y buena variedad para organizar tus sesiones.',
  },
  {
    value: 'Casa básica',
    description: 'Prioriza practicidad con poco material o peso corporal, sin perder constancia.',
  },
] as const;

export const DEFAULT_TIME = '18:00';
export const DEFAULT_GOAL_VALUE = GOAL_OPTIONS[0];

export type StepId = (typeof STEP_FLOW)[number];

export type PickerState =
  | { type: 'birthDate' }
  | { type: 'height' }
  | { type: 'weight' }
  | { type: 'targetWeight' }
  | { type: 'time'; day?: string };

export type OnboardingFormState = {
  firstName: string;
  lastName: string;
  goal: string;
  trainingLevel: string;
  activityLevel: string;
  gender: string;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  focusMuscle: string;
  workoutLocation: string;
  preferredTrainingDays: string[];
  preferredScheduleMode: 'same' | 'different';
  preferredWorkoutTime: string;
  preferredWorkoutTimeByDay: Record<string, string>;
};

export type PickerOption = {
  label: string;
  value: string;
};

export type PickerColumn = {
  id: string;
  value: string;
  options: PickerOption[];
  onSelect: (value: string) => void;
};

type GoalCard = {
  value: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type StepCopy = {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
};

const EXPERIENCE_CONTENT: Record<string, string> = {
  Principiante:
    'Ideal si recién arrancas o si todavía estás ordenando técnica, rutina y consistencia semanal.',
  Intermedio:
    'Ya entrenas con regularidad, conoces los básicos y puedes sostener progresiones reales.',
  Avanzado:
    'Buscas más control sobre volumen, selección de ejercicios, fatiga y seguimiento fino.',
};

const ADVANCED_GOAL_CARDS: GoalCard[] = [
  {
    value: GOAL_OPTIONS[0],
    title: 'Definición',
    description:
      'Ajustamos calorías, métricas y estructura para mantener músculo y mejorar tu composición.',
    icon: Flame,
  },
  {
    value: GOAL_OPTIONS[1],
    title: 'Volumen',
    description:
      'Priorizamos progresión, recuperación y más margen para construir masa muscular real.',
    icon: Zap,
  },
  {
    value: GOAL_OPTIONS[2],
    title: 'Mantenimiento',
    description:
      'Buscamos constancia, rendimiento y una estructura sólida para sostener resultados.',
    icon: Target,
  },
  {
    value: GOAL_OPTIONS[3],
    title: 'Recomposición',
    description:
      'Balanceamos progreso muscular y pérdida de grasa sin llevarte a extremos innecesarios.',
    icon: Sparkles,
  },
];

const BEGINNER_GOAL_CARDS: GoalCard[] = [
  {
    value: GOAL_OPTIONS[0],
    title: 'Bajar de peso',
    description:
      'Nos enfocamos en mejorar tu composición y ayudarte a perder grasa sin complicarte con términos técnicos.',
    icon: Flame,
  },
  {
    value: GOAL_OPTIONS[1],
    title: 'Aumentar músculos',
    description:
      'Priorizamos ganar masa muscular con una estructura simple, progresiva y fácil de sostener.',
    icon: Zap,
  },
  {
    value: GOAL_OPTIONS[2],
    title: 'Mantenerme saludable',
    description:
      'La idea es entrenar bien, sentirte mejor y sostener hábitos sin una meta extrema.',
    icon: Target,
  },
  {
    value: GOAL_OPTIONS[3],
    title: 'Bajar peso y subir músculo',
    description:
      'Buscamos mejorar tu composición corporal con un enfoque equilibrado y realista.',
    icon: Sparkles,
  },
];

export const STEP_COPY: Record<StepId, StepCopy> = {
  identity: {
    eyebrow: 'Tu base',
    title: 'Empecemos por vos.',
    description:
      'WOHL va a personalizar métricas, recomendaciones y ritmo de la experiencia según tu perfil real.',
    cta: 'Continuar',
  },
  experience: {
    eyebrow: 'Experiencia',
    title: '¿Qué nivel sentís que tenés hoy?',
    description:
      'Esto define el tono de la experiencia y cómo WOHL te acompaña desde el inicio.',
    cta: 'Continuar',
  },
  goal: {
    eyebrow: 'Objetivo',
    title: '¿Qué querés lograr con tu proceso?',
    description:
      'Elegí el resultado que más te representa hoy. Lo usamos para ajustar la experiencia inicial.',
    cta: 'Continuar',
  },
  activity: {
    eyebrow: 'Contexto',
    title: '¿Cómo es tu nivel de actividad general?',
    description:
      'No solo cuenta el entrenamiento. También importa cuánto te mueves durante el día y tu carga semanal.',
    cta: 'Continuar',
  },
  personal: {
    eyebrow: 'Perfil',
    title: 'Un poco más de contexto personal.',
    description:
      'Con esto afinamos cálculos energéticos, edad deportiva y futuras estadísticas dentro de la app.',
    cta: 'Continuar',
  },
  metrics: {
    eyebrow: 'Medidas',
    title: 'Tus métricas actuales.',
    description:
      'Peso, altura y referencia objetivo para que WOHL te devuelva datos útiles y comparables.',
    cta: 'Continuar',
  },
  location: {
    eyebrow: 'Entorno',
    title: '¿Dónde solés entrenar?',
    description:
      'El nivel de equipamiento cambia bastante lo que conviene sugerir después para tus rutinas.',
    cta: 'Continuar',
  },
  days: {
    eyebrow: 'Frecuencia',
    title: '¿Cuántos días querés entrenar?',
    description:
      'Seleccioná entre 2 y 6 días por semana. Lo usamos para ordenar tu estructura inicial.',
    cta: 'Continuar',
  },
  schedule: {
    eyebrow: 'Horarios',
    title: 'Definamos cuándo te viene mejor entrenar.',
    description:
      'Podés usar un horario fijo o asignar uno distinto por cada día para que la experiencia sea más real.',
    cta: 'Continuar',
  },
  summary: {
    eyebrow: 'Listo',
    title: 'Tu perfil ya está tomando forma.',
    description:
      'Con esta base podemos personalizar estadísticas, cálculos y la forma en que empezás a entrenar dentro de WOHL.',
    cta: 'Crear mi primera rutina',
  },
};

export function buildNumberOptions(start: number, end: number, formatter?: (value: number) => string) {
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const value = start + index;
    return {
      label: formatter ? formatter(value) : String(value),
      value: String(value),
    };
  });
}

export function getDateParts(value: string) {
  if (!value) {
    return { day: '01', month: '01', year: '2000' };
  }

  const [year, month, day] = value.split('-');
  return { day, month, year };
}

export function getWeightParts(value: number) {
  const normalized = Number.isFinite(value) && value > 0 ? value.toFixed(1) : '70.0';
  const [whole, decimal] = normalized.split('.');
  return { whole, decimal };
}

export function getTimeParts(value: string) {
  const [hour = '18', minute = '00'] = value.split(':');
  return { hour, minute };
}

export function calculateAgeFromBirthDate(value: string) {
  if (!value) {
    return 0;
  }

  const today = new Date();
  const birthDate = new Date(`${value}T12:00:00`);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return Math.max(age, 0);
}

export function formatBirthDateLabel(value: string) {
  if (!value) {
    return 'Elegir fecha';
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

export function formatMetricLabel(value: number, unit: string) {
  if (!value) {
    return `Elegir ${unit}`;
  }

  return `${value.toFixed(1).replace('.0', '')} ${unit}`;
}

export function formatTimeLabel(value: string) {
  return value ? `${value} hs` : 'Elegir hora';
}

export function getGoalCards(trainingLevel: string) {
  return trainingLevel === TRAINING_LEVEL_OPTIONS[0] ? BEGINNER_GOAL_CARDS : ADVANCED_GOAL_CARDS;
}

export function getGoalLabel(trainingLevel: string, goal: string) {
  return getGoalCards(trainingLevel).find((item) => item.value === goal)?.title ?? goal;
}

export function getActivityIcon(index: number) {
  return index < 2 ? MoonStar : index < 4 ? Zap : Flame;
}

export function getLocationIcon(index: number) {
  return index === 0 ? Dumbbell : index === 1 ? Home : MapPinned;
}

export function getPersonalMetricIcon(kind: 'birthDate' | 'height' | 'weight' | 'targetWeight') {
  switch (kind) {
    case 'birthDate':
      return CalendarDays;
    case 'height':
      return Ruler;
    case 'weight':
      return Scale;
    case 'targetWeight':
      return Target;
  }
}

export function getGenderIcon() {
  return VenusAndMars;
}

export function getExperienceDescription(level: string) {
  return EXPERIENCE_CONTENT[level] ?? EXPERIENCE_CONTENT[TRAINING_LEVEL_OPTIONS[0]];
}
