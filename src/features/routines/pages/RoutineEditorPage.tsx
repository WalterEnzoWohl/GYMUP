import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { BookOpen, ChevronDown, ChevronUp, Dumbbell, Info, MoreVertical, Plus, RefreshCw, Save, Search, Timer, Trash2, TrendingUp, X } from 'lucide-react';
import { useAppData } from '@/core/app-data/AppDataContext';
import { useExerciseCatalog } from '@/features/exercises/hooks/useExerciseCatalog';
import { ActiveWorkoutEditLockModal } from '@/shared/components/layout/ActiveWorkoutEditLockModal';
import { Header } from '@/shared/components/layout/Header';
import { NumberWheelPicker } from '@/features/onboarding/components/WheelPickers';
import type { WheelPickerOption } from '@/features/onboarding/components/WheelPickers';
import type { Routine } from '@/shared/types/models';

const ALL_MUSCLES_OPTION = 'Todos';
const ALL_IMPLEMENTS_OPTION = 'Todos';

// Top 100 exercises in popularity order (English source titles from exercises.json)
// Headers like "Pecho/Tríceps" are omitted — only exercise names are included.
const POPULAR_ORDER_EN = [
  // Pecho/Tríceps
  'Incline Bench Press (Barbell)',
  'Incline Bench Press (Dumbbell)',
  'Overhead Triceps Extension (Cable)',
  'Bench Press (Barbell)',
  'Bench Press (Dumbbell)',
  'Bench Press (Cable)',
  'Bench Press (Smith Machine)',
  'Chest Dip (Weighted)',
  'Triceps Dip (Weighted)',
  'Chest Dip',
  'Butterfly (Pec Deck)',
  'Push Up',
  'Cable Fly Crossovers',
  'Chest Fly (Dumbbell)',
  'Decline Bench Press (Barbell)',
  'Chest Press (Machine)',
  'Triceps Rope Pushdown',
  'Triceps Pushdown',
  // Espalda/Bíceps
  'Pull Up',
  'Pull Up (Weighted)',
  'Preacher Curl (Barbell)',
  'Behind the Back Curl (Cable)',
  'Pullover (Machine)',
  'Pullover (Dumbbell)',
  'Bent Over Row (Barbell)',
  'Bent Over Row (Dumbbell)',
  'Lat Pulldown (Cable)',
  'Hammer Curl (Dumbbell)',
  'T Bar Row',
  'Dumbbell Row',
  'Inverted Row',
  'Seated Row (Machine)',
  'Bicep Curl (Barbell)',
  'EZ Bar Biceps Curl',
  'Bicep Curl (Dumbbell)',
  'Concentration Curl',
  // Hombros
  'Lateral Raise (Dumbbell)',
  'Lateral Raise (Cable)',
  'Lateral Raise (Machine)',
  'Overhead Press (Barbell)',
  'Overhead Press (Dumbbell)',
  'Shoulder Press (Dumbbell)',
  'Overhead Press (Smith Machine)',
  'Seated Shoulder Press (Machine)',
  'Shrug (Dumbbell)',
  'Shrug (Barbell)',
  'Arnold Press (Dumbbell)',
  'Face Pull',
  'Front Raise (Dumbbell)',
  'Rear Delt Reverse Fly (Dumbbell)',
  // Piernas
  'Squat (Barbell)',
  'Romanian Deadlift (Barbell)',
  'Romanian Deadlift (Dumbbell)',
  'Leg Extension (Machine)',
  'Seated Leg Curl (Machine)',
  'Deadlift (Barbell)',
  'Deadlift (Trap bar)',
  'Straight Leg Deadlift',
  'Sumo Deadlift',
  'Bulgarian Split Squat',
  'Goblet Squat',
  'Leg Press (Machine)',
  'Reverse Lunge (Dumbbell)',
  'Walking Lunge',
  'Lunge (Dumbbell)',
  'Calf Press (Machine)',
  'Seated Calf Raise',
  'Standing Calf Raise',
  'Front Squat',
  'Hack Squat',
  'Hack Squat (Machine)',
  'Hip Thrust (Barbell)',
  'Glute Bridge',
  'Hip Thrust',
  'Dumbbell Step Up',
  // Core/Antebrazos/Cuello
  'Cable Crunch',
  'Lying Neck Curls',
  'Lying Neck Extension',
  'Wrist Roller',
  'Plank',
  'Side Plank',
  'Hanging Leg Raise',
  'Back Extension (Hyperextension)',
  'Superman',
  'Ab Wheel',
  'Hanging Knee Raise',
  'Cable Core Palloff Press',
  'Bicycle Crunch',
  'Crunch',
  'Reverse Crunch',
  // Full body/Cardio
  'Farmers Walk',
  'Burpee',
  'Jump Rope',
  'Kettlebell Swing',
  'Rowing Machine',
  'Running',
  'Air Bike',
  'Boxing',
  'Battle Ropes',
  'Box Jump',
];

