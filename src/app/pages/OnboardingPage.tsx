import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
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
  UserRound,
  VenusAndMars,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { brandLogoWhite } from '@/assets';
import { DateWheelPicker, NumberWheelPicker, TimeWheelPicker } from '../components/onboarding/WheelPickers';
import { ACTIVITY_LEVEL_OPTIONS, TRAINING_LEVEL_OPTIONS } from '../data/constants';
import { useAppData } from '../data/AppDataContext';
import { GOAL_OPTIONS } from '../data/profileInsights';

const STEP_FLOW = [
  'identity',
  'goal',
  'experience',
  'activity',
  'personal',
  'metrics',
  'focus',
  'location',
  'days',
  'schedule',
  'summary',
] as const;

const WEEK_DAYS = [
  { value: 'Lunes', short: 'LU' },
  { value: 'Martes', short: 'MA' },
  { value: 'Miércoles', short: 'MI' },
  { value: 'Jueves', short: 'JU' },
  { value: 'Viernes', short: 'VI' },
  { value: 'Sábado', short: 'SA' },
  { value: 'Domingo', short: 'DO' },
] as const;

const GOAL_CONTENT: Record<string, string> = {
  [GOAL_OPTIONS[0]]:
    'Ajustamos calorías, métricas y propuesta de entrenamiento para mantener músculo y verte más definido.',
  [GOAL_OPTIONS[1]]:
    'Priorizamos progresión, recuperación y estímulos con más margen para construir masa muscular.',
  [GOAL_OPTIONS[2]]:
    'Buscamos constancia, rendimiento y un plan sólido para sostener resultados sin ir a extremos.',
  [GOAL_OPTIONS[3]]:
    'Balanceamos composición corporal, adherencia y progreso para mejorar músculo y porcentaje graso.',
};

const EXPERIENCE_CONTENT: Record<string, string> = {
  Principiante:
    'Ideal si recién arrancas o si todavía estás ordenando técnica, rutina y consistencia semanal.',
  Intermedio:
    'Ya entrenas con regularidad, conoces los básicos y puedes sostener progresiones reales.',
  Avanzado:
    'Buscas más control sobre volumen, selección de ejercicios, fatiga y seguimiento fino.',
};

const GENDER_OPTIONS = [
  { value: 'Masculino', description: 'Usamos esta referencia para cálculos fisiológicos y reportes.' },
  { value: 'Femenino', description: 'Ajustamos recomendaciones y métricas a partir de este dato.' },
  { value: 'Prefiero no decirlo', description: 'Puedes continuar igual y cambiarlo más adelante cuando quieras.' },
] as const;

const FOCUS_OPTIONS = [
  { value: 'Balanceado', description: 'Distribución pareja para crecer de forma armónica.', badge: 'Recomendado' },
  { value: 'Pecho', description: 'Más prioridad a presses y trabajo del torso anterior.' },
  { value: 'Espalda', description: 'Más protagonismo para remos, jalones y densidad dorsal.' },
  { value: 'Piernas', description: 'Más foco en cuádriceps, glúteos, isquios y gemelos.' },
  { value: 'Hombros', description: 'Más atención a deltoides, estabilidad y detalle visual.' },
  { value: 'Brazos', description: 'Mayor volumen para bíceps y tríceps.' },
] as const;

const LOCATION_OPTIONS = [
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

const DEFAULT_TIME = '18:00';

type StepId = (typeof STEP_FLOW)[number];

type PickerState =
  | { type: 'birthDate' }
  | { type: 'height' }
  | { type: 'weight' }
  | { type: 'targetWeight' }
  | { type: 'time'; day?: string };

type OnboardingFormState = {
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

type PickerOption = {
  label: string;
  value: string;
};

type PickerColumn = {
  id: string;
  value: string;
  options: PickerOption[];
  onSelect: (value: string) => void;
};

function buildNumberOptions(start: number, end: number, formatter?: (value: number) => string) {
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const value = start + index;
    return {
      label: formatter ? formatter(value) : String(value),
      value: String(value),
    };
  });
}

function getDateParts(value: string) {
  if (!value) {
    return { day: '01', month: '01', year: '2000' };
  }

  const [year, month, day] = value.split('-');
  return { day, month, year };
}

function getWeightParts(value: number) {
  const normalized = Number.isFinite(value) && value > 0 ? value.toFixed(1) : '70.0';
  const [whole, decimal] = normalized.split('.');
  return { whole, decimal };
}

function getTimeParts(value: string) {
  const [hour = '18', minute = '00'] = value.split(':');
  return { hour, minute };
}

