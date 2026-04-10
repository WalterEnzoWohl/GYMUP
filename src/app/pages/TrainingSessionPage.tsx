import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  History,
  Menu,
  RefreshCw,
  Search,
  Sparkles,
  TimerReset,
  Trash2,
} from 'lucide-react';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { useLocation, useNavigate } from 'react-router';
import { brandLogoWhite } from '@/assets';
import { ActiveWorkoutEditLockModal } from '../components/ActiveWorkoutEditLockModal';
import { TrainingExerciseCard } from '../components/session/TrainingExerciseCard';
import { UserAvatar } from '../components/UserAvatar';
import { useAppData } from '../data/AppDataContext';
import type {
  ActiveWorkoutDraft,
  ActiveWorkoutExercise,
  ActiveWorkoutSet,
  ExerciseData,
  SessionHistory,
} from '../data/models';
import { formatWeightNumber, getAutoWeightIncrementKg, getWeightUnitLabel, parseWeightInputValue } from '../data/unitUtils';

type SessionLocationState = {
  routineId?: number;
  dayName?: string;
  mode?: 'free' | 'history-edit';
  action?: 'finish';
  sessionId?: number;
};

type SetState = ActiveWorkoutSet;
type ExerciseState = ActiveWorkoutExercise;

type ExerciseHistoryEntry = {
  sessionId: number;
  sessionName: string;
  sessionDate: string;
  sets: SessionHistory['exercises'][number]['sets'];
  maxKg: number;
  notes?: string;
};

const DEFAULT_REST = 90;
const FREE_SESSION_NAME = 'Entrenamiento libre';
const FREE_SESSION_FOCUS = 'Sesión vacía y personalizada';

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}

function buildExerciseState(
  exercises: ExerciseData[],
  previousSession?: SessionHistory,
  seedWithPrevious = false
): ExerciseState[] {
  return exercises.map((exercise) => {
    const previousExercise = previousSession?.exercises.find(
      (sessionExercise) => sessionExercise.name === exercise.name
    );

    return {
      id: exercise.id,
      name: exercise.name,
      muscle: exercise.muscle,
      implement: exercise.implement,
      notes: exercise.notes,
      sets: exercise.sets.map((set, index) => {
        const previousKg = previousExercise?.sets[index]?.kg ?? 0;
        const previousReps = previousExercise?.sets[index]?.reps ?? 0;

        return {
          ...set,
          kg: seedWithPrevious ? previousKg : 0,
          reps: seedWithPrevious ? previousReps : 0,
          prevKg: previousKg,
          prevReps: previousReps,
          kind: 'normal',
        };
      }),
    };
  });
}

function buildExerciseStateFromHistorySession(
  session: SessionHistory,
  previousSession?: SessionHistory
): ExerciseState[] {
  return session.exercises.map((exercise, exerciseIndex) => {
    const previousExercise = previousSession?.exercises.find(
      (sessionExercise) => sessionExercise.name === exercise.name
    );

    return {
      id: exerciseIndex + 1,
      name: exercise.name,
      muscle: exercise.muscle,
      implement: exercise.implement,
      notes: exercise.notes,
      sets: exercise.sets.map((set, setIndex) => ({
        id: setIndex + 1,
        kg: set.kg,
        reps: set.reps,
        rpe: set.rpe ?? 8,
        completed: true,
        prevKg: previousExercise?.sets[setIndex]?.kg ?? set.kg,
        prevReps: previousExercise?.sets[setIndex]?.reps ?? set.reps,
        kind: set.kind ?? 'normal',
      })),
    };
  });
}

function buildExerciseStateFromTemplate(
  exercise: ExerciseData,
  history: SessionHistory[],
  seedWithPrevious = false
): ExerciseState {
  const previousExercise = history
    .flatMap((session) => session.exercises)
    .find((sessionExercise) => sessionExercise.name === exercise.name);

  return {
    id: exercise.id,
    name: exercise.name,
    muscle: exercise.muscle,
    implement: exercise.implement,
    notes: exercise.notes,
    sets: exercise.sets.map((set, index) => {
      const previousKg = previousExercise?.sets[index]?.kg ?? 0;
      const previousReps = previousExercise?.sets[index]?.reps ?? 0;

      return {
        ...set,
        kg: seedWithPrevious ? previousKg : 0,
        reps: seedWithPrevious ? previousReps : 0,
        prevKg: previousKg,
        prevReps: previousReps,
        kind: 'normal',
      };
    }),
  };
}

function buildManualExerciseState(
  name: string,
  muscle: string,
  implement: string,
  history: SessionHistory[],
  seedWithPrevious = false
): ExerciseState {
  const previousExercise = history
    .flatMap((session) => session.exercises)
    .find((sessionExercise) => sessionExercise.name.toLowerCase() === name.toLowerCase());

  return {
    id: Date.now(),
    name,
    muscle,
    implement: implement || undefined,
    notes: '',
    sets: [
      {
        id: 1,
        kg: seedWithPrevious ? previousExercise?.sets[0]?.kg ?? 0 : 0,
        reps: seedWithPrevious ? previousExercise?.sets[0]?.reps ?? 0 : 0,
        rpe: previousExercise?.sets[0]?.rpe ?? 8,
        completed: false,
        prevKg: previousExercise?.sets[0]?.kg ?? 0,
        prevReps: previousExercise?.sets[0]?.reps ?? 0,
        kind: 'normal',
      },
    ],
  };
}

function markExerciseSetsCompleted(exercise: ExerciseState) {
  return {
    ...exercise,
    sets: exercise.sets.map((set) => ({ ...set, completed: true })),
  };
}

function isBodyweightExercise(exercise: Pick<ExerciseState, 'implement'>) {
  const implement = exercise.implement?.trim().toLowerCase() ?? '';
  return implement.includes('peso corporal') || implement.includes('bodyweight');
}

