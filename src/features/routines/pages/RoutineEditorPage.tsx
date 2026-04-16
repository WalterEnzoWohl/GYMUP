import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBeforeUnload, useBlocker, useLocation, useNavigate, useParams } from 'react-router';
import { BookOpen, ChevronDown, ChevronUp, Dumbbell, MoreVertical, Plus, RefreshCw, Save, Timer, Trash2, TrendingUp } from 'lucide-react';
import { useAppData } from '@/core/app-data/AppDataContext';
import { useExerciseCatalog } from '@/features/exercises/hooks/useExerciseCatalog';
import { ExerciseDetailSheet } from '@/features/exercises/components/ExerciseDetailSheet';
import type { CatalogExerciseItem } from '@/features/exercises/components/ExerciseDetailSheet';
import { ActiveWorkoutEditLockModal } from '@/shared/components/layout/ActiveWorkoutEditLockModal';
import { Header } from '@/shared/components/layout/Header';
import { NumberWheelPicker } from '@/features/onboarding/components/WheelPickers';
import type { WheelPickerOption } from '@/features/onboarding/components/WheelPickers';
import type { Routine } from '@/shared/types/models';

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
  const location = useLocation();
  const { activeWorkout, routines, saveRoutine, appSettings } = useAppData();
  const { catalog } = useExerciseCatalog();
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
  const [expandedDay, setExpandedDay] = useState(-1);
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<CatalogExerciseItem | null>(null);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const [exerciseMenu, setExerciseMenu] = useState<{ dayIndex: number; exerciseIndex: number } | null>(null);
  const [restPickerTarget, setRestPickerTarget] = useState<{ dayIndex: number; exerciseIndex: number } | null>(null);
  const [restPickerDraft, setRestPickerDraft] = useState('90');

  const initialNameRef = useRef(existing?.name ?? '');
  const initialDaysJsonRef = useRef(JSON.stringify(initialDays));
  const initialDaysPerWeekRef = useRef(Math.max(existing?.daysPerWeek ?? initialDays.length, 2));
  const skipBlockerRef = useRef(false);

  // Map slug → catalog summary for thumbnail images and detail view
  const catalogBySlug = useMemo(
    () => new Map(catalog.map((e) => [e.slug, e])),
    [catalog]
  );

  // Process result when returning from ExerciseCatalogPage
  useEffect(() => {
    const result = (
      location.state as {
        catalogResult?: {
          exercises: CatalogExerciseItem[];
          dayIndex: number;
          mode: 'add' | 'replace';
          replaceIndex?: number;
        };
      }
    )?.catalogResult;

    if (!result) return;

    // Clear state so it doesn't reprocess on next render
    navigate(location.pathname, { replace: true, state: {} });

    const { exercises, dayIndex: targetDay, mode: returnMode, replaceIndex } = result;

    if (returnMode === 'replace' && replaceIndex !== undefined && exercises[0]) {
      const ex = exercises[0];
      setDays((previous) =>
        previous.map((day, di) => {
          if (di !== targetDay) return day;
          return {
            ...day,
            exercises: day.exercises.map((existing, ei) =>
              ei !== replaceIndex
                ? existing
                : {
                    exerciseSlug: ex.exerciseSlug,
                    name: ex.name,
                    muscle: ex.muscle,
                    implement: ex.implement,
                    secondaryMuscles: ex.secondaryMuscles,
                    sets: existing.sets,
                    reps: existing.reps,
                    kg: existing.kg,
                    restSeconds: existing.restSeconds,
                  }
            ),
          };
        })
      );
      setExpandedDay(targetDay);
    } else if (returnMode === 'add') {
      setDays((previous) =>
        previous.map((day, di) => {
          if (di !== targetDay) return day;
          const remaining = 15 - day.exercises.length;
          const toAdd = exercises.slice(0, remaining);
          return {
            ...day,
            exercises: [
              ...day.exercises,
              ...toAdd.map((ex) => ({
                exerciseSlug: ex.exerciseSlug,
                name: ex.name,
                muscle: ex.muscle,
                implement: ex.implement,
                secondaryMuscles: ex.secondaryMuscles,
                sets: 3,
                reps: 10,
                kg: 0,
              })),
            ],
          };
        })
      );
      setExpandedDay(targetDay);
    }
  }, [location.state]);

  const hasUnsavedChanges = useMemo(
    () =>
      !isSaving &&
      (name !== initialNameRef.current ||
        daysPerWeek !== initialDaysPerWeekRef.current ||
        JSON.stringify(days) !== initialDaysJsonRef.current),
    [name, daysPerWeek, days, isSaving]
  );

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) => {
        if (skipBlockerRef.current) return false;
        if (currentLocation.pathname === nextLocation.pathname) return false;
        if (nextLocation.pathname === '/exercise-catalog') return false;
        return hasUnsavedChanges;
      },
      [hasUnsavedChanges]
    )
  );

  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (hasUnsavedChanges) {
          event.preventDefault();
        }
      },
      [hasUnsavedChanges]
    )
  );

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

  const openCatalog = (dayIndex: number) => {
    const day = days[dayIndex];
    if (!day) return;
    navigate('/exercise-catalog', {
      state: {
        dayIndex,
        dayName: day.name,
        mode: 'add',
        existingDaySlugs: day.exercises.map((e) => e.exerciseSlug).filter(Boolean),
        currentDayExerciseCount: day.exercises.length,
        returnTo: `/routine-editor/${id}`,
      },
    });
  };

  const openCatalogReplace = (dayIndex: number, exerciseIndex: number) => {
    const day = days[dayIndex];
    if (!day) return;
    navigate('/exercise-catalog', {
      state: {
        dayIndex,
        dayName: day.name,
        mode: 'replace',
        replaceIndex: exerciseIndex,
        existingDaySlugs: day.exercises.map((e) => e.exerciseSlug).filter(Boolean),
        currentDayExerciseCount: day.exercises.length,
        returnTo: `/routine-editor/${id}`,
      },
    });
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!name.trim()) {
      setNameError('Tu rutina necesita un nombre para poder guardarse.');
      return;
    }

    if (isNew && routines.length >= 3) {
      setSaveError('Alcanzaste el límite de 3 rutinas. Eliminá una antes de crear una nueva.');
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
      skipBlockerRef.current = true;
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
                            const catalogEntry = exercise.exerciseSlug
                              ? catalogBySlug.get(exercise.exerciseSlug)
                              : undefined;
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
                                      <img
                                        src={catalogEntry.coverImageUrl}
                                        alt=""
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                      />
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
                                    <p
                                      className="truncate text-xs text-[#9BAEC1]"
                                      style={{ fontFamily: "'Inter', sans-serif" }}
                                    >
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
                                        <span
                                          key={col}
                                          className="text-center text-[10px] font-semibold uppercase tracking-wider text-[#9BAEC1]"
                                          style={{ fontFamily: "'Inter', sans-serif" }}
                                        >
                                          {col}
                                        </span>
                                      ))}
                                    </div>

                                    {/* Set rows */}
                                    {Array.from({ length: exercise.sets }, (_, setIndex) => (
                                      <div
                                        key={setIndex}
                                        className="grid grid-cols-3 gap-2 items-center border-t border-[rgba(255,255,255,0.03)] px-4 py-2.5"
                                      >
                                        <span className="text-center text-sm text-[#9BAEC1]">{setIndex + 1}</span>
                                        <input
                                          type="number"
                                          min={0}
                                          value={exercise.kg}
                                          onChange={(e) =>
                                            updateExercise(dayIndex, exerciseIndex, 'kg', Number(e.target.value))
                                          }
                                          className="w-full rounded-lg bg-[#203347] py-1.5 text-center text-sm font-medium text-white outline-none"
                                        />
                                        <input
                                          type="number"
                                          min={1}
                                          value={exercise.reps}
                                          onChange={(e) =>
                                            updateExercise(dayIndex, exerciseIndex, 'reps', Number(e.target.value))
                                          }
                                          className="w-full rounded-lg bg-[#203347] py-1.5 text-center text-sm font-medium text-white outline-none"
                                        />
                                      </div>
                                    ))}

                                    {/* Sets count control */}
                                    <div className="mx-4 mt-3 flex items-center justify-between rounded-xl bg-[#1A2D42] px-4 py-2.5">
                                      <span
                                        className="text-xs font-semibold uppercase tracking-wider text-[#9BAEC1]"
                                        style={{ fontFamily: "'Inter', sans-serif" }}
                                      >
                                        Series
                                      </span>
                                      <div className="flex items-center gap-4">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateExercise(dayIndex, exerciseIndex, 'sets', exercise.sets - 1)
                                          }
                                          disabled={exercise.sets <= 1}
                                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#203347] text-lg font-bold text-[#9BAEC1] disabled:opacity-40"
                                        >
                                          −
                                        </button>
                                        <span className="w-4 text-center text-sm font-bold text-white">
                                          {exercise.sets}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateExercise(dayIndex, exerciseIndex, 'sets', exercise.sets + 1)
                                          }
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
                          if (day.exercises.length >= 15) return;
                          openCatalog(dayIndex);
                        }}
                        disabled={day.exercises.length >= 15}
                        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-semibold transition-colors ${
                          day.exercises.length >= 15
                            ? 'border-[rgba(155,174,193,0.12)] text-[#4F6378]'
                            : 'border-[rgba(0,201,167,0.3)] text-[#00C9A7]'
                        }`}
                        type="button"
                      >
                        <Plus size={14} />
                        {day.exercises.length >= 15
                          ? 'Máximo 15 ejercicios por día'
                          : 'Añadir ejercicio'}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <button
              onClick={addDay}
              disabled={days.length >= 7}
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-4 transition-colors ${
                days.length >= 7
                  ? 'border-[rgba(155,174,193,0.12)] bg-transparent text-[#4F6378]'
                  : 'border-[rgba(0,201,167,0.28)] bg-[rgba(0,201,167,0.06)] text-[#00C9A7] active:bg-[rgba(0,201,167,0.12)]'
              }`}
              type="button"
            >
              <Plus size={16} />
              <span className="text-sm font-semibold">
                {days.length >= 7 ? 'Máximo 7 días por rutina' : 'Agregar día de entrenamiento'}
              </span>
            </button>
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
            <span className="text-base font-bold text-black">
              {isSaving ? 'Guardando...' : 'Guardar rutina'}
            </span>
          </button>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Unsaved changes modal */}
      {blocker.state === 'blocked' ? (
        <div className="absolute inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/75" onClick={() => blocker.reset()} />
          <div
            className="absolute bottom-0 left-0 right-0 flex flex-col rounded-t-3xl px-5 pb-8 pt-4"
            style={{ background: '#1A2D42' }}
          >
            <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-[#203347]" />
            <h3 className="mb-1 text-lg font-bold text-white">¿Guardás los cambios?</h3>
            <p className="mb-5 text-sm text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Hay cambios sin guardar en esta rutina.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                  blocker.reset();
                  skipBlockerRef.current = true;
                  await handleSave();
                  skipBlockerRef.current = false;
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 font-bold text-black shadow-[0_0_15px_rgba(0,201,167,0.2)]"
              >
                <Save size={16} />
                Guardar
              </button>
              <button
                type="button"
                onClick={() => blocker.proceed()}
                className="flex w-full items-center justify-center rounded-2xl border border-[rgba(255,125,125,0.22)] bg-[rgba(255,125,125,0.08)] py-4 font-bold text-[#FF8E8E]"
              >
                Descartar cambios
              </button>
              <button
                type="button"
                onClick={() => blocker.reset()}
                className="py-3 text-sm font-semibold text-[#9BAEC1]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Exercise options menu */}
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
                  if (ex?.exerciseSlug) {
                    const entry = catalogBySlug.get(ex.exerciseSlug);
                    if (entry) {
                      setSelectedExerciseDetail({
                        exerciseSlug: entry.slug,
                        name: entry.title,
                        muscle: entry.muscle,
                        implement: entry.implement,
                        secondaryMuscles: entry.secondaryMuscles,
                        coverImageUrl: entry.coverImageUrl,
                        animationMediaUrl: entry.animationMediaUrl,
                        animationMediaType: entry.animationMediaType,
                        instructions: entry.instructions,
                        overview: entry.overview,
                      });
                    }
                  }
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
                  setExerciseMenu(null);
                  openCatalogReplace(dayIndex, exerciseIndex);
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

      {/* Rest timer picker */}
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

      {/* Exercise detail sheet (from exercise menu → Ver instrucciones) */}
      <ExerciseDetailSheet
        exercise={selectedExerciseDetail}
        onClose={() => setSelectedExerciseDetail(null)}
      />

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