function calculateAgeFromBirthDate(value: string) {
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

function formatBirthDateLabel(value: string) {
  if (!value) {
    return 'Elegir fecha';
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

function formatMetricLabel(value: number, unit: string) {
  if (!value) {
    return `Elegir ${unit}`;
  }

  return `${value.toFixed(1).replace('.0', '')} ${unit}`;
}

function formatTimeLabel(value: string) {
  return value ? `${value} hs` : 'Elegir hora';
}

function SelectionCard({
  title,
  description,
  selected,
  icon,
  onClick,
  badge,
}: {
  title: string;
  description: string;
  selected: boolean;
  icon?: ReactNode;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full flex-col gap-4 rounded-[28px] border px-5 py-5 text-left transition-all duration-200 active:scale-[0.985] ${
        selected
          ? 'border-[rgba(0,201,167,0.38)] bg-[linear-gradient(180deg,rgba(0,201,167,0.18)_0%,rgba(0,201,167,0.08)_100%)] shadow-[0_18px_42px_rgba(0,201,167,0.08)]'
          : 'border-[rgba(255,255,255,0.06)] bg-[#111522] hover:border-[rgba(255,255,255,0.12)]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors ${
                selected ? 'bg-[rgba(0,201,167,0.16)] text-[#00C9A7]' : 'bg-[#1A2130] text-[#8F9AAD]'
              }`}
            >
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h3 className="text-[18px] font-bold tracking-tight text-white">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-[#98A2B3]">{description}</p>
          </div>
        </div>

        <div
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
            selected
              ? 'border-[rgba(0,201,167,0.4)] bg-[#00C9A7] text-black'
              : 'border-[rgba(255,255,255,0.14)] bg-transparent text-transparent'
          }`}
        >
          <Check size={14} strokeWidth={3} />
        </div>
      </div>

      {badge ? (
        <span className="inline-flex w-fit rounded-full border border-[rgba(0,201,167,0.16)] bg-[rgba(0,201,167,0.08)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#00C9A7]">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function CompactSelectionCard({
  title,
  subtitle,
  selected,
  badge,
  disabled,
  onClick,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  badge?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative flex min-h-[122px] flex-col justify-between rounded-[24px] border px-4 py-4 text-left transition-all duration-200 active:scale-[0.985] ${
        selected
          ? 'border-[rgba(0,201,167,0.38)] bg-[rgba(0,201,167,0.12)] shadow-[0_18px_34px_rgba(0,201,167,0.07)]'
          : disabled
            ? 'border-[rgba(255,255,255,0.04)] bg-[#0E1220] opacity-45'
            : 'border-[rgba(255,255,255,0.06)] bg-[#111522]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-base font-bold tracking-tight text-white">{title}</span>
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
            selected
              ? 'border-[rgba(0,201,167,0.4)] bg-[#00C9A7] text-black'
              : 'border-[rgba(255,255,255,0.14)] bg-transparent text-transparent'
          }`}
        >
          <Check size={14} strokeWidth={3} />
        </div>
      </div>
      <div className="space-y-2">
        {subtitle ? <p className="text-sm leading-5 text-[#98A2B3]">{subtitle}</p> : null}
        {badge ? (
          <span className="inline-flex w-fit rounded-full border border-[rgba(0,201,167,0.14)] bg-[rgba(0,201,167,0.08)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#00C9A7]">
            {badge}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function PremiumInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8D98AA]">{label}</span>
      <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[#111522] px-5 py-4 transition-colors focus-within:border-[rgba(0,201,167,0.4)] focus-within:shadow-[0_0_0_4px_rgba(0,201,167,0.08)]">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-lg font-semibold text-white outline-none placeholder:text-[#566075]"
        />
      </div>
    </label>
  );
}

function PickerTriggerCard({
  label,
  value,
  description,
  icon,
  onClick,
}: {
  label: string;
  value: string;
  description?: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-[26px] border border-[rgba(255,255,255,0.06)] bg-[#111522] px-5 py-5 text-left transition-all duration-200 hover:border-[rgba(0,201,167,0.16)] active:scale-[0.985]"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1A2130] text-[#00C9A7]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8D98AA]">{label}</p>
          <p className="mt-1 truncate text-lg font-bold tracking-tight text-white">{value}</p>
          {description ? <p className="mt-1 text-sm text-[#98A2B3]">{description}</p> : null}
        </div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-[#7B8494]" />
    </button>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <span className="inline-flex rounded-full border border-[rgba(0,201,167,0.14)] bg-[rgba(0,201,167,0.08)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#00C9A7]">
        {eyebrow}
      </span>
      <div className="space-y-3">
        <h1 className="max-w-[16ch] text-[clamp(2rem,8vw,3.25rem)] font-black leading-[0.98] tracking-[-0.04em] text-white">
          {title}
        </h1>
        <p className="max-w-[32ch] text-[15px] leading-7 text-[#98A2B3]">{description}</p>
      </div>
    </div>
  );
}

function PickerSheet({
  open,
  title,
  subtitle,
  columns,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  columns: PickerColumn[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center px-3 pb-3">
      <div className="absolute inset-0 bg-[rgba(4,7,18,0.76)] backdrop-blur-[5px]" onClick={onClose} />
      <div className="relative w-full rounded-[30px] border border-[rgba(0,201,167,0.14)] bg-[linear-gradient(180deg,#141927_0%,#0D111C_100%)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.48)]">
        <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-[rgba(255,255,255,0.12)]" />
        <div className="mb-5 text-center">
          <h3 className="text-xl font-bold tracking-tight text-white">{title}</h3>
          {subtitle ? <p className="mt-2 text-sm text-[#98A2B3]">{subtitle}</p> : null}
        </div>

        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }}
        >
          {columns.map((column) => (
            <div
              key={column.id}
              className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[#0F1420] p-3"
            >
              <div className="max-h-[248px] overflow-y-auto pr-1 [scrollbar-width:none]">
                <div className="flex flex-col gap-2">
                  {column.options.map((option) => {
                    const selected = option.value === column.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => column.onSelect(option.value)}
                        className={`min-h-[48px] rounded-2xl px-3 py-3 text-center text-base font-semibold transition-all ${
                          selected
                            ? 'bg-[rgba(0,201,167,0.16)] text-white shadow-[0_0_0_1px_rgba(0,201,167,0.2)]'
                            : 'text-[#8D98AA] hover:bg-[rgba(255,255,255,0.04)]'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[#171C29] py-4 text-base font-semibold text-white transition-colors hover:bg-[#1C2231]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-[22px] bg-[#00C9A7] py-4 text-base font-extrabold text-[#041016] shadow-[0_18px_32px_rgba(0,201,167,0.2)] transition-transform active:scale-[0.99]"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

const STEP_COPY: Record<
  StepId,
  {
    eyebrow: string;
    title: string;
    description: string;
    cta: string;
  }
> = {
  identity: {
    eyebrow: 'Tu base',
    title: 'Empecemos por vos.',
    description:
      'WOHL va a personalizar métricas, recomendaciones y ritmo de la experiencia según tu perfil real.',
    cta: 'Continuar',
  },
  goal: {
    eyebrow: 'Objetivo',
    title: '¿Qué querés lograr con tu entrenamiento?',
    description:
      'Elegí el resultado que más te representa hoy. Después lo vas a poder cambiar desde configuración.',
    cta: 'Continuar',
  },
  experience: {
    eyebrow: 'Experiencia',
    title: '¿Qué nivel sentís que tenés hoy?',
    description:
      'Esto nos ayuda a ajustar complejidad, lectura de progreso y recomendaciones de trabajo.',
    cta: 'Continuar',
  },
  activity: {
    eyebrow: 'Contexto',
    title: '¿Cómo es tu nivel de actividad general?',
    description:
      'No solo cuenta el gym. También importa cuánto te mueves durante el día y tu carga semanal.',
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
  focus: {
    eyebrow: 'Enfoque',
    title: '¿Querés priorizar algún grupo muscular?',
    description:
      'Podemos dejarlo balanceado o darle un poco más de protagonismo a una zona puntual.',
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

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { updateUserProfile, userProfile } = useAppData();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [pickerState, setPickerState] = useState<PickerState | null>(null);
  const [birthDraft, setBirthDraft] = useState(() => getDateParts(userProfile.birthDate ?? ''));
  const [heightDraft, setHeightDraft] = useState(() => ({ value: String(Math.round(userProfile.heightCm || 175)) }));
  const [weightDraft, setWeightDraft] = useState(() => getWeightParts(userProfile.weightKg || 75));
  const [targetWeightDraft, setTargetWeightDraft] = useState(() =>
    getWeightParts(userProfile.targetWeightKg || userProfile.weightKg || 72)
  );
  const [timeDraft, setTimeDraft] = useState(() => getTimeParts(userProfile.preferredWorkoutTime || DEFAULT_TIME));
  const [formData, setFormData] = useState<OnboardingFormState>({
    firstName: userProfile.firstName,
    lastName: userProfile.lastName,
    goal: userProfile.goal || GOAL_OPTIONS[0],
    trainingLevel: userProfile.trainingLevel || TRAINING_LEVEL_OPTIONS[0],
    activityLevel: userProfile.activityLevel || ACTIVITY_LEVEL_OPTIONS[0].label,
    gender: userProfile.gender || '',
    birthDate: userProfile.birthDate || '',
    heightCm: userProfile.heightCm || 0,
    weightKg: userProfile.weightKg || 0,
    targetWeightKg: userProfile.targetWeightKg || userProfile.weightKg || 0,
    focusMuscle: userProfile.focusMuscle || 'Balanceado',
    workoutLocation: userProfile.workoutLocation || 'Gimnasio completo',
    preferredTrainingDays: userProfile.preferredTrainingDays || [],
    preferredScheduleMode: userProfile.preferredScheduleMode || 'same',
    preferredWorkoutTime: userProfile.preferredWorkoutTime || DEFAULT_TIME,
    preferredWorkoutTimeByDay: userProfile.preferredWorkoutTimeByDay || {},
  });

  const currentStep = STEP_FLOW[stepIndex];
  const progressPercent = ((stepIndex + 1) / STEP_FLOW.length) * 100;
  const stepCopy = STEP_COPY[currentStep];
  const selectedDaysOrdered = WEEK_DAYS.filter((day) => formData.preferredTrainingDays.includes(day.value));

  useEffect(() => {
    if (formData.preferredScheduleMode !== 'different') {
      return;
    }

    setFormData((previous) => {
      const nextMap = { ...previous.preferredWorkoutTimeByDay };
      previous.preferredTrainingDays.forEach((day) => {
        if (!nextMap[day]) {
          nextMap[day] = previous.preferredWorkoutTime || DEFAULT_TIME;
        }
      });

      Object.keys(nextMap).forEach((day) => {
        if (!previous.preferredTrainingDays.includes(day)) {
          delete nextMap[day];
        }
      });

      return {
        ...previous,
        preferredWorkoutTimeByDay: nextMap,
      };
    });
  }, [formData.preferredScheduleMode, formData.preferredTrainingDays, formData.preferredWorkoutTime]);

  const setField = <K extends keyof OnboardingFormState>(field: K, value: OnboardingFormState[K]) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const toggleTrainingDay = (day: string) => {
    setFormData((previous) => {
      const exists = previous.preferredTrainingDays.includes(day);

      if (!exists && previous.preferredTrainingDays.length >= 6) {
        return previous;
      }

      const nextDays = exists
        ? previous.preferredTrainingDays.filter((item) => item !== day)
        : [...previous.preferredTrainingDays, day];

      return {
        ...previous,
        preferredTrainingDays: nextDays,
      };
    });
  };

  const canContinue = useMemo(() => {
    switch (currentStep) {
      case 'identity':
        return formData.firstName.trim().length > 0 && formData.lastName.trim().length > 0;
      case 'goal':
        return Boolean(formData.goal);
      case 'experience':
        return Boolean(formData.trainingLevel);
      case 'activity':
        return Boolean(formData.activityLevel);
      case 'personal':
        return Boolean(formData.gender) && Boolean(formData.birthDate);
      case 'metrics':
        return formData.heightCm > 0 && formData.weightKg > 0 && formData.targetWeightKg > 0;
      case 'focus':
        return Boolean(formData.focusMuscle);
      case 'location':
        return Boolean(formData.workoutLocation);
      case 'days':
        return formData.preferredTrainingDays.length >= 2 && formData.preferredTrainingDays.length <= 6;
      case 'schedule':
        if (formData.preferredScheduleMode === 'same') {
          return Boolean(formData.preferredWorkoutTime);
        }

        return formData.preferredTrainingDays.every((day) => Boolean(formData.preferredWorkoutTimeByDay[day]));
      case 'summary':
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

  const openBirthPicker = () => {
    setBirthDraft(getDateParts(formData.birthDate));
    setPickerState({ type: 'birthDate' });
  };

  const openHeightPicker = () => {
    setHeightDraft({ value: String(Math.round(formData.heightCm || 175)) });
    setPickerState({ type: 'height' });
  };

  const openWeightPicker = () => {
    setWeightDraft(getWeightParts(formData.weightKg || 75));
    setPickerState({ type: 'weight' });
  };

  const openTargetWeightPicker = () => {
    setTargetWeightDraft(getWeightParts(formData.targetWeightKg || formData.weightKg || 72));
    setPickerState({ type: 'targetWeight' });
  };

  const openTimePicker = (day?: string) => {
    const value =
      (day ? formData.preferredWorkoutTimeByDay[day] : formData.preferredWorkoutTime) || DEFAULT_TIME;
    setTimeDraft(getTimeParts(value));
    setPickerState({ type: 'time', day });
  };

  const confirmPicker = () => {
    if (!pickerState) {
      return;
    }

    if (pickerState.type === 'birthDate') {
      const iso = `${birthDraft.year}-${birthDraft.month}-${birthDraft.day}`;
      setField('birthDate', iso);
      setPickerState(null);
      return;
    }

    if (pickerState.type === 'height') {
      setField('heightCm', Number(heightDraft.value));
      setPickerState(null);
      return;
    }

    if (pickerState.type === 'weight') {
      setField('weightKg', Number(`${weightDraft.whole}.${weightDraft.decimal}`));
      setPickerState(null);
      return;
    }

    if (pickerState.type === 'targetWeight') {
      setField('targetWeightKg', Number(`${targetWeightDraft.whole}.${targetWeightDraft.decimal}`));
      setPickerState(null);
      return;
    }

    const nextTime = `${timeDraft.hour}:${timeDraft.minute}`;
    if (pickerState.day) {
      setField('preferredWorkoutTimeByDay', {
        ...formData.preferredWorkoutTimeByDay,
        [pickerState.day]: nextTime,
      });
    } else {
      setField('preferredWorkoutTime', nextTime);
    }
    setPickerState(null);
  };

  const goBack = () => {
    if (stepIndex === 0) {
      return;
    }

    setStepIndex((previous) => previous - 1);
  };

  const completeOnboarding = async (destination: 'routine' | 'home') => {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      const completedAt = new Date().toISOString();
      const preferredWorkoutTimeByDay =
        formData.preferredScheduleMode === 'different'
          ? Object.fromEntries(
              formData.preferredTrainingDays.map((day) => [
                day,
                formData.preferredWorkoutTimeByDay[day] || formData.preferredWorkoutTime || DEFAULT_TIME,
              ])
            )
          : Object.fromEntries(
              formData.preferredTrainingDays.map((day) => [day, formData.preferredWorkoutTime || DEFAULT_TIME])
            );

      await updateUserProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        birthDate: formData.birthDate,
        age: calculateAgeFromBirthDate(formData.birthDate),
        heightCm: formData.heightCm,
        weightKg: formData.weightKg,
        targetWeightKg: formData.targetWeightKg,
        goal: formData.goal,
        focusMuscle: formData.focusMuscle,
        workoutLocation: formData.workoutLocation,
        activityLevel: formData.activityLevel,
        trainingLevel: formData.trainingLevel,
        preferredTrainingDays: formData.preferredTrainingDays,
        preferredScheduleMode: formData.preferredScheduleMode,
        preferredWorkoutTime: formData.preferredWorkoutTime || DEFAULT_TIME,
        preferredWorkoutTimeByDay,
        onboardingCompletedAt: completedAt,
      });

      navigate(destination === 'routine' ? '/routine-editor/new' : '/', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (!canContinue) {
      return;
    }

    if (currentStep === 'summary') {
      void completeOnboarding('routine');
      return;
    }

    setStepIndex((previous) => previous + 1);
  };

  const pickerColumns = useMemo<PickerColumn[]>(() => {
    if (!pickerState) {
      return [];
    }

    if (pickerState.type === 'birthDate') {
      return [
        {
          id: 'day',
          value: birthDraft.day,
          options: buildNumberOptions(1, 31, (value) => String(value).padStart(2, '0')),
          onSelect: (value) => setBirthDraft((previous) => ({ ...previous, day: value })),
        },
        {
          id: 'month',
          value: birthDraft.month,
          options: [
            '01',
            '02',
            '03',
            '04',
            '05',
            '06',
            '07',
            '08',
            '09',
            '10',
            '11',
            '12',
          ].map((value, index) => ({
            value,
            label: new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(new Date(2026, index, 1)),
          })),
          onSelect: (value) => setBirthDraft((previous) => ({ ...previous, month: value })),
        },
        {
          id: 'year',
          value: birthDraft.year,
          options: buildNumberOptions(new Date().getFullYear() - 65, new Date().getFullYear() - 14).reverse(),
          onSelect: (value) => setBirthDraft((previous) => ({ ...previous, year: value })),
        },
      ];
    }

    if (pickerState.type === 'height') {
      return [
        {
          id: 'height',
          value: heightDraft.value,
          options: buildNumberOptions(140, 220, (value) => `${value} cm`),
          onSelect: (value) => setHeightDraft({ value }),
        },
      ];
    }

    if (pickerState.type === 'weight') {
      return [
        {
          id: 'weight-whole',
          value: weightDraft.whole,
          options: buildNumberOptions(40, 180),
          onSelect: (value) => setWeightDraft((previous) => ({ ...previous, whole: value })),
        },
        {
          id: 'weight-decimal',
          value: weightDraft.decimal,
          options: buildNumberOptions(0, 9, (value) => `.${value}`),
          onSelect: (value) => setWeightDraft((previous) => ({ ...previous, decimal: value })),
        },
      ];
    }

    if (pickerState.type === 'targetWeight') {
      return [
        {
          id: 'target-weight-whole',
          value: targetWeightDraft.whole,
          options: buildNumberOptions(40, 180),
          onSelect: (value) => setTargetWeightDraft((previous) => ({ ...previous, whole: value })),
        },
        {
          id: 'target-weight-decimal',
          value: targetWeightDraft.decimal,
          options: buildNumberOptions(0, 9, (value) => `.${value}`),
          onSelect: (value) => setTargetWeightDraft((previous) => ({ ...previous, decimal: value })),
        },
      ];
    }

    return [
      {
        id: 'hour',
        value: timeDraft.hour,
        options: buildNumberOptions(5, 23, (value) => String(value).padStart(2, '0')),
        onSelect: (value) => setTimeDraft((previous) => ({ ...previous, hour: value })),
      },
      {
        id: 'minute',
        value: timeDraft.minute,
        options: ['00', '15', '30', '45'].map((value) => ({ value, label: value })),
        onSelect: (value) => setTimeDraft((previous) => ({ ...previous, minute: value })),
      },
    ];
  }, [birthDraft, heightDraft, pickerState, targetWeightDraft, timeDraft, weightDraft]);

  const pickerTitle = useMemo(() => {
    if (!pickerState) {
      return '';
    }

    if (pickerState.type === 'birthDate') return 'Fecha de nacimiento';
    if (pickerState.type === 'height') return 'Altura actual';
    if (pickerState.type === 'weight') return 'Peso actual';
    if (pickerState.type === 'targetWeight') return 'Peso objetivo';
    if (pickerState.day) return `Horario para ${pickerState.day}`;
    return 'Horario principal';
  }, [pickerState]);

  const pickerSubtitle = useMemo(() => {
    if (!pickerState) {
      return '';
    }

    if (pickerState.type === 'birthDate') {
      return 'Desliza y deja la fecha exacta que quieres usar como referencia.';
    }

    if (pickerState.type === 'height') {
      return 'Selecciona tu altura actual para mejorar cálculos y métricas.';
    }

    if (pickerState.type === 'weight') {
      return 'Usamos este valor para estadísticas, progreso y objetivos.';
    }

    if (pickerState.type === 'targetWeight') {
      return 'Una referencia simple para entender hacia dónde quieres ir.';
    }

    return 'Elegí una hora cómoda y realista para que WOHL te acompañe mejor.';
  }, [pickerState]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'identity':
        return (
          <div className="space-y-5">
            <div className="rounded-[30px] border border-[rgba(0,201,167,0.12)] bg-[linear-gradient(180deg,rgba(0,201,167,0.08)_0%,rgba(0,201,167,0.02)_100%)] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F1726] shadow-[inset_0_0_0_1px_rgba(0,201,167,0.12)]">
                  <img src={brandLogoWhite} alt="WOHL" className="h-7 w-7 object-contain" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Tu setup inicial en WOHL</p>
                  <p className="text-sm text-[#98A2B3]">Nos lleva menos de dos minutos dejarlo bien hecho.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-[30px] border border-[rgba(255,255,255,0.06)] bg-[#0F1420] p-5">
              <PremiumInput
                label="Nombre"
                placeholder="Enzo"
                value={formData.firstName}
                onChange={(value) => setField('firstName', value)}
              />
              <PremiumInput
                label="Apellido"
                placeholder="Wohl"
                value={formData.lastName}
                onChange={(value) => setField('lastName', value)}
              />
            </div>
          </div>
        );

      case 'goal':
        return (
          <div className="space-y-4">
            {GOAL_OPTIONS.map((goal, index) => (
              <SelectionCard
                key={goal}
                title={goal}
                description={GOAL_CONTENT[goal]}
                selected={formData.goal === goal}
                onClick={() => setField('goal', goal)}
                icon={
                  index === 0 ? <Flame size={22} /> : index === 1 ? <Zap size={22} /> : index === 2 ? <Target size={22} /> : <Sparkles size={22} />
                }
              />
            ))}
          </div>
        );

      case 'experience':
        return (
          <div className="space-y-4">
            {TRAINING_LEVEL_OPTIONS.map((level, index) => (
              <SelectionCard
                key={level}
                title={level}
                description={EXPERIENCE_CONTENT[level]}
                selected={formData.trainingLevel === level}
                onClick={() => setField('trainingLevel', level)}
                icon={index === 0 ? <Sparkles size={22} /> : index === 1 ? <Dumbbell size={22} /> : <Target size={22} />}
              />
            ))}
          </div>
        );

      case 'activity':
        return (
          <div className="space-y-4">
            {ACTIVITY_LEVEL_OPTIONS.map((option, index) => (
              <SelectionCard
                key={option.label}
                title={option.label}
                description={option.description}
                selected={formData.activityLevel === option.label}
                onClick={() => setField('activityLevel', option.label)}
                icon={index < 2 ? <MoonStar size={22} /> : index < 4 ? <Zap size={22} /> : <Flame size={22} />}
              />
            ))}
          </div>
        );

      case 'personal':
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3">
              {GENDER_OPTIONS.map((option) => (
                <SelectionCard
                  key={option.value}
                  title={option.value}
                  description={option.description}
                  selected={formData.gender === option.value}
                  onClick={() => setField('gender', option.value)}
                  icon={<VenusAndMars size={22} />}
                />
              ))}
            </div>

            <PickerTriggerCard
              label="Fecha de nacimiento"
              value={formatBirthDateLabel(formData.birthDate)}
              description={
                formData.birthDate
                  ? `Edad calculada: ${calculateAgeFromBirthDate(formData.birthDate)} años`
                  : 'La usamos para tus métricas y referencias generales.'
              }
              icon={<CalendarDays size={20} />}
              onClick={openBirthPicker}
            />
          </div>
        );

      case 'metrics':
        return (
          <div className="space-y-4">
            <div className="rounded-[30px] border border-[rgba(255,255,255,0.06)] bg-[#0F1420] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(0,201,167,0.1)] text-[#00C9A7]">
                  <Scale size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Base física inicial</p>
                  <p className="text-sm text-[#98A2B3]">Estos valores te van a acompañar en progreso, nutrición y reportes.</p>
                </div>
              </div>
            </div>

            <PickerTriggerCard
              label="Altura"
              value={formatMetricLabel(formData.heightCm, 'cm')}
              description="Una referencia estable para métricas y cálculos energéticos."
              icon={<Ruler size={20} />}
              onClick={openHeightPicker}
            />
            <PickerTriggerCard
              label="Peso actual"
              value={formatMetricLabel(formData.weightKg, 'kg')}
              description="Tu punto de partida real hoy."
              icon={<Scale size={20} />}
              onClick={openWeightPicker}
            />
            <PickerTriggerCard
              label="Peso objetivo"
              value={formatMetricLabel(formData.targetWeightKg, 'kg')}
              description="Una referencia útil para orientar la experiencia."
              icon={<Target size={20} />}
              onClick={openTargetWeightPicker}
            />
          </div>
        );

      case 'focus':
        return (
          <div className="grid grid-cols-2 gap-3">
            {FOCUS_OPTIONS.map((option) => (
              <CompactSelectionCard
                key={option.value}
                title={option.value}
                subtitle={option.description}
                badge={'badge' in option ? option.badge : undefined}
                selected={formData.focusMuscle === option.value}
                onClick={() => setField('focusMuscle', option.value)}
              />
            ))}
          </div>
        );

      case 'location':
        return (
          <div className="space-y-4">
            {LOCATION_OPTIONS.map((option, index) => (
              <SelectionCard
                key={option.value}
                title={option.value}
                description={option.description}
                selected={formData.workoutLocation === option.value}
                onClick={() => setField('workoutLocation', option.value)}
                icon={index === 0 ? <Dumbbell size={22} /> : index === 1 ? <Home size={22} /> : <MapPinned size={22} />}
              />
            ))}
          </div>
        );

      case 'days':
        return (
          <div className="space-y-5">
            <div className="rounded-[30px] border border-[rgba(0,201,167,0.12)] bg-[rgba(0,201,167,0.05)] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#00C9A7]">Rango recomendado</p>
              <p className="mt-2 text-lg font-bold tracking-tight text-white">
                {formData.preferredTrainingDays.length}/6 días seleccionados
              </p>
              <p className="mt-1 text-sm leading-6 text-[#98A2B3]">
                Necesitamos al menos 2 para construir una estructura consistente y hasta 6 para no sobredimensionar tu semana.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {WEEK_DAYS.map((day) => {
                const selected = formData.preferredTrainingDays.includes(day.value);
                const selectedOrder = formData.preferredTrainingDays.indexOf(day.value) + 1;
                const disabled = !selected && formData.preferredTrainingDays.length >= 6;

                return (
                  <button
                    key={day.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleTrainingDay(day.value)}
                    className={`relative flex min-h-[124px] flex-col justify-between rounded-[24px] border px-4 py-4 text-left transition-all duration-200 active:scale-[0.985] ${
                      selected
                        ? 'border-[rgba(0,201,167,0.38)] bg-[rgba(0,201,167,0.12)] shadow-[0_18px_34px_rgba(0,201,167,0.07)]'
                        : disabled
                          ? 'border-[rgba(255,255,255,0.04)] bg-[#0E1220] opacity-45'
                          : 'border-[rgba(255,255,255,0.06)] bg-[#111522]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8D98AA]">{day.short}</span>
                      <div
                        className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold ${
                          selected ? 'bg-[#00C9A7] text-black' : 'bg-[#1A2130] text-[#6F7B91]'
                        }`}
                      >
                        {selected ? selectedOrder : '—'}
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-bold tracking-tight text-white">{day.value}</p>
                      <p className="mt-1 text-sm text-[#98A2B3]">{selected ? 'Incluido en tu semana' : 'Tap para seleccionar'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div className="space-y-5">
            <div className="rounded-[28px] border border-[rgba(255,255,255,0.06)] bg-[#101521] p-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setField('preferredScheduleMode', 'same')}
                  className={`rounded-[20px] px-4 py-3 text-sm font-bold transition-all ${
                    formData.preferredScheduleMode === 'same'
                      ? 'bg-[#00C9A7] text-[#041016]'
                      : 'bg-transparent text-[#98A2B3]'
                  }`}
                >
                  Mismo horario
                </button>
                <button
                  type="button"
                  onClick={() => setField('preferredScheduleMode', 'different')}
                  className={`rounded-[20px] px-4 py-3 text-sm font-bold transition-all ${
                    formData.preferredScheduleMode === 'different'
                      ? 'bg-[#00C9A7] text-[#041016]'
                      : 'bg-transparent text-[#98A2B3]'
                  }`}
                >
                  Horarios distintos
                </button>
              </div>
            </div>

            {formData.preferredScheduleMode === 'same' ? (
              <div className="space-y-4">
                <PickerTriggerCard
                  label="Horario principal"
                  value={formatTimeLabel(formData.preferredWorkoutTime)}
                  description="Se aplicará como referencia para todos los días seleccionados."
                  icon={<Clock3 size={20} />}
                  onClick={() => openTimePicker()}
                />

                <div className="flex flex-wrap gap-2">
                  {selectedDaysOrdered.map((day) => (
                    <span
                      key={day.value}
                      className="inline-flex rounded-full border border-[rgba(255,255,255,0.08)] bg-[#111522] px-3 py-1.5 text-xs font-semibold text-[#C2CBD9]"
                    >
                      {day.value}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDaysOrdered.map((day) => (
                  <PickerTriggerCard
                    key={day.value}
                    label={day.value}
                    value={formatTimeLabel(formData.preferredWorkoutTimeByDay[day.value] || DEFAULT_TIME)}
                    description="Tap para definir una hora dedicada para ese día."
                    icon={<Clock3 size={20} />}
                    onClick={() => openTimePicker(day.value)}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'summary':
        return (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[32px] border border-[rgba(0,201,167,0.14)] bg-[linear-gradient(180deg,rgba(0,201,167,0.12)_0%,rgba(0,201,167,0.04)_100%)] p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="max-w-[15rem]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#00C9A7]">Resumen inicial</p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                    Perfil premium listo para arrancar.
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-2 self-end">
                  {[30, 54, 78, 110].map((height, index) => (
                    <span
                      key={height}
                      className={`w-3 rounded-full ${index === 3 ? 'bg-[#00C9A7]' : 'bg-[rgba(255,255,255,0.16)]'}`}
                      style={{ height }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CompactSelectionCard title={formData.goal} subtitle="Objetivo actual" selected onClick={() => undefined} />
              <CompactSelectionCard title={formData.trainingLevel} subtitle="Nivel declarado" selected onClick={() => undefined} />
              <CompactSelectionCard title={`${formData.preferredTrainingDays.length} días`} subtitle="Frecuencia semanal" selected onClick={() => undefined} />
              <CompactSelectionCard title={formData.workoutLocation} subtitle="Lugar de entrenamiento" selected onClick={() => undefined} />
            </div>

            <div className="space-y-3 rounded-[30px] border border-[rgba(255,255,255,0.06)] bg-[#0F1420] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#161E2D] text-[#00C9A7]">
                  <UserRound size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {formData.firstName.trim()} {formData.lastName.trim()}
                  </p>
                  <p className="text-sm text-[#98A2B3]">
                    {calculateAgeFromBirthDate(formData.birthDate)} años · {formData.heightCm} cm · {formData.weightKg.toFixed(1).replace('.0', '')} kg
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[#111522] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8D98AA]">Foco muscular</p>
                  <p className="mt-2 text-base font-bold text-white">{formData.focusMuscle}</p>
                </div>
                <div className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[#111522] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8D98AA]">Horario</p>
                  <p className="mt-2 text-base font-bold text-white">
                    {formData.preferredScheduleMode === 'same' ? formatTimeLabel(formData.preferredWorkoutTime) : 'Variable'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedDaysOrdered.map((day) => (
                  <span
                    key={day.value}
                    className="inline-flex rounded-full border border-[rgba(0,201,167,0.14)] bg-[rgba(0,201,167,0.08)] px-3 py-1.5 text-xs font-semibold text-[#00C9A7]"
                  >
                    {day.value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="theme-preserve relative min-h-full overflow-hidden bg-[#060914] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-22%] top-[-6%] h-[220px] w-[220px] rounded-full bg-[rgba(0,201,167,0.08)] blur-[82px]" />
        <div className="absolute right-[-28%] top-[18%] h-[260px] w-[260px] rounded-full bg-[rgba(79,97,255,0.07)] blur-[105px]" />
        <div className="absolute bottom-[-12%] left-[14%] h-[240px] w-[240px] rounded-full bg-[rgba(0,201,167,0.05)] blur-[120px]" />
      </div>

      <div className="relative flex min-h-full flex-col">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0 || saving}
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
                stepIndex === 0
                  ? 'border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] text-[#546071]'
                  : 'border-[rgba(255,255,255,0.08)] bg-[#111522] text-white hover:border-[rgba(0,201,167,0.24)]'
              }`}
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex items-center gap-2">
              <img src={brandLogoWhite} alt="WOHL" className="h-5 w-5 object-contain" />
              <span className="text-[12px] font-bold uppercase tracking-[0.24em] text-[#B7C1D2]">WOHL setup</span>
            </div>

            <div className="min-w-[56px] text-right text-[12px] font-semibold tracking-wide text-[#7F8A9C]">
              {stepIndex + 1}/{STEP_FLOW.length}
            </div>
          </div>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
            <motion.div
              className="h-full rounded-full bg-[#00C9A7]"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-[10.5rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-7"
            >
              <SectionIntro
                eyebrow={stepCopy.eyebrow}
                title={stepCopy.title}
                description={stepCopy.description}
              />
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-[linear-gradient(180deg,rgba(6,9,20,0)_0%,rgba(6,9,20,0.74)_20%,#060914_46%)] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-6">
          <div className="pointer-events-auto space-y-3">
            <button
              type="button"
              disabled={!canContinue || saving}
              onClick={goNext}
              className={`w-full rounded-[22px] px-5 py-4 text-base font-extrabold transition-all ${
                canContinue && !saving
                  ? 'bg-[#00C9A7] text-[#041016] shadow-[0_20px_36px_rgba(0,201,167,0.2)] active:scale-[0.99]'
                  : 'bg-[#151A27] text-[#667085]'
              }`}
            >
              {saving ? 'Guardando...' : stepCopy.cta}
            </button>

            {currentStep === 'summary' ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void completeOnboarding('home')}
                className="w-full rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[#101521] px-5 py-4 text-sm font-semibold text-[#C4CDDB] transition-colors hover:bg-[#141A29]"
              >
                Ir al inicio por ahora
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <DateWheelPicker
        open={pickerState?.type === 'birthDate'}
        title="Fecha de nacimiento"
        subtitle="Deslizá cada columna hasta dejar tu fecha exacta en la franja central."
        value={birthDraft}
        onChange={setBirthDraft}
        onClose={() => setPickerState(null)}
        onConfirm={confirmPicker}
      />

      <NumberWheelPicker
        open={pickerState?.type === 'height'}
        title="Altura actual"
        subtitle="Seleccioná tu altura real para mejorar métricas, progreso y cálculos energéticos."
        value={{ whole: heightDraft.value }}
        onChange={(nextValue) => setHeightDraft({ value: nextValue.whole })}
        wholeOptions={buildNumberOptions(140, 220)}
        unitLabel="cm"
        onClose={() => setPickerState(null)}
        onConfirm={confirmPicker}
      />

      <NumberWheelPicker
        open={pickerState?.type === 'weight'}
        title="Peso actual"
        subtitle="Este valor se usa como punto de partida para estadísticas y recomendaciones."
        value={weightDraft}
        onChange={(nextValue) => setWeightDraft({ whole: nextValue.whole, decimal: nextValue.decimal ?? '0' })}
        wholeOptions={buildNumberOptions(40, 180)}
        decimalOptions={buildNumberOptions(0, 9)}
        unitLabel="kg"
        onClose={() => setPickerState(null)}
        onConfirm={confirmPicker}
      />

      <NumberWheelPicker
        open={pickerState?.type === 'targetWeight'}
        title="Peso objetivo"
        subtitle="Una referencia simple para orientar tu progreso dentro de WOHL."
        value={targetWeightDraft}
        onChange={(nextValue) =>
          setTargetWeightDraft({ whole: nextValue.whole, decimal: nextValue.decimal ?? '0' })
        }
        wholeOptions={buildNumberOptions(40, 180)}
        decimalOptions={buildNumberOptions(0, 9)}
        unitLabel="kg"
        onClose={() => setPickerState(null)}
        onConfirm={confirmPicker}
      />

      <TimeWheelPicker
        open={pickerState?.type === 'time'}
        title={pickerState?.type === 'time' && pickerState.day ? `Horario para ${pickerState.day}` : 'Horario principal'}
        subtitle="Dejá una hora cómoda y realista. Luego podés ajustarla cuando quieras."
        value={timeDraft}
        onChange={setTimeDraft}
        onClose={() => setPickerState(null)}
        onConfirm={confirmPicker}
      />
    </div>
  );
}