export default function TrainingSessionPage() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: SessionLocationState };
  const {
    activeWorkout,
    appContext,
    appSettings,
    clearActiveWorkout,
    completeSession: completeSessionRecord,
    deleteSession: deleteSessionRecord,
    routines,
    saveActiveWorkout,
    sessionHistory,
    updateSession: updateSessionRecord,
  } = useAppData();

  const requestedHistorySessionId = state?.mode === 'history-edit' ? state.sessionId ?? null : null;
  const historicalSession =
    requestedHistorySessionId !== null
      ? sessionHistory.find((session) => session.id === requestedHistorySessionId) ?? null
      : null;

  if (requestedHistorySessionId !== null && activeWorkout) {
    return (
      <div className="min-h-screen bg-[#102235]">
        <ActiveWorkoutEditLockModal
          activeWorkoutName={activeWorkout.sessionName}
          eyebrow="Edición bloqueada"
          title="No podés editar este entrenamiento ahora"
          description="Ya tenés un entrenamiento en curso. Para evitar mezclar datos del historial con la sesión activa, primero volvé a ese entrenamiento o finalizalo."
          subjectLabel="Entrenamiento activo"
          onResume={() => navigate('/session')}
          onFinish={() => navigate('/session', { state: { action: 'finish' } })}
          onCancel={() => navigate(-1)}
        />
      </div>
    );
  }

  if (requestedHistorySessionId !== null && !historicalSession) {
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ background: '#102235', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="flex h-16 items-center border-b border-[#203347] px-5" style={{ background: '#0B1F33' }}>
          <button className="-ml-2 p-2" onClick={() => navigate(-1)} type="button">
            <Menu size={18} className="text-[#00C9A7]" />
          </button>
        </div>
        <div className="px-5 py-6 text-sm text-[#9BAEC1]">No se encontró la sesión que querías editar.</div>
      </div>
    );
  }

  const resumedWorkout = requestedHistorySessionId === null ? activeWorkout : null;
  const hasActiveWorkout = Boolean(resumedWorkout);
  const isHistoryEditSession = Boolean(historicalSession);
  const isFreeSession = isHistoryEditSession
    ? !historicalSession?.routineId
    : hasActiveWorkout
    ? resumedWorkout.mode === 'free'
    : state?.mode === 'free';
  const routineId = isHistoryEditSession
    ? historicalSession?.routineId ?? null
    : hasActiveWorkout
    ? resumedWorkout?.routineId ?? null
    : isFreeSession
    ? null
    : (state?.routineId ?? appContext.activeRoutineId);
  const routine = routineId !== null ? routines.find((item) => item.id === routineId) ?? null : null;

  if (!isFreeSession && !routine && !hasActiveWorkout && !isHistoryEditSession) {
    return null;
  }

  const currentDay = routine
    ? routine.days.find(
        (day) => day.name === (resumedWorkout?.dayName ?? state?.dayName ?? appContext.currentDayName)
      ) ?? routine.days[0]
    : null;

  if (!isFreeSession && !currentDay && !hasActiveWorkout && !isHistoryEditSession) {
    return null;
  }

  const historicalSessionIndex = historicalSession
    ? sessionHistory.findIndex((session) => session.id === historicalSession.id)
    : -1;
  const historicalPreviousSession =
    historicalSessionIndex >= 0
      ? sessionHistory
          .slice(historicalSessionIndex + 1)
          .find((session) => session.name === historicalSession?.name)
      : undefined;

  const sessionName =
    resumedWorkout?.sessionName ??
    historicalSession?.name ??
    (isFreeSession ? FREE_SESSION_NAME : currentDay?.name ?? 'Sesión');
  const sessionFocus =
    resumedWorkout?.sessionFocus ??
    historicalSession?.sessionFocus ??
    (isFreeSession ? FREE_SESSION_FOCUS : currentDay?.focus ?? 'Entrenamiento guiado');
  const sessionAccent = isFreeSession ? '#F5B942' : isHistoryEditSession ? '#7F98FF' : '#00C9A7';
  const previousSession = isHistoryEditSession
    ? historicalPreviousSession
    : isFreeSession
    ? sessionHistory.find((session) => !session.routineId && session.name === FREE_SESSION_NAME)
    : sessionHistory.find(
        (session) =>
          session.routineId === (resumedWorkout?.routineId ?? routine?.id) &&
          session.name === (resumedWorkout?.dayName ?? currentDay?.name ?? '')
      );

  const [draftId] = useState(() => resumedWorkout?.id ?? `workout-${Date.now()}`);
  const [startedAt] = useState(() => resumedWorkout?.startedAt ?? new Date().toISOString());
  const [currentExIdx, setCurrentExIdx] = useState(resumedWorkout?.currentExerciseIndex ?? 0);
  const [exerciseList, setExerciseList] = useState<ExerciseState[]>(() =>
    resumedWorkout?.exercises ??
      (isHistoryEditSession
        ? buildExerciseStateFromHistorySession(historicalSession as SessionHistory, previousSession)
        : isFreeSession
        ? []
        : buildExerciseState(currentDay?.exercises ?? [], previousSession, appSettings.showPreviousWeight))
  );
  const [elapsed, setElapsed] = useState(() =>
    isHistoryEditSession
      ? (historicalSession?.duration ?? 0) * 60
      : Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
  );
  const [restActive, setRestActive] = useState(false);
  const [restTime, setRestTime] = useState(appSettings.restTimerSeconds || DEFAULT_REST);
  const [restConfig, setRestConfig] = useState(appSettings.restTimerSeconds || DEFAULT_REST);
  const [notes, setNotes] = useState(resumedWorkout?.notes ?? historicalSession?.notes ?? '');
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showExerciseHistory, setShowExerciseHistory] = useState(false);
  const [showReplaceExercise, setShowReplaceExercise] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showDatabaseExercisePicker, setShowDatabaseExercisePicker] = useState(false);
  const [replaceQuery, setReplaceQuery] = useState('');
  const [databaseQuery, setDatabaseQuery] = useState('');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscle, setNewExerciseMuscle] = useState('');
  const [newExerciseImplement, setNewExerciseImplement] = useState('');
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false);
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);
  const [inlineFeedback, setInlineFeedback] = useState<string | null>(null);
  const [exerciseMenuAnchor, setExerciseMenuAnchor] = useState<{ exerciseIdx: number; rect: DOMRect } | null>(null);
  const [setMenuAnchor, setSetMenuAnchor] = useState<{
    exerciseIdx: number;
    setIdx: number;
    rect: DOMRect;
  } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isHistoryEditSession) {
      return;
    }

    const updateElapsed = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    };

    updateElapsed();
    const timerId = setInterval(updateElapsed, 1000);
    return () => clearInterval(timerId);
  }, [isHistoryEditSession, startedAt]);

  useEffect(() => {
    if (!restActive) {
      return;
    }

    if (restTime <= 0) {
      setRestActive(false);
      return;
    }

    const timerId = setInterval(() => setRestTime((value) => value - 1), 1000);
    return () => clearInterval(timerId);
  }, [restActive, restTime]);

  useEffect(() => {
    if (exerciseList.length === 0) {
      setCurrentExIdx(0);
      setExerciseMenuAnchor(null);
      setSetMenuAnchor(null);
      setShowExerciseHistory(false);
      return;
    }

    if (currentExIdx > exerciseList.length - 1) {
      setCurrentExIdx(exerciseList.length - 1);
    }
  }, [currentExIdx, exerciseList.length]);

  useEffect(() => {
    setRestConfig(appSettings.restTimerSeconds || DEFAULT_REST);
    if (!restActive) {
      setRestTime(appSettings.restTimerSeconds || DEFAULT_REST);
    }
  }, [appSettings.restTimerSeconds, restActive]);

  useEffect(() => {
    if (isHistoryEditSession) {
      return;
    }

    const draft: ActiveWorkoutDraft = {
      id: draftId,
      mode: isFreeSession ? 'free' : 'routine',
      routineId,
      dayName: sessionName,
      sessionName,
      sessionFocus,
      startedAt,
      notes,
      currentExerciseIndex: Math.max(0, Math.min(currentExIdx, Math.max(0, exerciseList.length - 1))),
      exercises: exerciseList,
    };

    saveActiveWorkout(draft);
  }, [
    currentExIdx,
    draftId,
    exerciseList,
    isHistoryEditSession,
    isFreeSession,
    notes,
    routineId,
    saveActiveWorkout,
    sessionFocus,
    sessionName,
    startedAt,
  ]);

  useEffect(() => {
    if (isHistoryEditSession) {
      return;
    }

    if (state?.action === 'finish') {
      setShowFinishModal(true);
    }
  }, [isHistoryEditSession, state?.action]);

  useEffect(() => {
    if (!inlineFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => setInlineFeedback(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [inlineFeedback]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => closeContextMenus();
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const currentExercise = exerciseList[currentExIdx] ?? null;
  const hasExercises = exerciseList.length > 0;
  const totalSetsCompleted = exerciseList.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.completed).length,
    0
  );
  const totalSets = exerciseList.reduce((total, exercise) => total + exercise.sets.length, 0);
  const totalVolume = exerciseList.reduce(
    (total, exercise) =>
      total +
      exercise.sets
        .filter((set) => set.completed)
        .reduce((setTotal, set) => setTotal + set.kg * set.reps, 0),
    0
  );
  const weightUnitLabel = getWeightUnitLabel(appSettings.weightUnit);
  const missingSets = exerciseList.flatMap((exercise, exerciseIdx) =>
    exercise.sets
      .map((set, setIdx) => ({ exercise, exerciseIdx, set, setIdx }))
      .filter(({ set }) => !set.completed)
  );
  const exerciseHistoryEntries: ExerciseHistoryEntry[] = currentExercise
    ? sessionHistory
        .flatMap((session) =>
          isHistoryEditSession && historicalSession && session.id === historicalSession.id
            ? []
            : session.exercises
                .filter((exercise) => exercise.name === currentExercise.name)
                .map((exercise) => ({
                  sessionId: session.id,
                  sessionName: session.name,
                  sessionDate: session.date,
                  sets: exercise.sets,
                  maxKg: exercise.maxKg,
                  notes: exercise.notes,
                }))
        )
        .slice(0, 6)
    : [];

  const replacementOptions = useMemo(() => {
    if (!currentExercise) {
      return [];
    }

    return routines
      .flatMap((item) => item.days.flatMap((day) => day.exercises))
      .filter((exercise) => exercise.name !== currentExercise.name)
      .filter(
        (exercise, index, array) =>
          array.findIndex((candidate) => candidate.name === exercise.name) === index
      );
  }, [currentExercise, routines]);

  const databaseExerciseOptions = useMemo(() => {
    const currentNames = new Set(exerciseList.map((exercise) => exercise.name.toLowerCase()));

    return routines
      .flatMap((item) => item.days.flatMap((day) => day.exercises))
      .filter(
        (exercise, index, array) =>
          array.findIndex(
            (candidate) => candidate.name.toLowerCase() === exercise.name.toLowerCase()
          ) === index
      )
      .filter((exercise) => !currentNames.has(exercise.name.toLowerCase()));
  }, [exerciseList, routines]);

  const normalizedReplaceQuery = replaceQuery.trim().toLowerCase();
  const filteredReplacementOptions = replacementOptions.filter((exercise) => {
    if (!normalizedReplaceQuery) {
      return true;
    }

    const haystack = [exercise.name, exercise.muscle, exercise.implement ?? '']
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedReplaceQuery);
  });

  const normalizedDatabaseQuery = databaseQuery.trim().toLowerCase();
  const filteredDatabaseExerciseOptions = databaseExerciseOptions.filter((exercise) => {
    if (!normalizedDatabaseQuery) {
      return true;
    }

    const haystack = [exercise.name, exercise.muscle, exercise.implement ?? '']
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedDatabaseQuery);
  });

  const closeContextMenus = () => {
    setExerciseMenuAnchor(null);
    setSetMenuAnchor(null);
  };

  const updateInlineFeedback = (message: string | null) => {
    setInlineFeedback(message);
  };

  const moveExercise = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return;
    }

    setExerciseList((previous) => {
      const next = [...previous];
      const [movedExercise] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedExercise);
      return next;
    });

    setCurrentExIdx(toIndex);
  };

  const updateExerciseNotes = (exerciseIdx: number, value: string) => {
    setCurrentExIdx(exerciseIdx);
    setExerciseList((previous) =>
      previous.map((exercise, candidateExerciseIdx) =>
        candidateExerciseIdx === exerciseIdx ? { ...exercise, notes: value } : exercise
      )
    );
  };

  const updateSetValue = (
    exerciseIdx: number,
    setIdx: number,
    field: 'kg' | 'reps',
    value: string
  ) => {
    const targetExercise = exerciseList[exerciseIdx];
    if (!targetExercise) {
      return;
    }

    setCurrentExIdx(exerciseIdx);
    updateInlineFeedback(null);

    const numericValue =
      field === 'kg' ? parseWeightInputValue(value, appSettings.weightUnit) : Number.parseFloat(value) || 0;

    setExerciseList((previous) =>
      previous.map((exercise, candidateExerciseIdx) => {
        if (candidateExerciseIdx !== exerciseIdx) {
          return exercise;
        }

        const previousValue = exercise.sets[setIdx]?.[field] ?? 0;
        const nextSets = exercise.sets.map((set, index) => {
          if (index === setIdx) {
            return { ...set, [field]: numericValue };
          }

          if (index <= setIdx) {
            return set;
          }

          const shouldPropagate =
            !set.completed && (set[field] === 0 || set[field] === previousValue);

          return shouldPropagate ? { ...set, [field]: numericValue } : set;
        });

        return {
          ...exercise,
          sets: nextSets,
        };
      })
    );
  };

  const buildNewSet = (targetExercise: ExerciseState, kind: SetState['kind'] = 'normal'): SetState => {
    const lastSet = targetExercise.sets[targetExercise.sets.length - 1];
    const referenceKg = lastSet?.kg ?? 0;
    const referenceReps = lastSet?.reps ?? 0;

    return {
      id: targetExercise.sets.length + 1,
      kg:
        kind === 'warmup'
          ? referenceKg
          : appSettings.autoWeightIncrement && referenceKg > 0
          ? Number((referenceKg + getAutoWeightIncrementKg(appSettings.weightUnit)).toFixed(2))
          : referenceKg,
      reps: referenceReps,
      rpe: 0,
      completed: isHistoryEditSession,
      prevKg: lastSet?.prevKg ?? referenceKg,
      prevReps: lastSet?.prevReps ?? referenceReps,
      kind,
    };
  };

  const addSetOfKind = (exerciseIdx: number, kind: SetState['kind']) => {
    const targetExercise = exerciseList[exerciseIdx];
    if (!targetExercise) {
      return;
    }

    setCurrentExIdx(exerciseIdx);
    setExerciseList((previous) =>
      previous.map((exercise, candidateExerciseIdx) => {
        if (candidateExerciseIdx !== exerciseIdx) {
          return exercise;
        }

        return { ...exercise, sets: [...exercise.sets, buildNewSet(exercise, kind)] };
      })
    );
  };

  const addSet = (exerciseIdx: number) => addSetOfKind(exerciseIdx, 'normal');

  const updateSetKind = (exerciseIdx: number, setIdx: number, kind: SetState['kind']) => {
    if (!exerciseList[exerciseIdx]) {
      return;
    }

    setExerciseList((previous) =>
      previous.map((exercise, candidateExerciseIdx) => {
        if (candidateExerciseIdx !== exerciseIdx) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets.map((set, index) => (index === setIdx ? { ...set, kind } : set)),
        };
      })
    );

    setSetMenuAnchor(null);
  };

  const removeSet = (exerciseIdx: number, setIdx: number) => {
    const targetExercise = exerciseList[exerciseIdx];

    if (!targetExercise || targetExercise.sets.length <= 1) {
      return;
    }

    setExerciseList((previous) =>
      previous.map((exercise, candidateExerciseIdx) => {
        if (candidateExerciseIdx !== exerciseIdx) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets
            .filter((_, index) => index !== setIdx)
            .map((set, index) => ({ ...set, id: index + 1 })),
        };
      })
    );

    setSetMenuAnchor(null);
  };

  const isSetReadyToComplete = (exercise: ExerciseState, set: SetState) => {
    if (isBodyweightExercise(exercise)) {
      return set.reps > 0;
    }

    return set.kg > 0 && set.reps > 0;
  };

  const completeSet = (exerciseIdx: number, setIdx: number) => {
    const targetExercise = exerciseList[exerciseIdx];

    if (!targetExercise) {
      return;
    }

    const targetSet = targetExercise.sets[setIdx];
    if (!targetSet) {
      return;
    }

    setCurrentExIdx(exerciseIdx);

    if (!targetSet.completed && !isSetReadyToComplete(targetExercise, targetSet)) {
      updateInlineFeedback(
        isBodyweightExercise(targetExercise)
          ? 'Completá al menos las repeticiones antes de marcar la serie.'
          : 'Cargá peso y repeticiones antes de marcar la serie.'
      );
      return;
    }

    updateInlineFeedback(null);
    const nextCompleted = !targetSet.completed;

    setExerciseList((previous) =>
      previous.map((exercise, candidateExerciseIdx) => {
        if (candidateExerciseIdx !== exerciseIdx) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets.map((set, index) =>
            index === setIdx ? { ...set, completed: nextCompleted } : set
          ),
        };
      })
    );

    if (nextCompleted && !isHistoryEditSession) {
      setRestTime(restConfig);
      setRestActive(true);
    }
  };

  const addManualExercise = () => {
    const trimmedName = newExerciseName.trim();
    const trimmedMuscle = newExerciseMuscle.trim();

    if (!trimmedName || !trimmedMuscle) {
      return;
    }

    const nextManualExercise = buildManualExerciseState(
      trimmedName,
      trimmedMuscle,
      newExerciseImplement.trim(),
      sessionHistory,
      appSettings.showPreviousWeight
    );
    const normalizedManualExercise = isHistoryEditSession
      ? markExerciseSetsCompleted(nextManualExercise)
      : nextManualExercise;

    setExerciseList((previous) => [...previous, normalizedManualExercise]);
    setCurrentExIdx(exerciseList.length);
    setShowAddExercise(false);
    setNewExerciseName('');
    setNewExerciseMuscle('');
    setNewExerciseImplement('');
  };

  const addDatabaseExercise = (exercise: ExerciseData) => {
    const nextExercise = buildExerciseStateFromTemplate(exercise, sessionHistory, appSettings.showPreviousWeight);
    const normalizedExercise = isHistoryEditSession ? markExerciseSetsCompleted(nextExercise) : nextExercise;

    setExerciseList((previous) => [...previous, normalizedExercise]);
    setCurrentExIdx(exerciseList.length);
    setRestActive(false);
    setDatabaseQuery('');
    setShowDatabaseExercisePicker(false);
  };

  const scrollToExercise = (exerciseIdx: number) => {
    setCurrentExIdx(exerciseIdx);
    const container = scrollContainerRef.current;
    const target = document.getElementById(`session-exercise-${exerciseIdx}`);

    if (container && target) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const nextTop = container.scrollTop + (targetRect.top - containerRect.top) - 24;
      container.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
    }
  };

  const jumpToMissingSet = (exerciseIdx: number) => {
    setShowFinishModal(false);
    scrollToExercise(exerciseIdx);
  };

  const finishSession = async () => {
    if (isSubmittingSession) {
      return;
    }

    setIsSubmittingSession(true);

    try {
      if (isHistoryEditSession && historicalSession) {
        await updateSessionRecord({
          sessionId: historicalSession.id,
          routineId,
          routineName: routine?.name,
          dayName: sessionName,
          sessionFocus,
          durationSeconds: elapsed,
          notes,
          exercises: exerciseList,
        });

        navigate(`/session-history/${historicalSession.id}`);
        return;
      }

      await completeSessionRecord({
        routineId,
        routineName: routine?.name,
        dayName: sessionName,
        sessionFocus,
        durationSeconds: elapsed,
        notes,
        exercises: exerciseList,
      });

      clearActiveWorkout();
      navigate('/post-session', {
        state: {
          duration: elapsed,
          volume: totalVolume,
          setsCompleted: totalSetsCompleted,
          totalSets,
          exercises: exerciseList,
          notes,
          sessionName,
          sessionFocus,
          previousVolume: previousSession?.volume ?? 0,
        },
      });
    } finally {
      setIsSubmittingSession(false);
    }
  };

  const discardSession = () => {
    setShowFinishModal(false);

    if (isHistoryEditSession && historicalSession) {
      navigate(`/session-history/${historicalSession.id}`);
      return;
    }

    clearActiveWorkout();
    navigate('/');
  };

  const deleteHistoricalSession = async () => {
    if (!historicalSession) {
      return;
    }

    await deleteSessionRecord(historicalSession.id);
    setShowDeleteSessionModal(false);
    setShowFinishModal(false);
    navigate('/history');
  };

  const deleteCurrentExercise = () => {
    const targetIndex = exerciseMenuAnchor?.exerciseIdx ?? currentExIdx;
    const targetExercise = exerciseList[targetIndex];

    if (!targetExercise) {
      closeContextMenus();
      return;
    }

    if (exerciseList.length <= 1) {
      setExerciseList([]);
      setCurrentExIdx(0);
      closeContextMenus();
      return;
    }

    setExerciseList((previous) => previous.filter((_, index) => index !== targetIndex));
    setCurrentExIdx((current) => Math.max(0, Math.min(current, exerciseList.length - 2)));
    closeContextMenus();
  };

  const replaceCurrentExercise = (exercise: ExerciseData) => {
    if (!currentExercise) {
      return;
    }

    const replacement = buildExerciseStateFromTemplate(exercise, sessionHistory, appSettings.showPreviousWeight);
    const normalizedReplacement = isHistoryEditSession ? markExerciseSetsCompleted(replacement) : replacement;

    setExerciseList((previous) =>
      previous.map((item, index) => (index === currentExIdx ? normalizedReplacement : item))
    );
    setReplaceQuery('');
    setShowReplaceExercise(false);
    closeContextMenus();
  };

  const adjustRestBy = (seconds: number) => {
    setRestConfig((value) => Math.max(15, Math.min(600, value + seconds)));
    setRestTime((value) => {
      const targetValue = restActive ? value + seconds : restConfig + seconds;
      return Math.max(0, Math.min(600, targetValue));
    });
  };

  const closeAddExercise = () => {
    setShowAddExercise(false);
    setNewExerciseName('');
    setNewExerciseMuscle('');
    setNewExerciseImplement('');
  };

  const closeDatabaseExercisePicker = () => {
    setShowDatabaseExercisePicker(false);
    setDatabaseQuery('');
  };

  const exerciseMenuItems = [
    {
      label: 'Ver historial de este ejercicio',
      icon: History,
      onClick: () => {
        setExerciseMenuAnchor(null);
        setShowExerciseHistory(true);
      },
    },
    {
      label: 'Reemplazar ejercicio',
      icon: RefreshCw,
      onClick: () => {
        setExerciseMenuAnchor(null);
        setShowReplaceExercise(true);
      },
    },
    {
      label: 'Eliminar ejercicio',
      icon: Trash2,
      danger: true,
      disabled: exerciseList.length <= 1,
      onClick: deleteCurrentExercise,
    },
    {
      label: 'Ver instrucciones / forma correcta',
      icon: BookOpen,
      disabled: true,
    },
  ];

  const sessionHeaderLabel = isHistoryEditSession
    ? 'Edición del historial'
    : isFreeSession
    ? 'Sesión libre'
    : 'Sesión activa';
  const sessionDateLabel =
    isHistoryEditSession && historicalSession
      ? `${historicalSession.dayLabel} - ${historicalSession.date}`
      : appContext.todayLabel;
  const sessionBadgeLabel = isHistoryEditSession ? 'Historial' : isFreeSession ? 'Sin rutina' : null;

  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{ background: '#102235', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div
        className="h-16 shrink-0 border-b border-[#203347] px-5"
        style={{ background: '#0B1F33' }}
      >
        <div className="flex h-full items-center justify-between">
          <button
            className="-ml-2 p-2"
            onClick={() =>
              isHistoryEditSession && historicalSession ? navigate(`/session-history/${historicalSession.id}`) : navigate('/')
            }
            type="button"
          >
            <Menu size={18} className="text-[#00C9A7]" />
          </button>
          <div className="flex items-center gap-2">
            <img src={brandLogoWhite} alt="WOHL" className="h-7 w-7 object-contain" />
            <span className="text-lg font-extrabold italic uppercase tracking-tight text-white">WOHL</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full border border-[rgba(0,201,167,0.2)] bg-[#1A2D42] px-3 py-1.5">
              <div className={`h-1.5 w-1.5 rounded-full bg-[#00C9A7] ${isHistoryEditSession ? '' : 'animate-pulse'}`} />
              <span className="text-sm font-bold text-[#00C9A7]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {formatTime(elapsed)}
              </span>
            </div>
            <UserAvatar className="h-9 w-9 overflow-hidden rounded-full border border-[rgba(0,201,167,0.2)]" imageClassName="theme-preserve h-full w-full object-cover" />
          </div>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 px-4 py-5 pb-52">
          <div className="flex items-end justify-between">
            <div>
              <p
                className="mb-1 text-xs uppercase tracking-widest text-[#9BAEC1]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {sessionHeaderLabel} - {sessionDateLabel}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-4xl font-extrabold italic leading-tight tracking-tight text-white">
                  {sessionName}
                </h1>
                {sessionBadgeLabel && (
                  <span
                    className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#0B1F33]"
                    style={{ background: sessionAccent }}
                  >
                    {sessionBadgeLabel}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {sessionFocus}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div
              className="relative overflow-hidden rounded-xl bg-[#13263A] p-5"
              style={{ borderLeft: '4px solid rgba(0,201,167,0.4)' }}
            >
              <p
                className="mb-3 text-[10px] uppercase tracking-widest text-[#9BAEC1]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Volumen total
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-normal text-white">
                  {formatWeightNumber(totalVolume, appSettings.weightUnit, 0)}
                </span>
                <span className="text-sm font-bold italic text-[#9BAEC1]">{weightUnitLabel}</span>
              </div>
            </div>
            <div
              className="relative overflow-hidden rounded-xl bg-[#13263A] p-5"
              style={{ borderLeft: '4px solid rgba(127,152,255,0.4)' }}
            >
              <p
                className="mb-3 text-[10px] uppercase tracking-widest text-[#9BAEC1]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Series completas
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-normal text-white">{totalSetsCompleted}</span>
                <span className="text-sm font-bold italic text-[#9BAEC1]">/ {totalSets}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowFinishModal(true)}
              disabled={isSubmittingSession}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 transition-colors active:bg-[#00b092] disabled:opacity-45"
              type="button"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#003830]/50">
                <div className="h-1.5 w-1.5 rounded-full bg-[#003830]/50" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-[#05231f]">
                {isHistoryEditSession ? 'Guardar cambios' : 'Finalizar entrenamiento'}
              </span>
            </button>

            {isHistoryEditSession && (
              <button
                onClick={() => setShowDeleteSessionModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(229,57,53,0.22)] bg-[rgba(229,57,53,0.08)] py-4 text-[#FF7D7D] transition-colors active:bg-[rgba(229,57,53,0.14)]"
                type="button"
              >
                <Trash2 size={18} />
                <span className="text-sm font-bold uppercase tracking-widest">Eliminar entrenamiento</span>
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-[#203347] bg-[#13263A] p-4">
            <label
              htmlFor="session-notes"
              className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-[#00C9A7]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Notas de la sesión
            </label>
            <textarea
              id="session-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Añadí notas sobre tu sesión, sensaciones o ajustes para la próxima..."
              className="h-24 w-full resize-none rounded-xl border border-[rgba(0,201,167,0.15)] bg-[#1A2D42] p-4 text-sm text-white outline-none transition-colors focus:border-[rgba(0,201,167,0.45)]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            />
          </div>

          {inlineFeedback && (
            <div className="rounded-2xl border border-[rgba(245,185,66,0.22)] bg-[rgba(245,185,66,0.08)] px-4 py-3 text-sm text-[#F5D38A]">
              {inlineFeedback}
            </div>
          )}

          {(isFreeSession || isHistoryEditSession) && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowAddExercise(true)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[rgba(245,185,66,0.25)] bg-[rgba(245,185,66,0.08)] px-3 py-4 text-[#F5B942] transition-colors active:bg-[rgba(245,185,66,0.14)]"
                type="button"
              >
                <Sparkles size={18} />
                <span className="text-sm font-semibold">Agregar Nuevo Ejercicio</span>
              </button>
              <button
                onClick={() => setShowDatabaseExercisePicker(true)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[rgba(0,201,167,0.22)] bg-[rgba(0,201,167,0.08)] px-3 py-4 text-[#00C9A7] transition-colors active:bg-[rgba(0,201,167,0.14)]"
                type="button"
              >
                <Search size={18} />
                <span className="text-sm font-semibold">Agregar Ejercicio</span>
              </button>
            </div>
          )}

          {hasExercises ? (
            <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true, delayTouchStart: 140 }}>
              <div className="flex flex-col gap-4">
                {exerciseList.map((exercise, exerciseIdx) => (
                  <TrainingExerciseCard
                    key={`${exercise.id}-${exerciseIdx}`}
                    htmlId={`session-exercise-${exerciseIdx}`}
                    exercise={exercise}
                    exerciseIdx={exerciseIdx}
                    totalExercises={exerciseList.length}
                    currentExerciseIndex={currentExIdx}
                    weightUnit={appSettings.weightUnit}
                    weightUnitLabel={weightUnitLabel}
                    showPreviousWeight={appSettings.showPreviousWeight}
                    onMoveExercise={moveExercise}
                    onExerciseFocus={setCurrentExIdx}
                    onExerciseMenu={(targetExerciseIdx, rect) => {
                      setCurrentExIdx(targetExerciseIdx);
                      setSetMenuAnchor(null);
                      setExerciseMenuAnchor({ exerciseIdx: targetExerciseIdx, rect });
                    }}
                    onSetMenu={(targetExerciseIdx, setIdx, rect) => {
                      setCurrentExIdx(targetExerciseIdx);
                      setExerciseMenuAnchor(null);
                      setSetMenuAnchor({ exerciseIdx: targetExerciseIdx, setIdx, rect });
                    }}
                    onSetValueChange={updateSetValue}
                    onSetToggleComplete={completeSet}
                    onExerciseNotesChange={updateExerciseNotes}
                    onAddSet={addSet}
                    onRemoveLastSet={(targetExerciseIdx) =>
                      removeSet(targetExerciseIdx, exerciseList[targetExerciseIdx].sets.length - 1)
                    }
                  />
                ))}
              </div>
            </DndProvider>
          ) : (
            <div className="rounded-2xl border border-[rgba(245,185,66,0.18)] bg-[rgba(245,185,66,0.06)] p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[rgba(245,185,66,0.14)] p-3">
                  <Sparkles size={20} className="text-[#F5B942]" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#F5B942]">
                    {isHistoryEditSession ? 'Sesión sin ejercicios' : 'Entrenamiento vacío'}
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-white">
                    {isHistoryEditSession ? 'Sumá ejercicios para completar esta sesión' : 'Empezá agregando tu primer ejercicio'}
                  </h2>
                  <p className="mt-2 text-sm text-[#D8C9A1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {isHistoryEditSession
                      ? 'Podés reconstruir esta sesión del historial agregando ejercicios manualmente o desde tu base actual.'
                      : 'Esta sesión no depende de ninguna rutina. Podés cargar ejercicios manualmente o elegirlos desde tu base actual y guardar el entrenamiento en tu historial.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {restActive && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-[25.5rem] rounded-2xl border border-[rgba(0,201,167,0.15)] bg-[rgba(19,38,58,0.96)] px-4 py-3 shadow-[0_-12px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(0,201,167,0.12)]">
              <TimerReset size={20} className="text-[#00C9A7]" />
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                onClick={() => adjustRestBy(-15)}
                className="rounded-xl border border-[#203347] bg-[#1A2D42] px-3 py-2 text-sm font-bold text-white"
                type="button"
              >
                -15
              </button>

              <div className="min-w-[4.75rem] flex-1 text-center">
                <p className="text-xl font-bold text-white">
                  {restActive ? formatTime(restTime) : `${restConfig}s`}
                </p>
              </div>

              <button
                onClick={() => adjustRestBy(15)}
                className="rounded-xl border border-[#203347] bg-[#1A2D42] px-3 py-2 text-sm font-bold text-white"
                type="button"
              >
                +15
              </button>
            </div>

            <button
              onClick={() => {
                setRestActive(false);
              }}
              className="shrink-0 rounded-xl bg-[#00C9A7] px-4 py-2 text-sm font-bold text-black"
              type="button"
            >
              Omitir
            </button>
          </div>
        </div>
        </div>
      )}

      {exerciseMenuAnchor && currentExercise && (
        <div className="absolute inset-0 z-40">
          <button aria-label="Cerrar menú" className="absolute inset-0 bg-black/20" onClick={closeContextMenus} type="button" />
          <div
            className="fixed z-50 w-[18rem] rounded-3xl border border-[rgba(32,51,71,0.92)] bg-[#13263A] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.42)]"
            style={{
              top: Math.min(exerciseMenuAnchor.rect.bottom + 10, window.innerHeight - 260),
              left: Math.max(12, Math.min(exerciseMenuAnchor.rect.right - 288, window.innerWidth - 300)),
            }}
          >
            <div className="border-b border-white/6 px-2 pb-3">
              <h3 className="text-lg font-bold tracking-tight text-white">{currentExercise.name}</h3>
              <p className="mt-1 text-xs text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {currentExercise.muscle}
                {currentExercise.implement ? ` - ${currentExercise.implement}` : ''}
              </p>
            </div>

            <div className="mt-2 flex flex-col">
              {exerciseMenuItems.map(({ label, icon: Icon, onClick, danger, disabled }) => (
                <button
                  key={label}
                  onClick={onClick}
                  disabled={disabled}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-colors disabled:opacity-45 ${
                    danger ? 'text-[#FF5D5D] hover:bg-[rgba(229,57,53,0.08)]' : 'text-white hover:bg-white/5'
                  }`}
                  type="button"
                >
                  <Icon size={17} className={danger ? 'text-[#FF5D5D]' : 'text-white/85'} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {setMenuAnchor && currentExercise && (
        <div className="absolute inset-0 z-40">
          <button
            aria-label="Cerrar selector de serie"
            className="absolute inset-0 bg-black/20"
            onClick={closeContextMenus}
            type="button"
          />
          <div
            className="fixed z-50 w-[18rem] rounded-3xl border border-[rgba(32,51,71,0.92)] bg-[#13263A] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.42)]"
            style={{
              top: Math.min(setMenuAnchor.rect.bottom + 10, window.innerHeight - 245),
              left: Math.max(12, Math.min(setMenuAnchor.rect.left, window.innerWidth - 300)),
            }}
          >
            <div className="border-b border-white/6 px-2 pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#00C9A7]">
                Set {setMenuAnchor.setIdx + 1}
              </p>
              <h3 className="mt-2 text-lg font-bold tracking-tight text-white">{currentExercise.name}</h3>
            </div>

            <div className="mt-2 flex flex-col gap-1">
              <button
                onClick={() => updateSetKind(currentExIdx, setMenuAnchor.setIdx, 'warmup')}
                className="flex items-center justify-between rounded-2xl border border-[rgba(245,185,66,0.2)] bg-[rgba(245,185,66,0.08)] px-4 py-3 text-left"
                type="button"
              >
                <div>
                  <p className="font-semibold text-white">Serie de calentamiento</p>
                  <p className="mt-1 text-xs text-[#D8C9A1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Ideal para aproximaciones y activación.
                  </p>
                </div>
                <Check size={17} className="text-[#F5B942]" />
              </button>

              <button
                onClick={() => updateSetKind(currentExIdx, setMenuAnchor.setIdx, 'normal')}
                className="flex items-center justify-between rounded-2xl border border-[rgba(0,201,167,0.18)] bg-[rgba(0,201,167,0.08)] px-4 py-3 text-left"
                type="button"
              >
                <div>
                  <p className="font-semibold text-white">Set normal</p>
                  <p className="mt-1 text-xs text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Cuenta como serie principal dentro del ejercicio.
                  </p>
                </div>
                <Check size={17} className="text-[#00C9A7]" />
              </button>

              <button
                onClick={() => removeSet(currentExIdx, setMenuAnchor.setIdx)}
                disabled={currentExercise.sets.length <= 1}
                className="flex items-center justify-between rounded-2xl border border-[rgba(229,57,53,0.18)] bg-[rgba(229,57,53,0.08)] px-4 py-3 text-left text-[#FF7D7D] disabled:opacity-45"
                type="button"
              >
                <div>
                  <p className="font-semibold">Eliminar serie</p>
                  <p className="mt-1 text-xs text-[#D6B9B9]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Quitá esta serie de la sesión actual.
                  </p>
                </div>
                <Trash2 size={17} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showExerciseHistory && currentExercise && (
        <div className="absolute inset-0 z-40 flex items-end">
          <button
            aria-label="Cerrar historial"
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowExerciseHistory(false)}
            type="button"
          />
          <div className="relative z-10 w-full rounded-t-[2rem] bg-[#1A2D42] px-5 pb-6 pt-5">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#3A3F50]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#00C9A7]">
              Historial del ejercicio
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">{currentExercise.name}</h3>
            <p className="mt-2 text-sm text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Tus registros recientes para este movimiento.
            </p>

            <div className="mt-6 flex max-h-[24rem] flex-col gap-3 overflow-y-auto pr-1">
              {exerciseHistoryEntries.length > 0 ? (
                exerciseHistoryEntries.map((entry) => (
                  <button
                    key={`${entry.sessionId}-${entry.sessionDate}`}
                    onClick={() => navigate(`/session-history/${entry.sessionId}`)}
                    className="rounded-2xl border border-[#2A2F3D] bg-[#13263A] p-4 text-left"
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-bold text-white">{entry.sessionName}</p>
                        <p className="mt-1 text-xs text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {entry.sessionDate}
                        </p>
                      </div>
                      <span className="rounded-full bg-[rgba(0,201,167,0.1)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#00C9A7]">
                        PR {entry.maxKg > 0 ? `${formatWeightNumber(entry.maxKg, appSettings.weightUnit)}${weightUnitLabel}` : 'Peso corporal'}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {entry.sets.map((set, index) => (
                        <span
                          key={`${entry.sessionId}-${index}`}
                          className="rounded-full bg-[#1A2D42] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#D8E4FF]"
                        >
                          {set.kg > 0 ? `${formatWeightNumber(set.kg, appSettings.weightUnit)}${weightUnitLabel}` : 'PC'} x {set.reps}
                        </span>
                      ))}
                    </div>
                    {entry.notes && (
                      <p className="mt-3 text-xs text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {entry.notes}
                      </p>
                    )}
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-[#2A2F3D] bg-[#13263A] p-5 text-sm text-[#90A4B8]">
                  Todavía no hay registros guardados para este ejercicio.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showReplaceExercise && currentExercise && (
        <div className="absolute inset-0 z-40 flex items-end">
          <button
            aria-label="Cerrar selector de reemplazo"
            className="absolute inset-0 bg-black/70"
            onClick={() => {
              setShowReplaceExercise(false);
              setReplaceQuery('');
            }}
            type="button"
          />
          <div className="relative z-10 w-full rounded-t-[2rem] bg-[#1A2D42] px-5 pb-6 pt-5">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#3A3F50]" />
            <h3 className="text-2xl font-bold tracking-tight text-white">Reemplazar ejercicio</h3>
            <p className="mt-2 text-sm text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Elegí otra variante disponible en tus rutinas.
            </p>

            <div className="mt-5 rounded-2xl border border-[#2A2F3D] bg-[#13263A] px-4 py-3">
              <div className="flex items-center gap-3">
                <Search size={16} className="text-[#7E8799]" />
                <input
                  value={replaceQuery}
                  onChange={(event) => setReplaceQuery(event.target.value)}
                  placeholder="Buscar por ejercicio, músculo o implemento"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#7E8799]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </div>
            </div>

            <div className="mt-5 flex max-h-[24rem] flex-col gap-3 overflow-y-auto pr-1">
              {filteredReplacementOptions.length > 0 ? (
                filteredReplacementOptions.map((exercise) => (
                  <button
                    key={exercise.name}
                    onClick={() => replaceCurrentExercise(exercise)}
                    className="rounded-2xl border border-[#2A2F3D] bg-[#13263A] p-4 text-left"
                    type="button"
                  >
                    <p className="text-lg font-bold text-white">{exercise.name}</p>
                    <p className="mt-1 text-sm text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {exercise.muscle}
                      {exercise.implement ? ` - ${exercise.implement}` : ''}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {exercise.sets.slice(0, 3).map((set, index) => (
                        <span
                          key={`${exercise.name}-${index}`}
                          className="rounded-full bg-[rgba(0,201,167,0.1)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#00C9A7]"
                        >
                          {set.kg > 0 ? `${formatWeightNumber(set.kg, appSettings.weightUnit)}${weightUnitLabel}` : 'PC'} x {set.reps}
                        </span>
                      ))}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-[#2A2F3D] bg-[#13263A] p-5 text-sm text-[#90A4B8]">
                  No encontramos ejercicios que coincidan con tu búsqueda.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDatabaseExercisePicker && (
        <div className="absolute inset-0 z-40 flex items-end">
          <button
            aria-label="Cerrar selector de base de ejercicios"
            className="absolute inset-0 bg-black/70"
            onClick={closeDatabaseExercisePicker}
            type="button"
          />
          <div className="relative z-10 w-full rounded-t-[2rem] bg-[#1A2D42] px-5 pb-6 pt-5">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#3A3F50]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#00C9A7]">
              Base de ejercicios
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">Agregar Ejercicio</h3>
            <p className="mt-2 text-sm text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
              {isHistoryEditSession
                ? 'Elegí ejercicios ya existentes en tus rutinas para sumarlos a esta sesión del historial.'
                : 'Elegí ejercicios ya existentes en tus rutinas para sumarlos a este entrenamiento libre.'}
            </p>

            <div className="mt-5 rounded-2xl border border-[#2A2F3D] bg-[#13263A] px-4 py-3">
              <div className="flex items-center gap-3">
                <Search size={16} className="text-[#7E8799]" />
                <input
                  value={databaseQuery}
                  onChange={(event) => setDatabaseQuery(event.target.value)}
                  placeholder="Buscar por ejercicio, músculo o implemento"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#7E8799]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </div>
            </div>

            <div className="mt-5 flex max-h-[24rem] flex-col gap-3 overflow-y-auto pr-1">
              {filteredDatabaseExerciseOptions.length > 0 ? (
                filteredDatabaseExerciseOptions.map((exercise) => (
                  <button
                    key={exercise.name}
                    onClick={() => addDatabaseExercise(exercise)}
                    className="rounded-2xl border border-[#2A2F3D] bg-[#13263A] p-4 text-left"
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-white">{exercise.name}</p>
                        <p className="mt-1 text-sm text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {exercise.muscle}
                          {exercise.implement ? ` - ${exercise.implement}` : ''}
                        </p>
                      </div>
                      <div className="rounded-full bg-[rgba(0,201,167,0.1)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#00C9A7]">
                        Agregar
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {exercise.sets.slice(0, 3).map((set, index) => (
                        <span
                          key={`${exercise.name}-${index}`}
                          className="rounded-full bg-[rgba(0,201,167,0.1)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#00C9A7]"
                        >
                          {set.kg > 0 ? `${formatWeightNumber(set.kg, appSettings.weightUnit)}${weightUnitLabel}` : 'PC'} x {set.reps}
                        </span>
                      ))}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-[#2A2F3D] bg-[#13263A] p-5 text-sm text-[#90A4B8]">
                  No hay ejercicios disponibles para agregar con esa búsqueda.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddExercise && (
        <div className="absolute inset-0 z-40 flex items-end">
          <button
            aria-label="Cerrar carga manual"
            className="absolute inset-0 bg-black/70"
            onClick={closeAddExercise}
            type="button"
          />
          <div className="relative z-10 w-full rounded-t-[2rem] bg-[#1A2D42] px-5 pb-6 pt-5">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#3A3F50]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#F5B942]">
              {isHistoryEditSession ? 'Edición del historial' : 'Sesión libre'}
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">Agregar Nuevo Ejercicio</h3>
            <p className="mt-2 text-sm text-[#D8C9A1]" style={{ fontFamily: "'Inter', sans-serif" }}>
              {isHistoryEditSession
                ? 'Cargá el ejercicio para completar o corregir esta sesión guardada.'
                : 'Cargá el ejercicio para empezar o seguir tu entrenamiento libre.'}
            </p>

            <div className="mt-6 flex flex-col gap-4">
              <div>
                <label
                  htmlFor="manual-exercise-name"
                  className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-[#F5B942]"
                >
                  Nombre del ejercicio
                </label>
                <input
                  id="manual-exercise-name"
                  value={newExerciseName}
                  onChange={(event) => setNewExerciseName(event.target.value)}
                  placeholder="Ej. Press militar con mancuernas"
                  className="w-full rounded-2xl border border-[rgba(245,185,66,0.16)] bg-[#13263A] px-4 py-3 text-white outline-none transition-colors focus:border-[rgba(245,185,66,0.4)]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </div>

              <div>
                <label
                  htmlFor="manual-exercise-muscle"
                  className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-[#F5B942]"
                >
                  Músculo principal
                </label>
                <input
                  id="manual-exercise-muscle"
                  value={newExerciseMuscle}
                  onChange={(event) => setNewExerciseMuscle(event.target.value)}
                  placeholder="Ej. Hombros"
                  className="w-full rounded-2xl border border-[rgba(245,185,66,0.16)] bg-[#13263A] px-4 py-3 text-white outline-none transition-colors focus:border-[rgba(245,185,66,0.4)]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </div>

              <div>
                <label
                  htmlFor="manual-exercise-implement"
                  className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-[#F5B942]"
                >
                  Implemento o variante
                </label>
                <input
                  id="manual-exercise-implement"
                  value={newExerciseImplement}
                  onChange={(event) => setNewExerciseImplement(event.target.value)}
                  placeholder="Opcional"
                  className="w-full rounded-2xl border border-[rgba(245,185,66,0.16)] bg-[#13263A] px-4 py-3 text-white outline-none transition-colors focus:border-[rgba(245,185,66,0.4)]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </div>

              <div className="mt-2 flex flex-col gap-3">
                <button
                  onClick={addManualExercise}
                  disabled={!newExerciseName.trim() || !newExerciseMuscle.trim()}
                  className="w-full rounded-2xl bg-[#F5B942] py-4 font-bold text-[#1A1300] disabled:opacity-50"
                  type="button"
                >
                  Agregar ejercicio
                </button>
                <button
                  onClick={closeAddExercise}
                  className="w-full rounded-2xl bg-[#13263A] py-4 font-semibold text-white"
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFinishModal && (
        <div className="absolute inset-0 z-40 flex items-center justify-center px-5">
          <button
            aria-label="Cerrar finalización"
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowFinishModal(false)}
            type="button"
          />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-[#1A2D42] p-6">
            <h3 className="text-center text-3xl font-bold tracking-tight text-white">
              {isHistoryEditSession ? '¿Guardar cambios de la sesión?' : '¿Finalizar entrenamiento?'}
            </h3>
            <p className="mt-3 text-center text-base text-[#D4D4D4]" style={{ fontFamily: "'Inter', sans-serif" }}>
              {isHistoryEditSession
                ? `Vas a actualizar esta sesión con ${totalSetsCompleted}/${totalSets} series completas en ${formatTime(elapsed)} totales.`
                : `Llevas ${formatTime(elapsed)} entrenando y completaste ${totalSetsCompleted}/${totalSets} series.`}
            </p>
            {!hasExercises && (
              <p className="mt-3 text-center text-sm text-[#F5B942]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {isHistoryEditSession
                  ? 'Agregá al menos un ejercicio para guardar los cambios, o descartalos.'
                  : 'Agregá al menos un ejercicio para guardar esta sesión, o descartala.'}
              </p>
            )}

            {missingSets.length > 0 && (
              <div className="mt-5 rounded-2xl border border-[rgba(245,185,66,0.18)] bg-[rgba(245,185,66,0.06)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#F5B942]">
                  Series faltantes
                </p>
                <div className="mt-3 flex max-h-44 flex-col gap-2 overflow-y-auto">
                  {missingSets.map(({ exercise, exerciseIdx, set, setIdx }) => (
                    <button
                      key={`${exercise.id}-${set.id}-${setIdx}`}
                      onClick={() => jumpToMissingSet(exerciseIdx)}
                      className="rounded-2xl border border-[rgba(245,185,66,0.14)] bg-[rgba(19,38,58,0.72)] px-4 py-3 text-left transition-colors active:bg-[rgba(245,185,66,0.1)]"
                      type="button"
                    >
                      <p className="text-sm font-semibold text-white">{exercise.name}</p>
                      <p className="mt-1 text-xs text-[#D8C9A1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {set.kind === 'warmup' ? 'Calentamiento' : `Set ${setIdx + 1}`} pendiente
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => void finishSession()}
                disabled={!hasExercises || isSubmittingSession}
                className="w-full rounded-2xl bg-[#F43A33] py-4 font-bold text-white disabled:opacity-45"
                type="button"
              >
                {isSubmittingSession
                  ? 'Guardando...'
                  : isHistoryEditSession
                  ? 'Guardar cambios'
                  : 'Finalizar entrenamiento'}
              </button>
              <button
                onClick={() => setShowFinishModal(false)}
                className="w-full rounded-2xl bg-[#2A2A2A] py-4 font-semibold text-white"
                type="button"
              >
                {missingSets.length > 0 ? 'Volver a completar' : isHistoryEditSession ? 'Seguir editando' : 'Continuar'}
              </button>
              <button
                onClick={discardSession}
                className="w-full rounded-2xl border border-[rgba(229,57,53,0.2)] bg-[rgba(229,57,53,0.08)] py-4 font-semibold text-[#FF7D7D]"
                type="button"
              >
                {isHistoryEditSession ? 'Descartar cambios' : 'Descartar entrenamiento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteSessionModal && historicalSession && (
        <div className="absolute inset-0 z-40 flex items-center justify-center px-5">
          <button
            aria-label="Cerrar confirmación de borrado"
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowDeleteSessionModal(false)}
            type="button"
          />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-[#1A2D42] p-6">
            <h3 className="text-center text-3xl font-bold tracking-tight text-white">
              ¿Estás seguro de eliminar este entrenamiento?
            </h3>
            <p className="mt-3 text-center text-base text-[#D4D4D4]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Vas a borrar esta sesión del historial y no se va a poder recuperar.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => void deleteHistoricalSession()}
                className="w-full rounded-2xl bg-[#F43A33] py-4 font-bold text-white"
                type="button"
              >
                Sí, eliminar entrenamiento
              </button>
              <button
                onClick={() => setShowDeleteSessionModal(false)}
                className="w-full rounded-2xl bg-[#2A2A2A] py-4 font-semibold text-white"
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
