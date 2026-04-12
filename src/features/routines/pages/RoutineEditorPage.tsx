import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ChevronDown, ChevronUp, Plus, Save, Search, Trash2 } from 'lucide-react';
import { useAppData } from '@/core/app-data/AppDataContext';
import { useExerciseCatalog } from '@/features/exercises/hooks/useExerciseCatalog';
import { ActiveWorkoutEditLockModal } from '@/shared/components/layout/ActiveWorkoutEditLockModal';
import { Header } from '@/shared/components/layout/Header';
import type { Routine } from '@/shared/types/models';

const ALL_MUSCLES_OPTION = 'Todos';

type RoutineLibraryItem = {
  exerciseSlug?: string;
  name: string;
  muscle: string;
  implement?: string;
  secondaryMuscles?: string[];
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
      })),
    }));
  }

  const initialCount = Math.max(existing?.daysPerWeek ?? 4, 2);
  return Array.from({ length: initialCount }, (_, index) => createEmptyDay(index));
}

export default function RoutineEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeWorkout, routines, saveRoutine } = useAppData();
  const { catalog, error: catalogError, isLoading: isCatalogLoading } = useExerciseCatalog();
  const isNew = id === 'new';
  const existing = !isNew ? routines.find((routine) => routine.id === Number(id)) ?? null : null;
  const isEditingBlocked = Boolean(activeWorkout && !isNew && existing);
  const initialDays = buildInitialDays(existing);

  const [name, setName] = useState(existing?.name ?? '');
  const [nameError, setNameError] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(
    Math.max(existing?.daysPerWeek ?? initialDays.length, 2)
  );
  const [days, setDays] = useState<RoutineDayDraft[]>(initialDays);
  const [expandedDay, setExpandedDay] = useState(0);
  const [showExSearch, setShowExSearch] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState(ALL_MUSCLES_OPTION);

  const exerciseLibrary = useMemo<RoutineLibraryItem[]>(
    () =>
      catalog.length > 0
        ? catalog.map((exercise) => ({
            exerciseSlug: exercise.slug,
            name: exercise.title,
            muscle: exercise.muscle,
            implement: exercise.implement,
            secondaryMuscles: exercise.secondaryMuscles,
          }))
        : fallbackExerciseLibrary,
    [catalog]
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

  const filteredExercises = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return exerciseLibrary.filter((exercise) => {
      const matchMuscle =
        selectedMuscle === ALL_MUSCLES_OPTION || exercise.muscle === selectedMuscle;
      const haystack = [exercise.name, exercise.muscle, exercise.implement ?? '']
        .join(' ')
        .toLowerCase();

      return matchMuscle && (!normalizedSearch || haystack.includes(normalizedSearch));
    });
  }, [exerciseLibrary, searchQuery, selectedMuscle]);

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
      previous.map((day, index) =>
        index === dayIndex
          ? {
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
                },
              ],
            }
          : day
      )
    );
    setShowExSearch(null);
    setSearchQuery('');
    setSelectedMuscle(ALL_MUSCLES_OPTION);
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

  const updateExercise = (
    dayIndex: number,
    exerciseIndex: number,
    field: 'sets' | 'reps',
    value: number
  ) => {
    const nextValue = Number.isFinite(value) && value > 0 ? value : 1;

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
    if (!name.trim()) {
      setNameError('Tu rutina necesita un nombre para poder guardarse.');
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
        id: existing?.days[dayIndex]?.id,
        name: day.name.trim() || `Día ${dayIndex + 1}`,
        focus:
          day.exercises.map((exercise) => exercise.muscle).slice(0, 3).join(', ') ||
          'Sesión personalizada',
        description: existing?.days[dayIndex]?.description ?? undefined,
        exercises: day.exercises.map((exercise, exerciseIndex) => ({
          id: existing?.days[dayIndex]?.exercises[exerciseIndex]?.id ?? exerciseIndex + 1,
          exerciseSlug:
            exercise.exerciseSlug ??
            existing?.days[dayIndex]?.exercises[exerciseIndex]?.exerciseSlug ??
            undefined,
          name: exercise.name,
          muscle: exercise.muscle,
          implement:
            exercise.implement ??
            existing?.days[dayIndex]?.exercises[exerciseIndex]?.implement ??
            undefined,
          secondaryMuscles:
            exercise.secondaryMuscles ??
            existing?.days[dayIndex]?.exercises[exerciseIndex]?.secondaryMuscles ??
            undefined,
          notes: existing?.days[dayIndex]?.exercises[exerciseIndex]?.notes,
          sets: Array.from({ length: exercise.sets }, (_, setIndex) => ({
            id: setIndex + 1,
            kg: existing?.days[dayIndex]?.exercises[exerciseIndex]?.sets[setIndex]?.kg ?? 0,
            reps: exercise.reps,
            rpe: existing?.days[dayIndex]?.exercises[exerciseIndex]?.sets[setIndex]?.rpe ?? 0,
            completed: false,
            kind: 'normal' as const,
          })),
        })),
      })),
    };

    await saveRoutine(routineToSave);
    navigate('/workouts');
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
                          {day.exercises.map((exercise, exerciseIndex) => (
                            <div
                              key={`${exercise.exerciseSlug ?? exercise.name}-${exerciseIndex}`}
                              className="flex items-center gap-3 rounded-xl bg-[#1A2D42] px-3 py-3"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-white">{exercise.name}</p>
                                <p className="text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                                  {[exercise.muscle, exercise.implement].filter(Boolean).join(' · ')}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    value={exercise.sets}
                                    onChange={(event) =>
                                      updateExercise(dayIndex, exerciseIndex, 'sets', Number(event.target.value))
                                    }
                                    className="w-9 rounded-lg bg-[#203347] py-1 text-center text-xs text-white outline-none"
                                  />
                                  <span className="text-xs text-[#9BAEC1]">×</span>
                                  <input
                                    type="number"
                                    min={1}
                                    value={exercise.reps}
                                    onChange={(event) =>
                                      updateExercise(dayIndex, exerciseIndex, 'reps', Number(event.target.value))
                                    }
                                    className="w-9 rounded-lg bg-[#203347] py-1 text-center text-xs text-white outline-none"
                                  />
                                </div>

                                <button type="button" onClick={() => removeExercise(dayIndex, exerciseIndex)}>
                                  <Trash2 size={14} className="text-[#E53935]/60" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setShowExSearch(dayIndex);
                          setSearchQuery('');
                          setSelectedMuscle(ALL_MUSCLES_OPTION);
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

          <button
            onClick={() => void handleSave()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 shadow-[0_0_15px_rgba(0,201,167,0.2)]"
            type="button"
          >
            <Save size={18} className="text-black" />
            <span className="text-base font-bold text-black">Guardar rutina</span>
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

              <div className="flex gap-2 overflow-x-auto pb-1">
                {muscleOptions.map((muscle) => (
                  <button
                    key={muscle}
                    onClick={() => setSelectedMuscle(muscle)}
                    className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      selectedMuscle === muscle
                        ? 'bg-[#00C9A7] text-black'
                        : 'bg-[#203347] text-[#9BAEC1]'
                    }`}
                    type="button"
                  >
                    {muscle}
                  </button>
                ))}
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

              <div className="flex flex-col gap-2">
                {filteredExercises.map((exercise) => (
                  <button
                    key={exercise.exerciseSlug ?? exercise.name}
                    onClick={() => addExercise(showExSearch, exercise)}
                    className="flex items-center justify-between rounded-xl bg-[#203347] px-4 py-3 text-left transition-colors hover:bg-[#2A415A]"
                    type="button"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{exercise.name}</p>
                      <p className="text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {[exercise.muscle, exercise.implement].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <Plus size={16} className="shrink-0 text-[#00C9A7]" />
                  </button>
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