function normalizeForRanking(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

const POPULAR_RANK = new Map<string, number>(
  POPULAR_ORDER_EN.map((title, index) => [normalizeForRanking(title), index])
);

const REST_OPTIONS: WheelPickerOption[] = [
  { value: '30', label: '30s' },
  { value: '45', label: '45s' },
  { value: '60', label: '1min' },
  { value: '90', label: '1min 30s' },
  { value: '120', label: '2min' },
  { value: '180', label: '3min' },
  { value: '240', label: '4min' },
];
const REST_VALID_VALUES = new Set(REST_OPTIONS.map((o) => o.value));

type RoutineLibraryItem = {
  exerciseSlug?: string;
  name: string;
  titleEn?: string;
  muscle: string;
  implement?: string;
  secondaryMuscles?: string[];
  coverImageUrl?: string;
  animationMediaUrl?: string;
  animationMediaType?: string;
  instructions?: string[];
  overview?: string;
};

const fallbackExerciseLibrary: RoutineLibraryItem[] = [
  { name: 'Press de banca (barra)', muscle: 'Pecho', implement: 'Barra' },
  { name: 'Press inclinado', muscle: 'Pecho', implement: 'Barra' },
  { name: 'Aperturas con mancuernas', muscle: 'Pecho', implement: 'Mancuernas' },
  { name: 'Press militar', muscle: 'Hombros', implement: 'Barra' },
  { name: 'Elevaciones laterales', muscle: 'Hombros', implement: 'Mancuernas' },
  { name: 'Dominadas', muscle: 'Espalda', implement: 'Peso corporal' },
  { name: 'Remo con barra', muscle: 'Espalda', implement: 'Barra' },
  { name: 'Jalón al pecho', muscle: 'Espalda', implement: 'Máquina' },
  { name: 'Sentadilla', muscle: 'Piernas', implement: 'Barra' },
  { name: 'Peso muerto', muscle: 'Piernas', implement: 'Barra' },
  { name: 'Prensa de piernas', muscle: 'Piernas', implement: 'Máquina' },
  { name: 'Curl con barra', muscle: 'Bíceps', implement: 'Barra' },
  { name: 'Curl martillo', muscle: 'Bíceps', implement: 'Mancuernas' },
  { name: 'Extensiones de tríceps', muscle: 'Tríceps', implement: 'Polea' },
  { name: 'Rompecráneos', muscle: 'Tríceps', implement: 'Barra' },
  { name: 'Plancha', muscle: 'Core', implement: 'Peso corporal' },
];

type RoutineExerciseDraft = {
  exerciseSlug?: string;
  name: string;
  muscle: string;
  implement?: string;
  secondaryMuscles?: string[];
  sets: number;
  reps: number;
  kg: number;
  rpe?: number;
  restSeconds?: number;
};

type RoutineDayDraft = {
  name: string;
  exercises: RoutineExerciseDraft[];
};

function createEmptyDay(index: number): RoutineDayDraft {
  return {
    name: `Día ${index + 1}`,
    exercises: [],
  };
}

function isGenericDayName(name: string) {
  return /^d[ií]a\s+\d+$/i.test(name.trim());
}

function normalizeDayNames(days: RoutineDayDraft[]) {
  return days.map((day, index) =>
    isGenericDayName(day.name) ? { ...day, name: `Día ${index + 1}` } : day
  );
}

function buildInitialDays(existing: Routine | null) {
  if (existing?.days.length) {
    return existing.days.map((day) => ({
      name: day.name,
      exercises: day.exercises.map((exercise) => ({
        exerciseSlug: exercise.exerciseSlug,
        name: exercise.name,
        muscle: exercise.muscle,
        implement: exercise.implement,
        secondaryMuscles: exercise.secondaryMuscles,
        sets: exercise.sets.length || 3,
        reps: exercise.sets[0]?.reps || 10,
        kg: exercise.sets[0]?.kg ?? 0,
        rpe: exercise.sets[0]?.rpe,
        restSeconds: exercise.restSeconds,
      })),
    }));
  }

  const initialCount = Math.max(existing?.daysPerWeek ?? 4, 2);
  return Array.from({ length: initialCount }, (_, index) => createEmptyDay(index));
}

export default function RoutineEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeWorkout, routines, saveRoutine, sessionHistory, appSettings } = useAppData();
  const { catalog, error: catalogError, isLoading: isCatalogLoading } = useExerciseCatalog();
  const isNew = id === 'new';
  const existing = !isNew ? routines.find((routine) => routine.id === Number(id)) ?? null : null;
  const isEditingBlocked = Boolean(activeWorkout && !isNew && existing);
  const initialDays = buildInitialDays(existing);

  const [name, setName] = useState(existing?.name ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [nameError, setNameError] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(
    Math.max(existing?.daysPerWeek ?? initialDays.length, 2)
  );
  const [days, setDays] = useState<RoutineDayDraft[]>(initialDays);
  const [expandedDay, setExpandedDay] = useState(0);
  const [showExSearch, setShowExSearch] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState(ALL_MUSCLES_OPTION);
  const [selectedImplement, setSelectedImplement] = useState(ALL_IMPLEMENTS_OPTION);
  const [showMuscleSheet, setShowMuscleSheet] = useState(false);
  const [showImplementSheet, setShowImplementSheet] = useState(false);
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<RoutineLibraryItem | null>(null);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set(['0-0']));
  const [exerciseMenu, setExerciseMenu] = useState<{ dayIndex: number; exerciseIndex: number } | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<{ dayIndex: number; exerciseIndex: number } | null>(null);
  const [restPickerTarget, setRestPickerTarget] = useState<{ dayIndex: number; exerciseIndex: number } | null>(null);
  const [restPickerDraft, setRestPickerDraft] = useState('90');

  const exerciseLibrary = useMemo<RoutineLibraryItem[]>(
    () =>
      catalog.length > 0
        ? catalog
            .filter((exercise) => Boolean(exercise.coverImageUrl))
            .map((exercise) => ({
              exerciseSlug: exercise.slug,
              name: exercise.title,
              titleEn: exercise.slug
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase()),
              muscle: exercise.muscle,
              implement: exercise.implement,
              secondaryMuscles: exercise.secondaryMuscles,
              coverImageUrl: exercise.coverImageUrl,
              animationMediaUrl: exercise.animationMediaUrl,
              animationMediaType: exercise.animationMediaType,
              instructions: exercise.instructions,
              overview: exercise.overview,
            }))
            .sort((a, b) => {
              const keyA = normalizeForRanking(a.exerciseSlug?.replace(/-/g, ' ') ?? '');
              const keyB = normalizeForRanking(b.exerciseSlug?.replace(/-/g, ' ') ?? '');
              const rankA = POPULAR_RANK.get(keyA) ?? Infinity;
              const rankB = POPULAR_RANK.get(keyB) ?? Infinity;
              if (rankA !== rankB) return rankA - rankB;
              if (rankA === Infinity) return a.name.localeCompare(b.name, 'es');
              return 0;
            })
        : fallbackExerciseLibrary,
    [catalog]
  );

  const catalogBySlug = useMemo(
    () => new Map(exerciseLibrary.filter((e) => Boolean(e.coverImageUrl)).map((e) => [e.exerciseSlug ?? '', e])),
    [exerciseLibrary]
  );

  const muscleOptions = useMemo(
    () => [
      ALL_MUSCLES_OPTION,
      ...Array.from(new Set(exerciseLibrary.map((exercise) => exercise.muscle))).sort((a, b) =>
        a.localeCompare(b, 'es')
      ),
    ],
    [exerciseLibrary]
  );

  const implementOptions = useMemo(
    () => [
      ALL_IMPLEMENTS_OPTION,
      ...Array.from(new Set(exerciseLibrary.map((e) => e.implement).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b, 'es')
      ),
    ],
    [exerciseLibrary]
  );

  const filteredExercises = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return exerciseLibrary.filter((exercise) => {
      const matchMuscle = selectedMuscle === ALL_MUSCLES_OPTION || exercise.muscle === selectedMuscle;
      const matchImplement = selectedImplement === ALL_IMPLEMENTS_OPTION || exercise.implement === selectedImplement;
      const haystack = [exercise.name, exercise.muscle, exercise.implement ?? '']
        .join(' ')
        .toLowerCase();

      return matchMuscle && matchImplement && (!normalizedSearch || haystack.includes(normalizedSearch));
    });
  }, [exerciseLibrary, searchQuery, selectedMuscle, selectedImplement]);

  const recentExercises = useMemo(() => {
    const seen = new Set<string>();
    const result: RoutineLibraryItem[] = [];
    const sortedSessions = [...sessionHistory].sort((a, b) => b.isoDate.localeCompare(a.isoDate));
    for (const session of sortedSessions) {
      for (const ex of session.exercises) {
        if (!ex.exerciseSlug || seen.has(ex.exerciseSlug)) continue;
        const catalogEntry = catalogBySlug.get(ex.exerciseSlug);
        if (!catalogEntry) continue;
        seen.add(ex.exerciseSlug);
        result.push(catalogEntry);
        if (result.length >= 8) return result;
      }
    }
    return result;
  }, [sessionHistory, catalogBySlug]);

  const recommendedExercises = useMemo(() => {
    const currentDaySlugs = showExSearch !== null
      ? new Set(days[showExSearch]?.exercises.map((e) => e.exerciseSlug).filter(Boolean))
      : new Set<string>();
    return exerciseLibrary.filter((e) => e.exerciseSlug && !currentDaySlugs.has(e.exerciseSlug)).slice(0, 6);
  }, [exerciseLibrary, days, showExSearch]);

  const syncDayCount = (nextCount: number) => {
    if (nextCount === days.length) {
      setDaysPerWeek(nextCount);
      return;
    }

    if (nextCount < days.length) {
      const removedDays = days.slice(nextCount);
      const willDeleteExercises = removedDays.some((day) => day.exercises.length > 0);

      if (
        willDeleteExercises &&
        !window.confirm('Los días que quites también van a borrar sus ejercicios. ¿Querés continuar?')
      ) {
        return;
      }
    }

    setDaysPerWeek(nextCount);
    setDays((previous) => {
      if (previous.length < nextCount) {
        return [
          ...previous,
          ...Array.from({ length: nextCount - previous.length }, (_, index) =>
            createEmptyDay(previous.length + index)
          ),
        ];
      }

      return normalizeDayNames(previous.slice(0, nextCount));
    });
    setExpandedDay((current) => (current >= nextCount ? nextCount - 1 : current));
    setShowExSearch((current) => (current !== null && current >= nextCount ? null : current));
  };

  const addDay = () => {
    if (days.length >= 7) {
      return;
    }

    const nextCount = days.length + 1;
    setDays((previous) => [...previous, createEmptyDay(previous.length)]);
    setDaysPerWeek(nextCount);
    setExpandedDay(nextCount - 1);
  };

  const removeDay = (dayIndex: number) => {
    if (days.length <= 2) {
      return;
    }

    const dayToRemove = days[dayIndex];
    if (
      dayToRemove.exercises.length > 0 &&
      !window.confirm(`Se eliminará ${dayToRemove.name} con todos sus ejercicios. ¿Querés continuar?`)
    ) {
      return;
    }

    setDays((previous) => normalizeDayNames(previous.filter((_, index) => index !== dayIndex)));
    setDaysPerWeek((previous) => Math.max(2, previous - 1));
    setExpandedDay((current) => {
      if (current === dayIndex) {
        return Math.max(0, dayIndex - 1);
      }

      return current > dayIndex ? current - 1 : current;
    });
    setShowExSearch((current) => {
      if (current === null) {
        return null;
      }

      if (current === dayIndex) {
        return null;
      }

      return current > dayIndex ? current - 1 : current;
    });
  };

  const addExercise = (dayIndex: number, exercise: RoutineLibraryItem) => {
    setDays((previous) =>
      previous.map((day, index) => {
        if (index !== dayIndex) return day;
        if (replaceTarget !== null && replaceTarget.dayIndex === dayIndex) {
          return {
            ...day,
            exercises: day.exercises.map((ex, ei) =>
              ei !== replaceTarget.exerciseIndex
                ? ex
                : {
                    exerciseSlug: exercise.exerciseSlug,
                    name: exercise.name,
                    muscle: exercise.muscle,
                    implement: exercise.implement,
                    secondaryMuscles: exercise.secondaryMuscles,
                    sets: ex.sets,
                    reps: ex.reps,
                    kg: ex.kg,
                    restSeconds: ex.restSeconds,
                  }
            ),
          };
        }
        return {
          ...day,
          exercises: [
            ...day.exercises,
            {
              exerciseSlug: exercise.exerciseSlug,
              name: exercise.name,
              muscle: exercise.muscle,
              implement: exercise.implement,
              secondaryMuscles: exercise.secondaryMuscles,
              sets: 3,
              reps: 10,
              kg: 0,
            },
          ],
        };
      })
    );
    setReplaceTarget(null);
    setShowExSearch(null);
    setSearchQuery('');
    setSelectedMuscle(ALL_MUSCLES_OPTION);
    setSelectedImplement(ALL_IMPLEMENTS_OPTION);
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    setDays((previous) =>
      previous.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              exercises: day.exercises.filter(
                (_, currentExerciseIndex) => currentExerciseIndex !== exerciseIndex
              ),
            }
          : day
      )
    );
  };

  const toggleExercise = (dayIndex: number, exerciseIndex: number) => {
    const key = `${dayIndex}-${exerciseIndex}`;
    setExpandedExercises((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const updateExercise = (
    dayIndex: number,
    exerciseIndex: number,
    field: 'sets' | 'reps' | 'kg',
    value: number
  ) => {
    const nextValue =
      field === 'kg'
        ? Number.isFinite(value) && value >= 0 ? value : 0
        : Number.isFinite(value) && value > 0 ? value : 1;

    setDays((previous) =>
      previous.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              exercises: day.exercises.map((exercise, currentExerciseIndex) =>
                currentExerciseIndex === exerciseIndex
                  ? { ...exercise, [field]: nextValue }
                  : exercise
              ),
            }
          : day
      )
    );
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!name.trim()) {
      setNameError('Tu rutina necesita un nombre para poder guardarse.');
      return;
    }

    const hasAnyExercise = days.some((day) => day.exercises.length > 0);
    if (!hasAnyExercise) {
      setSaveError('Agregá al menos un ejercicio a algún día antes de guardar la rutina.');
      return;
    }

    const routineToSave: Routine = {
      id: existing?.id ?? 0,
      name: name.trim(),
      daysPerWeek: days.length,
      color: existing?.color ?? '#00C9A7',
      categories: existing?.categories ?? [],
      description: existing?.description ?? 'Sistema personalizado creado en WOHL.',
      tags: existing?.tags ?? ['PERSONALIZADA'],
      avgMinutes: existing?.avgMinutes ?? 75,
      days: days.map((day, dayIndex) => ({
        name: day.name.trim() || `Día ${dayIndex + 1}`,
        focus:
          day.exercises.map((exercise) => exercise.muscle).slice(0, 3).join(', ') ||
          'Sesión personalizada',
        exercises: day.exercises.map((exercise, exerciseIndex) => ({
          id: exerciseIndex + 1,
          exerciseSlug: exercise.exerciseSlug,
          name: exercise.name,
          muscle: exercise.muscle,
          implement: exercise.implement,
          secondaryMuscles: exercise.secondaryMuscles,
          restSeconds: exercise.restSeconds,
          sets: Array.from({ length: exercise.sets }, (_, setIndex) => ({
            id: setIndex + 1,
            kg: exercise.kg,
            reps: exercise.reps,
            rpe: exercise.rpe ?? 0,
            completed: false,
            kind: 'normal' as const,
          })),
        })),
      })),
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      await saveRoutine(routineToSave);
      navigate('/');
    } catch (error) {
      const cause = error instanceof Error ? (error.cause as Error | undefined) : undefined;
      const detail = cause ? ` (${cause instanceof Error ? cause.message : String(cause)})` : '';
      setSaveError(`${error instanceof Error ? error.message : 'No se pudo guardar la rutina. Intentá de nuevo.'}${detail}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header showBack title={isNew ? 'Crear rutina' : 'Editar rutina'} />

      {!isEditingBlocked ? (
        <div className="flex flex-col gap-5 px-5 py-5 pb-6">
          <div>
            <label
              className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[#9BAEC1]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Nombre de la rutina
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (nameError && event.target.value.trim()) {
                  setNameError('');
                }
              }}
              placeholder="Poné un nombre para este sistema"
              className={`w-full rounded-xl border bg-[#13263A] px-4 py-3 text-base text-white outline-none transition-colors ${
                nameError
                  ? 'border-[rgba(255,125,125,0.45)]'
                  : 'border-[#203347] focus:border-[rgba(0,201,167,0.4)]'
              }`}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
            {nameError ? (
              <p className="mt-2 text-sm text-[#FF8E8E]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {nameError}
              </p>
            ) : null}
          </div>

          <div>
            <label
              className="mb-3 block text-xs font-semibold uppercase tracking-widest text-[#9BAEC1]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Días por semana
            </label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6, 7].map((dayCount) => (
                <button
                  key={dayCount}
                  onClick={() => syncDayCount(dayCount)}
                  className={`h-10 w-10 rounded-xl text-sm font-bold transition-all ${
                    daysPerWeek === dayCount
                      ? 'bg-[#00C9A7] text-black'
                      : 'border border-[#203347] bg-[#1A2D42] text-[#9BAEC1]'
                  }`}
                  type="button"
                >
                  {dayCount}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-4">
              <label
                className="text-xs font-semibold uppercase tracking-widest text-[#9BAEC1]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Días de entrenamiento
              </label>
              <span className="text-xs text-[#6F859A]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {days.length} días armados
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {days.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className="overflow-hidden rounded-2xl border border-[#203347] bg-[#13263A]"
                >
                  <div className="flex w-full items-center justify-between px-4 py-4">
                    <div className="min-w-0 flex-1 text-left">
                      <input
                        type="text"
                        value={day.name}
                        onChange={(event) => {
                          const nextName = event.target.value;
                          setDays((previous) =>
                            previous.map((currentDay, index) =>
                              index === dayIndex ? { ...currentDay, name: nextName } : currentDay
                            )
                          );
                        }}
                        onClick={(event) => event.stopPropagation()}
                        className="w-full bg-transparent text-base font-semibold text-white outline-none"
                      />
                      <p className="mt-0.5 text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {day.exercises.length} ejercicios
                      </p>
                    </div>

                    <div className="ml-4 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={days.length <= 2}
                        onClick={(event) => {
                          event.stopPropagation();
                          removeDay(dayIndex);
                        }}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                          days.length <= 2
                            ? 'border-[#203347] text-[#4F6378] opacity-45'
                            : 'border-[rgba(255,125,125,0.18)] bg-[rgba(255,125,125,0.08)] text-[#FF8E8E] active:bg-[rgba(255,125,125,0.14)]'
                        }`}
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => setExpandedDay(expandedDay === dayIndex ? -1 : dayIndex)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#203347] bg-[#1A2D42] text-[#9BAEC1] transition-colors active:bg-[#203347]"
                        type="button"
                        aria-label={expandedDay === dayIndex ? 'Contraer día' : 'Expandir día'}
                      >
                        {expandedDay === dayIndex ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {expandedDay === dayIndex ? (
                    <div className="border-t border-[#203347] px-4 pb-4">
                      {day.exercises.length === 0 ? (
                        <p
                          className="py-4 text-center text-sm text-[#9BAEC1]"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          No hay ejercicios todavía. Sumá uno desde el catálogo.
                        </p>
                      ) : (
                        <div className="mt-3 flex flex-col gap-2">
                          {day.exercises.map((exercise, exerciseIndex) => {
                            const catalogEntry = exercise.exerciseSlug ? catalogBySlug.get(exercise.exerciseSlug) : undefined;
                            const exerciseKey = `${dayIndex}-${exerciseIndex}`;
                            const isExpanded = expandedExercises.has(exerciseKey);
                            return (
                              <div
                                key={exerciseKey}
                                className="overflow-hidden rounded-2xl border border-[#203347] bg-[#13263A]"
                              >
                                {/* Accordion header */}
                                <div className="flex items-center gap-2 px-3 py-3">
                                  {catalogEntry?.coverImageUrl ? (
                                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full">
                                      <img src={catalogEntry.coverImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                                    </div>
                                  ) : (
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(0,201,167,0.15)] bg-[rgba(0,201,167,0.08)]">
                                      <Dumbbell size={16} className="text-[#00C9A7]" />
                                    </div>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => toggleExercise(dayIndex, exerciseIndex)}
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <p className="truncate text-sm font-semibold text-white">{exercise.name}</p>
                                    <p className="truncate text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                                      {[exercise.muscle, exercise.implement].filter(Boolean).join(' · ')}
                                    </p>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setExerciseMenu({ dayIndex, exerciseIndex })}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9BAEC1] transition-colors active:bg-[#203347]"
                                    aria-label="Opciones"
                                  >
                                    <MoreVertical size={16} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleExercise(dayIndex, exerciseIndex)}
                                    className="flex h-8 w-8 items-center justify-center text-[#9BAEC1]"
                                  >
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </button>
                                </div>

                                {/* Expanded section */}
                                {isExpanded ? (
                                  <div className="border-t border-[#203347] pb-4">
                                    {/* Table header */}
                                    <div className="grid grid-cols-3 gap-2 bg-[rgba(255,255,255,0.03)] px-4 py-2">
                                      {['Serie', 'Kg', 'Reps'].map((col) => (
                                        <span key={col} className="text-center text-[10px] font-semibold uppercase tracking-wider text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                                          {col}
                                        </span>
                                      ))}
                                    </div>

                                    {/* Set rows */}
                                    {Array.from({ length: exercise.sets }, (_, setIndex) => (
                                      <div key={setIndex} className="grid grid-cols-3 gap-2 items-center border-t border-[rgba(255,255,255,0.03)] px-4 py-2.5">
                                        <span className="text-center text-sm text-[#9BAEC1]">{setIndex + 1}</span>
                                        <input
                                          type="number"
                                          min={0}
                                          value={exercise.kg}
                                          onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'kg', Number(e.target.value))}
                                          className="w-full rounded-lg bg-[#203347] py-1.5 text-center text-sm font-medium text-white outline-none"
                                        />
                                        <input
                                          type="number"
                                          min={1}
                                          value={exercise.reps}
                                          onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'reps', Number(e.target.value))}
                                          className="w-full rounded-lg bg-[#203347] py-1.5 text-center text-sm font-medium text-white outline-none"
                                        />
                                      </div>
                                    ))}

                                    {/* Sets count control */}
                                    <div className="mx-4 mt-3 flex items-center justify-between rounded-xl bg-[#1A2D42] px-4 py-2.5">
                                      <span className="text-xs font-semibold uppercase tracking-wider text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                                        Series
                                      </span>
                                      <div className="flex items-center gap-4">
                                        <button
                                          type="button"
                                          onClick={() => updateExercise(dayIndex, exerciseIndex, 'sets', exercise.sets - 1)}
                                          disabled={exercise.sets <= 1}
                                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#203347] text-lg font-bold text-[#9BAEC1] disabled:opacity-40"
                                        >
                                          −
                                        </button>
                                        <span className="w-4 text-center text-sm font-bold text-white">{exercise.sets}</span>
                                        <button
                                          type="button"
                                          onClick={() => updateExercise(dayIndex, exerciseIndex, 'sets', exercise.sets + 1)}
                                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#203347] text-lg font-bold text-[#00C9A7]"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setShowExSearch(dayIndex);
                          setSearchQuery('');
                          setSelectedMuscle(ALL_MUSCLES_OPTION);
                          setSelectedImplement(ALL_IMPLEMENTS_OPTION);
                        }}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(0,201,167,0.3)] py-3 text-sm font-semibold text-[#00C9A7]"
                        type="button"
                      >
                        <Plus size={14} />
                        Añadir ejercicio
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {days.length < 7 ? (
              <button
                onClick={addDay}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(0,201,167,0.28)] bg-[rgba(0,201,167,0.06)] px-4 py-4 text-[#00C9A7] transition-colors active:bg-[rgba(0,201,167,0.12)]"
                type="button"
              >
                <Plus size={16} />
                <span className="text-sm font-semibold">Agregar día de entrenamiento</span>
              </button>
            ) : null}
          </div>

          {saveError ? (
            <div
              className="rounded-2xl border border-[rgba(255,125,125,0.22)] bg-[rgba(255,125,125,0.08)] px-4 py-3 text-sm text-[#FFB4B4]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {saveError}
            </div>
          ) : null}

          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 shadow-[0_0_15px_rgba(0,201,167,0.2)] disabled:opacity-50"
            type="button"
          >
            <Save size={18} className="text-black" />
            <span className="text-base font-bold text-black">{isSaving ? 'Guardando...' : 'Guardar rutina'}</span>
          </button>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {showExSearch !== null && !isEditingBlocked ? (
        <div className="absolute inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowExSearch(null)} />
          <div
            className="absolute bottom-0 left-0 right-0 flex max-h-[80%] flex-col rounded-t-3xl"
            style={{ background: '#1A2D42' }}
          >
            <div className="mx-auto mb-3 mt-4 h-1 w-10 shrink-0 rounded-full bg-[#203347]" />

            <div className="shrink-0 px-5 pb-4">
              <h3 className="mb-3 text-lg font-bold text-white">Catálogo de ejercicios</h3>
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BAEC1]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar por nombre, músculo o implemento"
                  className="w-full rounded-xl border border-[#333] bg-[#203347] py-3 pl-9 pr-4 text-sm text-white outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowMuscleSheet(true); setShowImplementSheet(false); }}
                  className={`flex-1 truncate rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                    selectedMuscle !== ALL_MUSCLES_OPTION
                      ? 'border-[rgba(0,201,167,0.4)] bg-[rgba(0,201,167,0.1)] text-[#00C9A7]'
                      : 'border-[#333] bg-[#203347] text-[#9BAEC1]'
                  }`}
                >
                  {selectedMuscle === ALL_MUSCLES_OPTION ? 'Todos Músculos' : selectedMuscle}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowImplementSheet(true); setShowMuscleSheet(false); }}
                  className={`flex-1 truncate rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                    selectedImplement !== ALL_IMPLEMENTS_OPTION
                      ? 'border-[rgba(0,201,167,0.4)] bg-[rgba(0,201,167,0.1)] text-[#00C9A7]'
                      : 'border-[#333] bg-[#203347] text-[#9BAEC1]'
                  }`}
                >
                  {selectedImplement === ALL_IMPLEMENTS_OPTION ? 'Todo Equipamiento' : selectedImplement}
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-5 pb-6">
              {catalogError ? (
                <div className="mb-3 rounded-2xl border border-[rgba(255,125,125,0.22)] bg-[rgba(255,125,125,0.08)] px-4 py-3 text-sm text-[#FFB4B4]">
                  {catalogError}. Por ahora te mostramos una base local de respaldo.
                </div>
              ) : null}

              {isCatalogLoading && catalog.length === 0 ? (
                <div className="mb-3 rounded-2xl border border-[#203347] bg-[#13263A] px-4 py-5 text-center text-sm text-[#9BAEC1]">
                  Cargando catálogo de ejercicios...
                </div>
              ) : null}

              {!searchQuery.trim() && recentExercises.length > 0 ? (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Recientes
                  </p>
                  <div className="flex flex-col gap-2">
                    {recentExercises.map((exercise) => (
                      <div
                        key={`recent-${exercise.exerciseSlug ?? exercise.name}`}
                        className="flex items-center gap-3 rounded-xl bg-[#203347] px-3 py-2.5"
                      >
                        {exercise.coverImageUrl ? (
                          <img
                            src={exercise.coverImageUrl}
                            alt=""
                            className="h-11 w-11 shrink-0 cursor-pointer rounded-lg object-cover"
                            loading="lazy"
                            onClick={() => setSelectedExerciseDetail(exercise)}
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{exercise.name}</p>
                          <p className="truncate text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                            {[exercise.muscle, exercise.implement].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedExerciseDetail(exercise)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9BAEC1] transition-colors active:bg-[#2A415A]"
                            aria-label="Ver detalles"
                          >
                            <Info size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => addExercise(showExSearch!, exercise)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(0,201,167,0.15)] text-[#00C9A7] transition-colors active:bg-[rgba(0,201,167,0.25)]"
                            aria-label="Agregar ejercicio"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {!searchQuery.trim() && recommendedExercises.length > 0 ? (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Recomendados
                  </p>
                  <div className="flex flex-col gap-2">
                    {recommendedExercises.map((exercise) => (
                      <div
                        key={`rec-${exercise.exerciseSlug ?? exercise.name}`}
                        className="flex items-center gap-3 rounded-xl bg-[#203347] px-3 py-2.5"
                      >
                        {exercise.coverImageUrl ? (
                          <img
                            src={exercise.coverImageUrl}
                            alt=""
                            className="h-11 w-11 shrink-0 cursor-pointer rounded-lg object-cover"
                            loading="lazy"
                            onClick={() => setSelectedExerciseDetail(exercise)}
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{exercise.name}</p>
                          <p className="truncate text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                            {[exercise.muscle, exercise.implement].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedExerciseDetail(exercise)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9BAEC1] transition-colors active:bg-[#2A415A]"
                            aria-label="Ver detalles"
                          >
                            <Info size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => addExercise(showExSearch!, exercise)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(0,201,167,0.15)] text-[#00C9A7] transition-colors active:bg-[rgba(0,201,167,0.25)]"
                            aria-label="Agregar ejercicio"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                {filteredExercises.map((exercise) => (
                  <div
                    key={exercise.exerciseSlug ?? exercise.name}
                    className="flex items-center gap-3 rounded-xl bg-[#203347] px-3 py-2.5"
                  >
                    {exercise.coverImageUrl ? (
                      <img
                        src={exercise.coverImageUrl}
                        alt=""
                        className="h-11 w-11 shrink-0 cursor-pointer rounded-lg object-cover"
                        loading="lazy"
                        onClick={() => setSelectedExerciseDetail(exercise)}
                      />
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{exercise.name}</p>
                      <p className="truncate text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {[exercise.muscle, exercise.implement].filter(Boolean).join(' · ')}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedExerciseDetail(exercise)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9BAEC1] transition-colors active:bg-[#2A415A]"
                        aria-label="Ver detalles"
                      >
                        <Info size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => addExercise(showExSearch, exercise)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(0,201,167,0.15)] text-[#00C9A7] transition-colors active:bg-[rgba(0,201,167,0.25)]"
                        aria-label="Agregar ejercicio"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {!isCatalogLoading && filteredExercises.length === 0 ? (
                  <div className="rounded-2xl border border-[#203347] bg-[#13263A] px-4 py-5 text-center text-sm text-[#9BAEC1]">
                    No encontramos ejercicios con ese filtro.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {exerciseMenu !== null ? (
        <div className="absolute inset-0 z-[55]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setExerciseMenu(null)} />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl"
            style={{ background: '#1A2D42' }}
          >
            <div className="mx-auto mb-3 mt-4 h-1 w-10 rounded-full bg-[#203347]" />
            <div className="px-5 pb-8">
              <p className="mb-1 truncate text-base font-bold text-white">
                {days[exerciseMenu.dayIndex]?.exercises[exerciseMenu.exerciseIndex]?.name}
              </p>
              <p className="mb-4 text-xs text-[#6F859A]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {days[exerciseMenu.dayIndex]?.exercises[exerciseMenu.exerciseIndex]?.muscle}
              </p>

              <button
                type="button"
                onClick={() => {
                  const ex = days[exerciseMenu.dayIndex]?.exercises[exerciseMenu.exerciseIndex];
                  if (ex?.exerciseSlug) setSelectedExerciseDetail(catalogBySlug.get(ex.exerciseSlug) ?? null);
                  setExerciseMenu(null);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-sm font-semibold text-[#9BAEC1] transition-colors active:bg-[#203347]"
              >
                <BookOpen size={18} className="shrink-0" />
                Ver instrucciones / forma correcta
              </button>

              <button
                type="button"
                onClick={() => {
                  const ex = days[exerciseMenu.dayIndex]?.exercises[exerciseMenu.exerciseIndex];
                  if (ex?.exerciseSlug) void navigate(`/muscle-progress/${ex.exerciseSlug}`);
                  setExerciseMenu(null);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-sm font-semibold text-[#9BAEC1] transition-colors active:bg-[#203347]"
              >
                <TrendingUp size={18} className="shrink-0" />
                Ver historial de este ejercicio
              </button>

              <button
                type="button"
                onClick={() => {
                  const { dayIndex, exerciseIndex } = exerciseMenu;
                  setReplaceTarget({ dayIndex, exerciseIndex });
                  setShowExSearch(dayIndex);
                  setSearchQuery('');
                  setSelectedMuscle(ALL_MUSCLES_OPTION);
                  setSelectedImplement(ALL_IMPLEMENTS_OPTION);
                  setExerciseMenu(null);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-sm font-semibold text-[#9BAEC1] transition-colors active:bg-[#203347]"
              >
                <RefreshCw size={18} className="shrink-0" />
                Reemplazar ejercicio
              </button>

              <button
                type="button"
                onClick={() => {
                  const ex = days[exerciseMenu.dayIndex]?.exercises[exerciseMenu.exerciseIndex];
                  const current = ex?.restSeconds ?? appSettings.restTimerSeconds;
                  setRestPickerDraft(REST_VALID_VALUES.has(String(current)) ? String(current) : '90');
                  setRestPickerTarget(exerciseMenu);
                  setExerciseMenu(null);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-sm font-semibold text-[#9BAEC1] transition-colors active:bg-[#203347]"
              >
                <Timer size={18} className="shrink-0" />
                Tiempo de descanso
              </button>

              <div className="my-2 border-t border-[#203347]" />

              <button
                type="button"
                onClick={() => {
                  const { dayIndex, exerciseIndex } = exerciseMenu;
                  removeExercise(dayIndex, exerciseIndex);
                  setExerciseMenu(null);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-sm font-semibold text-[#FF8E8E] transition-colors active:bg-[rgba(255,125,125,0.08)]"
              >
                <Trash2 size={18} className="shrink-0" />
                Eliminar ejercicio
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <NumberWheelPicker
        open={restPickerTarget !== null}
        title="Descanso"
        subtitle="Tiempo entre series"
        value={{ whole: restPickerDraft }}
        onChange={(v) => setRestPickerDraft(v.whole)}
        onClose={() => setRestPickerTarget(null)}
        onConfirm={() => {
          if (restPickerTarget === null) return;
          const { dayIndex, exerciseIndex } = restPickerTarget;
          const seconds = Number(restPickerDraft);
          setDays((previous) =>
            previous.map((day, di) =>
              di !== dayIndex
                ? day
                : {
                    ...day,
                    exercises: day.exercises.map((ex, ei) =>
                      ei !== exerciseIndex ? ex : { ...ex, restSeconds: seconds }
                    ),
                  }
            )
          );
          setRestPickerTarget(null);
        }}
        wholeOptions={REST_OPTIONS}
      />

      {showMuscleSheet ? (
        <div className="absolute inset-0 z-[55]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMuscleSheet(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl"
            style={{ background: '#1A2D42' }}
          >
            <div className="mx-auto mb-3 mt-4 h-1 w-10 rounded-full bg-[#203347]" />
            <div className="px-5 pb-8">
              <h3 className="mb-3 text-base font-bold text-white">Músculo</h3>
              <div className="flex flex-col gap-1">
                {muscleOptions.map((muscle) => (
                  <button
                    key={muscle}
                    type="button"
                    onClick={() => { setSelectedMuscle(muscle); setShowMuscleSheet(false); }}
                    className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                      selectedMuscle === muscle ? 'bg-[rgba(0,201,167,0.12)] text-[#00C9A7]' : 'text-[#9BAEC1] active:bg-[#203347]'
                    }`}
                  >
                    {muscle}
                    {selectedMuscle === muscle ? <div className="h-2 w-2 rounded-full bg-[#00C9A7]" /> : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showImplementSheet ? (
        <div className="absolute inset-0 z-[55]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowImplementSheet(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl"
            style={{ background: '#1A2D42' }}
          >
            <div className="mx-auto mb-3 mt-4 h-1 w-10 rounded-full bg-[#203347]" />
            <div className="px-5 pb-8">
              <h3 className="mb-3 text-base font-bold text-white">Equipamiento</h3>
              <div className="flex flex-col gap-1">
                {implementOptions.map((implement) => (
                  <button
                    key={implement}
                    type="button"
                    onClick={() => { setSelectedImplement(implement); setShowImplementSheet(false); }}
                    className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                      selectedImplement === implement ? 'bg-[rgba(0,201,167,0.12)] text-[#00C9A7]' : 'text-[#9BAEC1] active:bg-[#203347]'
                    }`}
                  >
                    {implement}
                    {selectedImplement === implement ? <div className="h-2 w-2 rounded-full bg-[#00C9A7]" /> : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedExerciseDetail ? (
        <div className="absolute inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setSelectedExerciseDetail(null)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 flex max-h-[88%] flex-col rounded-t-3xl"
            style={{ background: '#1A2D42' }}
          >
            <div className="mx-auto mb-3 mt-4 h-1 w-10 shrink-0 rounded-full bg-[#203347]" />

            <div className="overflow-y-auto">
              {selectedExerciseDetail.animationMediaUrl ? (
                <video
                  key={selectedExerciseDetail.animationMediaUrl}
                  src={selectedExerciseDetail.animationMediaUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full"
                  style={{ maxHeight: '260px', objectFit: 'cover' }}
                />
              ) : null}

              <div className="px-5 pb-8 pt-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold leading-tight text-white">
                      {selectedExerciseDetail.name}
                    </h2>
                    {selectedExerciseDetail.titleEn ? (
                      <p className="mt-0.5 text-sm text-[#6F859A]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {selectedExerciseDetail.titleEn}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedExerciseDetail(null)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#203347] text-[#9BAEC1]"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[rgba(0,201,167,0.12)] px-3 py-1 text-xs font-semibold text-[#00C9A7]">
                    {selectedExerciseDetail.muscle}
                  </span>
                  {selectedExerciseDetail.secondaryMuscles?.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-[rgba(155,174,193,0.1)] px-3 py-1 text-xs font-medium text-[#9BAEC1]"
                    >
                      {m}
                    </span>
                  ))}
                  {selectedExerciseDetail.implement ? (
                    <span className="rounded-full bg-[rgba(127,152,255,0.12)] px-3 py-1 text-xs font-semibold text-[#7F98FF]">
                      {selectedExerciseDetail.implement}
                    </span>
                  ) : null}
                </div>

                {selectedExerciseDetail.overview ? (
                  <p className="mb-5 text-sm leading-relaxed text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {selectedExerciseDetail.overview}
                  </p>
                ) : null}

                {selectedExerciseDetail.instructions && selectedExerciseDetail.instructions.length > 0 ? (
                  <div className="mb-5">
                    <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Instrucciones
                    </p>
                    <ol className="flex flex-col gap-2.5">
                      {selectedExerciseDetail.instructions.map((step, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(0,201,167,0.15)] text-[10px] font-bold text-[#00C9A7]">
                            {index + 1}
                          </span>
                          <p className="text-sm leading-relaxed text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
                            {step}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    if (showExSearch !== null) {
                      addExercise(showExSearch, selectedExerciseDetail);
                    }
                    setSelectedExerciseDetail(null);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 font-bold text-black"
                >
                  <Plus size={16} />
                  Agregar a este día
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isEditingBlocked && activeWorkout ? (
        <ActiveWorkoutEditLockModal
          activeWorkoutName={activeWorkout.sessionName}
          onResume={() => navigate('/session')}
          onFinish={() => navigate('/session', { state: { action: 'finish' } })}
          onCancel={() => navigate(-1)}
        />
      ) : null}
    </div>
  );
}
