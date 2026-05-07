import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  BookOpen,
  Check,
  GripVertical,
  History,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  TimerReset,
  Trash2,
} from 'lucide-react';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router';
import { brandLogoWhite } from '@/assets';
import { NumberWheelPicker } from '@/features/onboarding/components/WheelPickers';
import type { WheelPickerOption } from '@/features/onboarding/components/WheelPickers';
import { buildExerciseTemplateFromCatalog } from '@/features/exercises/lib/exerciseCatalog';
import type { CatalogExerciseItem } from '@/features/exercises/components/ExerciseDetailSheet';
import { useExerciseCatalog } from '@/features/exercises/hooks/useExerciseCatalog';
import { ActiveWorkoutEditLockModal } from '@/shared/components/layout/ActiveWorkoutEditLockModal';
import { ExerciseContextMenu } from '@/shared/components/ExerciseContextMenu';
import type { ContextMenuItem } from '@/shared/components/ExerciseContextMenu';
import { TrainingExerciseCard } from '@/features/session/components/TrainingExerciseCard';
import { ExerciseHistorySheet } from '@/features/session/components/ExerciseHistorySheet';
import type { ExerciseHistoryEntry } from '@/features/session/components/ExerciseHistorySheet';
import { ExerciseDetailModal } from '@/features/session/components/ExerciseDetailModal';
import type { ExerciseDetailInfo } from '@/features/session/components/ExerciseDetailModal';
import { FinishSessionModal } from '@/features/session/components/FinishSessionModal';
import { DeleteSessionConfirmModal } from '@/features/session/components/DeleteSessionConfirmModal';
import {
  buildExerciseState,
  buildExerciseStateFromHistorySession,
  buildExerciseStateFromTemplate,
  buildManualExerciseState,
  DEFAULT_REST,
  type ExerciseState,
  formatTime,
  FREE_SESSION_FOCUS,
  FREE_SESSION_NAME,
  isBodyweightExercise,
  markExerciseSetsCompleted,
} from '@/features/session/lib/sessionDrafts';
import { useAppData } from '@/core/app-data/AppDataContext';
import type {
  ActiveWorkoutDraft,
  ActiveWorkoutSet,
  ExerciseData,
  SessionHistory,
} from '@/shared/types/models';
import { formatWeightNumber, getAutoWeightIncrementKg, getWeightUnitLabel, parseWeightInputValue } from '@/shared/lib/unitUtils';

type SessionLocationState = {
  routineId?: number;
  dayName?: string;
  mode?: 'free' | 'history-edit';
  action?: 'finish';
  sessionId?: number;
};

type SetState = ActiveWorkoutSet;

type ShellBounds = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const REST_OPTIONS: WheelPickerOption[] = [
  { value: '30', label: '30s' },
  { value: '45', label: '45s' },
  { value: '60', label: '1min' },
  { value: '90', label: '1min 30s' },
  { value: '120', label: '2min' },
  { value: '180', label: '3min' },
  { value: '240', label: '4min' },
];

const REST_VALID_VALUES = new Set(REST_OPTIONS.map((option) => option.value));

function buildExerciseTemplateFromCatalogResult(item: CatalogExerciseItem): ExerciseData | null {
  const name = item.name?.trim();
  const muscle = item.muscle?.trim();

  if (!name || !muscle) {
    return null;
  }

  const stableIdSource = item.exerciseSlug?.trim() || name;
  const stableId = Array.from(stableIdSource).reduce((total, character) => total + character.charCodeAt(0), 0);

  return {
    id: stableId,
    exerciseSlug: item.exerciseSlug?.trim() || undefined,
    name,
    muscle,
    implement: item.implement?.trim() || undefined,
    secondaryMuscles: item.secondaryMuscles ?? [],
    notes: '',
    sets: Array.from({ length: 3 }, (_, index) => ({
      id: index + 1,
      kg: 0,
      reps: 10,
      rpe: 0,
      completed: false,
      kind: 'normal' as const,
    })),
  };
}

export default function TrainingSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as SessionLocationState | undefined;
  const {
    catalog: exerciseCatalog,
    error: exerciseCatalogError,
    isLoading: isExerciseCatalogLoading,
  } = useExerciseCatalog();
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
  const baseSessionFocus =
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
  const [showRestPicker, setShowRestPicker] = useState(false);
  const [restTargetExerciseIdx, setRestTargetExerciseIdx] = useState<number | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showDatabaseExercisePicker, setShowDatabaseExercisePicker] = useState(false);
  const [restPickerDraft, setRestPickerDraft] = useState('90');
  const [databaseQuery, setDatabaseQuery] = useState('');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscle, setNewExerciseMuscle] = useState('');
  const [newExerciseImplement, setNewExerciseImplement] = useState('');
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);
  const [inlineFeedback, setInlineFeedback] = useState<string | null>(null);
  const [exerciseMenuAnchor, setExerciseMenuAnchor] = useState<{ exerciseIdx: number; rect: DOMRect } | null>(null);
  const [setMenuAnchor, setSetMenuAnchor] = useState<{
    exerciseIdx: number;
    setIdx: number;
    rect: DOMRect;
  } | null>(null);
  const [sessionExerciseDetail, setSessionExerciseDetail] = useState<ExerciseDetailInfo | null>(null);
  const [sessionOverlayBounds, setSessionOverlayBounds] = useState<ShellBounds | null>(null);
  const [reorderDragState, setReorderDragState] = useState<{ fromIndex: number; toIndex: number } | null>(null);
  const reorderDragStateRef = useRef<{ fromIndex: number; toIndex: number } | null>(null);
  const reorderListRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sessionTimeLimitRef = useRef(false);
  const shouldPersistDraftRef = useRef(true);

  const sessionFocus = useMemo(() => {
    const uniqueMuscles: string[] = [];
    const seenMuscles = new Set<string>();

    for (const exercise of exerciseList) {
      const muscle = exercise.muscle?.trim();
      if (!muscle) {
        continue;
      }

      const normalizedMuscle = muscle.toLowerCase();
      if (seenMuscles.has(normalizedMuscle)) {
        continue;
      }

      seenMuscles.add(normalizedMuscle);
      uniqueMuscles.push(muscle);
    }

    return uniqueMuscles.length > 0 ? uniqueMuscles.join(', ') : baseSessionFocus;
  }, [baseSessionFocus, exerciseList]);

  const syncSessionOverlayBounds = useCallback(() => {
    if (typeof window === 'undefined') return;

    const shell = document.querySelector<HTMLElement>('.wohl-shell');
    if (shell) {
      const rect = shell.getBoundingClientRect();
      setSessionOverlayBounds({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      return;
    }

    setSessionOverlayBounds({
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!(sessionExerciseDetail || showExerciseHistory || showReorderModal || showFinishModal || showDeleteSessionModal) || typeof window === 'undefined') {
      return;
    }

    syncSessionOverlayBounds();

    const viewport = window.visualViewport;
    window.addEventListener('resize', syncSessionOverlayBounds);
    viewport?.addEventListener('resize', syncSessionOverlayBounds);
    viewport?.addEventListener('scroll', syncSessionOverlayBounds);

    return () => {
      window.removeEventListener('resize', syncSessionOverlayBounds);
      viewport?.removeEventListener('resize', syncSessionOverlayBounds);
      viewport?.removeEventListener('scroll', syncSessionOverlayBounds);
    };
  }, [sessionExerciseDetail, showExerciseHistory, showReorderModal, showFinishModal, showDeleteSessionModal, syncSessionOverlayBounds]);

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
    if (isHistoryEditSession || !shouldPersistDraftRef.current) {
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
    const locState = location.state as {
      catalogResult?: {
        exercises: CatalogExerciseItem[];
        mode: 'add' | 'replace';
        replaceIndex?: number;
      };
    } | null;
    const result = locState?.catalogResult;
    if (!result || result.mode !== 'replace' || result.replaceIndex === undefined || !result.exercises[0]) {
      return;
    }

    const catalogItem = result.exercises[0];
    const replaceIdx = result.replaceIndex;
    const catalogEntry = catalogItem.exerciseSlug
      ? exerciseCatalog.find((entry) => entry.slug === catalogItem.exerciseSlug)
      : undefined;
    const template = catalogEntry
      ? buildExerciseTemplateFromCatalog(catalogEntry)
      : buildExerciseTemplateFromCatalogResult(catalogItem);

    if (!template) {
      return;
    }

    replaceCurrentExercise(template, replaceIdx);
    navigate(location.pathname, { replace: true, state: {} });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseCatalog, location.pathname, location.state]);

  useEffect(() => {
    if (!inlineFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => setInlineFeedback(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [inlineFeedback]);

  useEffect(() => {
    if (isHistoryEditSession || elapsed < 14400 || sessionTimeLimitRef.current) {
      return;
    }
    sessionTimeLimitRef.current = true;
    setShowFinishModal(true);
  }, [elapsed, isHistoryEditSession]);

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
  const getExerciseRestSeconds = useCallback(
    (exercise: Pick<ExerciseState, 'restSeconds'> | null | undefined) =>
      (exercise?.restSeconds ?? appSettings.restTimerSeconds) || DEFAULT_REST,
    [appSettings.restTimerSeconds]
  );

  useEffect(() => {
    const nextRestConfig = getExerciseRestSeconds(currentExercise);
    setRestConfig(nextRestConfig);
    if (!restActive) {
      setRestTime(nextRestConfig);
    }
  }, [currentExercise, getExerciseRestSeconds, restActive]);

  const updateExerciseRestSeconds = (exerciseIdx: number, seconds: number) => {
    setExerciseList((previous) =>
      previous.map((exercise, candidateExerciseIdx) =>
        candidateExerciseIdx === exerciseIdx ? { ...exercise, restSeconds: seconds } : exercise
      )
    );
  };
  const catalogExerciseTemplates = useMemo(
    () => exerciseCatalog.map((exercise) => buildExerciseTemplateFromCatalog(exercise)),
    [exerciseCatalog]
  );

  const catalogBySlug = useMemo(
    () => new Map(exerciseCatalog.filter((e) => Boolean(e.coverImageUrl)).map((e) => [e.slug, e])),
    [exerciseCatalog]
  );
  const catalogSummaryBySlug = useMemo(
    () => new Map(exerciseCatalog.map((exercise) => [exercise.slug, exercise])),
    [exerciseCatalog]
  );
  const fallbackExerciseTemplates = useMemo(
    () =>
      routines
        .flatMap((item) => item.days.flatMap((day) => day.exercises))
        .filter(
          (exercise, index, array) =>
            array.findIndex((candidate) => {
              const candidateKey = candidate.exerciseSlug?.toLowerCase() ?? candidate.name.toLowerCase();
              const exerciseKey = exercise.exerciseSlug?.toLowerCase() ?? exercise.name.toLowerCase();
              return candidateKey === exerciseKey;
            }) === index
        ),
    [routines]
  );
  const exerciseCatalogTemplates =
    catalogExerciseTemplates.length > 0 ? catalogExerciseTemplates : fallbackExerciseTemplates;
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
  const missingSetsGrouped = (() => {
    const uniqueIdxs = [...new Set(missingSets.map((ms) => ms.exerciseIdx))];
    return uniqueIdxs.map((exIdx) => ({
      exerciseName: exerciseList[exIdx]?.name ?? '',
      exerciseIdx: exIdx,
      count: missingSets.filter((ms) => ms.exerciseIdx === exIdx).length,
    }));
  })();
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

  const databaseExerciseOptions = useMemo(() => {
    const currentNames = new Set(
      exerciseList.map((exercise) => exercise.exerciseSlug?.toLowerCase() ?? exercise.name.toLowerCase())
    );

    return exerciseCatalogTemplates.filter((exercise) => {
      const exerciseIdentity =
        exercise.exerciseSlug?.toLowerCase() ?? exercise.name.toLowerCase();
      return !currentNames.has(exerciseIdentity);
    });
  }, [exerciseCatalogTemplates, exerciseList]);

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

  const buildSessionExerciseDetail = useCallback(
    (exercise: Pick<ExerciseData, 'exerciseSlug' | 'name' | 'muscle' | 'implement' | 'secondaryMuscles'> | null) => {
      if (!exercise) {
        return null;
      }

      const catalogSummary = exercise.exerciseSlug
        ? catalogSummaryBySlug.get(exercise.exerciseSlug)
        : exerciseCatalog.find((entry) => entry.title === exercise.name);
      const fallbackTemplate = exercise.exerciseSlug
        ? exerciseCatalogTemplates.find((entry) => entry.exerciseSlug === exercise.exerciseSlug)
        : exerciseCatalogTemplates.find((entry) => entry.name === exercise.name);

      if (!catalogSummary && !fallbackTemplate) {
        return null;
      }

      const secondaryMuscles = catalogSummary?.secondaryMuscles ?? fallbackTemplate?.secondaryMuscles ?? exercise.secondaryMuscles ?? [];
      const implement = catalogSummary?.implement ?? fallbackTemplate?.implement ?? exercise.implement;

      return {
        name: catalogSummary?.title ?? fallbackTemplate?.name ?? exercise.name,
        titleEn:
          catalogSummary?.titleEn ??
          exercise.exerciseSlug?.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()) ??
          exercise.name,
        animationMediaUrl: catalogSummary?.animationMediaUrl,
        muscle: catalogSummary?.muscle ?? fallbackTemplate?.muscle ?? exercise.muscle,
        secondaryMuscles,
        implement,
        instructions: catalogSummary?.instructions ?? [],
        overview: catalogSummary?.overview ?? '',
      };
    },
    [catalogSummaryBySlug, exerciseCatalog, exerciseCatalogTemplates]
  );

  const openSessionExerciseDetail = useCallback(
    (exercise: Pick<ExerciseData, 'exerciseSlug' | 'name' | 'muscle' | 'implement' | 'secondaryMuscles'> | null) => {
      const detail = buildSessionExerciseDetail(exercise);
      if (!detail) {
        return false;
      }

      setSessionExerciseDetail(detail);
      return true;
    },
    [buildSessionExerciseDetail]
  );

  const buildExerciseOptionSummary = (exercise: ExerciseData) => {
    const baseReps = exercise.sets[0]?.reps ?? 10;
    const repsLabel = exercise.sets.every((set) => set.reps === baseReps)
      ? `${baseReps} reps`
      : `${exercise.sets[0]?.reps ?? 0}-${exercise.sets[exercise.sets.length - 1]?.reps ?? 0} reps`;

    return `${exercise.sets.length} series base - ${repsLabel}`;
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

  const reorderDisplayList = (() => {
    if (!reorderDragState || reorderDragState.fromIndex === reorderDragState.toIndex) {
      return exerciseList;
    }
    const arr = [...exerciseList];
    const [item] = arr.splice(reorderDragState.fromIndex, 1);
    arr.splice(reorderDragState.toIndex, 0, item);
    return arr;
  })();

  const handleReorderPointerDown = (e: ReactPointerEvent<HTMLElement>, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    navigator.vibrate?.(12);
    const state = { fromIndex: idx, toIndex: idx };
    reorderDragStateRef.current = state;
    setReorderDragState(state);
  };

  const handleReorderPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (!reorderDragStateRef.current || !reorderListRef.current) return;
    e.preventDefault();
    const children = Array.from(reorderListRef.current.children) as HTMLElement[];
    let newTo = children.length - 1;
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) { newTo = i; break; }
    }
    if (newTo !== reorderDragStateRef.current.toIndex) {
      const updated = { ...reorderDragStateRef.current, toIndex: newTo };
      reorderDragStateRef.current = updated;
      setReorderDragState(updated);
    }
  };

  const handleReorderPointerUp = (e?: ReactPointerEvent<HTMLElement>) => {
    if (e?.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!reorderDragStateRef.current) return;
    const { fromIndex, toIndex } = reorderDragStateRef.current;
    reorderDragStateRef.current = null;
    setReorderDragState(null);
    if (fromIndex !== toIndex) moveExercise(fromIndex, toIndex);
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

        const suggestionField = field === 'kg' ? 'suggestedKg' : 'suggestedReps';
        const nextSets = exercise.sets.map((set, index) => {
          if (index === setIdx) {
            return { ...set, [field]: numericValue };
          }

          if (index <= setIdx) {
            return set;
          }

          const shouldPropagate = !set.completed && set[field] === 0;

          if (!shouldPropagate) {
            return set;
          }

          return { ...set, [suggestionField]: numericValue };
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
    const referenceKg = lastSet?.kg || lastSet?.suggestedKg || lastSet?.prevKg || 0;
    const referenceReps = lastSet?.reps || lastSet?.suggestedReps || lastSet?.prevReps || 0;

    return {
      id: targetExercise.sets.length + 1,
      kg: 0,
      reps: 0,
      rpe: 0,
      completed: isHistoryEditSession,
      prevKg: lastSet?.prevKg ?? referenceKg,
      prevReps: lastSet?.prevReps ?? referenceReps,
      suggestedKg:
        kind === 'warmup'
          ? referenceKg || undefined
          : appSettings.autoWeightIncrement && referenceKg > 0
          ? Number((referenceKg + getAutoWeightIncrementKg(appSettings.weightUnit)).toFixed(2))
          : referenceKg || undefined,
      suggestedReps: referenceReps || undefined,
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

  const getSuggestedSetValues = (set: SetState) => ({
    kg: set.suggestedKg ?? (appSettings.showPreviousWeight ? set.prevKg : 0) ?? 0,
    reps: set.suggestedReps ?? (appSettings.showPreviousWeight ? set.prevReps : 0) ?? 0,
  });

  const getEffectiveSetValues = (set: SetState) => {
    const suggested = getSuggestedSetValues(set);

    return {
      kg: set.kg > 0 ? set.kg : suggested.kg,
      reps: set.reps > 0 ? set.reps : suggested.reps,
    };
  };

  const isSetReadyToComplete = (exercise: ExerciseState, set: SetState) => {
    const effectiveSet = getEffectiveSetValues(set);

    if (isBodyweightExercise(exercise)) {
      return effectiveSet.reps > 0;
    }

    return effectiveSet.kg > 0 && effectiveSet.reps > 0;
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

        const nextSetValues = getEffectiveSetValues(targetSet);

        return {
          ...exercise,
          sets: exercise.sets.map((set, index) =>
            index === setIdx
              ? {
                  ...set,
                  kg: nextCompleted ? nextSetValues.kg : set.kg,
                  reps: nextCompleted ? nextSetValues.reps : set.reps,
                  completed: nextCompleted,
                }
              : set
          ),
        };
      })
    );

    if (nextCompleted && !isHistoryEditSession) {
      const nextRestSeconds = getExerciseRestSeconds(targetExercise);
      setRestConfig(nextRestSeconds);
      setRestTime(nextRestSeconds);
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

      shouldPersistDraftRef.current = false;
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

    shouldPersistDraftRef.current = false;
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

  const replaceCurrentExercise = (exercise: ExerciseData, replaceIdx: number = currentExIdx) => {
    const replacement = buildExerciseStateFromTemplate(exercise, sessionHistory, appSettings.showPreviousWeight);
    const normalizedReplacement = isHistoryEditSession ? markExerciseSetsCompleted(replacement) : replacement;

    setExerciseList((previous) =>
      previous.map((item, index) => (index === replaceIdx ? normalizedReplacement : item))
    );
    setCurrentExIdx(replaceIdx);
    closeContextMenus();
  };

  const adjustRestBy = (seconds: number) => {
    const targetExerciseIdx = Math.max(0, Math.min(currentExIdx, Math.max(0, exerciseList.length - 1)));
    const targetExercise = exerciseList[targetExerciseIdx] ?? currentExercise;
    const baseValue = restActive ? restTime : getExerciseRestSeconds(targetExercise);
    const nextValue = Math.max(15, Math.min(600, baseValue + seconds));

    setRestConfig(nextValue);
    setRestTime(nextValue);
    updateExerciseRestSeconds(targetExerciseIdx, nextValue);
  };

  const openRestEditor = (exerciseIdx: number = currentExIdx) => {
    const targetExerciseIdx = Math.max(0, Math.min(exerciseIdx, Math.max(0, exerciseList.length - 1)));
    const currentValue = String(getExerciseRestSeconds(exerciseList[targetExerciseIdx]));
    setCurrentExIdx(targetExerciseIdx);
    setRestTargetExerciseIdx(targetExerciseIdx);
    setRestPickerDraft(REST_VALID_VALUES.has(currentValue) ? currentValue : '90');
    setShowRestPicker(true);
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
        const exerciseSlug = currentExercise?.exerciseSlug;
        setExerciseMenuAnchor(null);
        if (exerciseSlug) {
          void navigate(`/muscle-progress/${exerciseSlug}`);
          return;
        }

        setShowExerciseHistory(true);
      },
    },
    {
      label: 'Reemplazar ejercicio',
      icon: RefreshCw,
      onClick: () => {
        const targetIdx = exerciseMenuAnchor?.exerciseIdx ?? currentExIdx;
        setExerciseMenuAnchor(null);
        void navigate('/exercise-catalog', {
          state: {
            mode: 'replace',
            replaceIndex: targetIdx,
            dayIndex: 0,
            dayName: '',
            existingDaySlugs: [],
            currentDayExerciseCount: 0,
            returnTo: '/session',
          },
        });
      },
    },
    {
      label: 'Editar Descanso',
      icon: TimerReset,
      onClick: () => {
        const targetIdx = exerciseMenuAnchor?.exerciseIdx ?? currentExIdx;
        setExerciseMenuAnchor(null);
        openRestEditor(targetIdx);
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
      disabled: !buildSessionExerciseDetail(currentExercise),
      onClick: () => {
        if (openSessionExerciseDetail(currentExercise)) {
          setExerciseMenuAnchor(null);
        }
      },
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
        className="sticky top-0 z-30 shrink-0 border-b border-[#203347] px-5 shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
        style={{ background: '#0B1F33', paddingTop: 'var(--wohl-safe-top)' }}
      >
        <div className="flex h-16 items-center justify-between">
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
            <button
              onClick={() => setShowFinishModal(true)}
              disabled={isSubmittingSession}
              className="rounded-full border border-[rgba(0,201,167,0.22)] bg-[rgba(0,201,167,0.12)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#00C9A7] transition-colors active:bg-[rgba(0,201,167,0.18)] disabled:opacity-45"
              type="button"
            >
              {isHistoryEditSession ? 'Guardar' : 'Finalizar'}
            </button>
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
            <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true, delayTouchStart: 500, delayMouseStart: 500 }}>
              <div className="flex flex-col gap-4">
                {exerciseList.map((exercise, exerciseIdx) => {
                  const catalogEntry = exercise.exerciseSlug
                    ? catalogBySlug.get(exercise.exerciseSlug)
                    : undefined;
                  return (
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
                    coverImageUrl={catalogEntry?.coverImageUrl}
                    onThumbnailClick={catalogEntry ? () => void openSessionExerciseDetail(exercise) : undefined}
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
                    onOpenRestTimer={(targetExerciseIdx) => {
                      openRestEditor(targetExerciseIdx);
                    }}
                    onReorderClick={() => setShowReorderModal(true)}
                  />
                  );
                })}
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
          {hasExercises && (
            <button
              onClick={() => setShowFinishModal(true)}
              disabled={isSubmittingSession}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(0,201,167,0.18)] bg-[rgba(0,201,167,0.1)] py-4 transition-colors active:bg-[rgba(0,201,167,0.16)] disabled:opacity-45"
              type="button"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#00C9A7]/40">
                <div className="h-1.5 w-1.5 rounded-full bg-[#00C9A7]" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-[#00C9A7]">
                {isHistoryEditSession ? 'Guardar cambios' : 'Finalizar entrenamiento'}
              </span>
            </button>
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

      <NumberWheelPicker
        open={showRestPicker}
        title="Descanso"
        subtitle="Tiempo entre series"
        value={{ whole: restPickerDraft }}
        onChange={(value) => setRestPickerDraft(value.whole)}
        onClose={() => {
          setShowRestPicker(false);
          setRestTargetExerciseIdx(null);
        }}
        onConfirm={() => {
          const seconds = Number(restPickerDraft);
          if (!Number.isFinite(seconds) || seconds <= 0) {
            setShowRestPicker(false);
            setRestTargetExerciseIdx(null);
            return;
          }

          const targetExerciseIdx = restTargetExerciseIdx ?? currentExIdx;
          setCurrentExIdx(targetExerciseIdx);
          updateExerciseRestSeconds(targetExerciseIdx, seconds);
          setRestConfig(seconds);
          setRestTime(seconds);
          setShowRestPicker(false);
          setRestTargetExerciseIdx(null);
        }}
        wholeOptions={REST_OPTIONS}
      />

      {exerciseMenuAnchor && currentExercise && (
        <ExerciseContextMenu
          items={exerciseMenuItems as ContextMenuItem[]}
          anchorRect={exerciseMenuAnchor.rect}
          title={currentExercise.name}
          subtitle={`${currentExercise.muscle}${currentExercise.implement ? ` - ${currentExercise.implement}` : ''}`}
          onClose={closeContextMenus}
        />
      )}

      {setMenuAnchor && currentExercise && (() => {
        const setRect = setMenuAnchor.rect;
        const menuH = 245;
        const spaceBelow = window.innerHeight - setRect.bottom;
        const setTop = spaceBelow >= menuH + 8
          ? setRect.bottom + 8
          : Math.max(10, setRect.top - menuH - 8);
        const setLeft = Math.max(12, Math.min(setRect.left, window.innerWidth - 300));
        return (
        <div className="absolute inset-0 z-40">
          <button
            aria-label="Cerrar selector de serie"
            className="absolute inset-0 bg-black/20"
            onClick={closeContextMenus}
            type="button"
          />
          <div
            className="fixed z-50 w-[18rem] rounded-3xl border border-[rgba(32,51,71,0.92)] bg-[#13263A] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.42)]"
            style={{ top: setTop, left: setLeft }}
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
        );
      })()}

      <ExerciseHistorySheet
        isOpen={showExerciseHistory && currentExercise !== null}
        exerciseName={currentExercise?.name ?? ''}
        entries={exerciseHistoryEntries as ExerciseHistoryEntry[]}
        weightUnit={appSettings.weightUnit}
        weightUnitLabel={weightUnitLabel}
        overlayBounds={sessionOverlayBounds}
        onClose={() => setShowExerciseHistory(false)}
      />

      {showReorderModal
        ? createPortal(
            <div
              className="fixed z-40 flex items-center justify-center px-5 py-6"
              style={
                sessionOverlayBounds
                  ? {
                      top: sessionOverlayBounds.top,
                      left: sessionOverlayBounds.left,
                      width: sessionOverlayBounds.width,
                      height: sessionOverlayBounds.height,
                    }
                  : { inset: 0 }
              }
            >
              <button
                aria-label="Cerrar reordenador"
                className="absolute inset-0 bg-black/70"
                onClick={() => setShowReorderModal(false)}
                type="button"
              />
              <div className="relative z-10 flex w-full max-h-[calc(100%-3rem)] flex-col overflow-hidden rounded-3xl bg-[#1A2D42] shadow-[0_24px_60px_rgba(0,0,0,0.42)]">
                <div className="mx-auto mb-3 mt-4 h-1 w-10 shrink-0 rounded-full bg-[#203347]" />
                <div className="flex min-h-0 flex-1 flex-col px-5 pb-6 pt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#00C9A7]">
                    Sesión activa
                  </p>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">Reordenar ejercicios</h3>
                  <p className="mt-1 text-sm text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Mantené apretada la portada o el handle de puntos y arrastrá para cambiar el orden.
                  </p>
                  <div
                    ref={reorderListRef}
                    className={`mt-5 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1 ${reorderDragState ? 'touch-none select-none' : ''}`}
                  >
                    {reorderDisplayList.map((ex, displayIdx) => {
                      const catalogEntry = ex.exerciseSlug ? catalogBySlug.get(ex.exerciseSlug) : undefined;
                      const isActive = reorderDragState?.toIndex === displayIdx;
                      const isDraggingAny = reorderDragState !== null;
                      return (
                        <div
                          key={ex.id}
                          className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all duration-100 ${
                            isActive
                              ? 'scale-[1.02] border-[rgba(0,201,167,0.45)] bg-[#0e2035] shadow-[0_6px_20px_rgba(0,0,0,0.45)]'
                              : isDraggingAny
                                ? 'border-[#203347] bg-[#13263A] opacity-50'
                                : 'border-[#203347] bg-[#13263A]'
                          }`}
                        >
                          <button
                            type="button"
                            onPointerDown={(e) => handleReorderPointerDown(e, displayIdx)}
                            onPointerMove={handleReorderPointerMove}
                            onPointerUp={handleReorderPointerUp}
                            onPointerCancel={handleReorderPointerUp}
                            onContextMenu={(e) => e.preventDefault()}
                            className="touch-none rounded-lg p-1 text-[#4A6278] active:scale-[0.96]"
                            aria-label={`Reordenar ${ex.name}`}
                            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                          >
                            <GripVertical size={16} className="shrink-0" />
                          </button>
                          {catalogEntry?.coverImageUrl ? (
                            <button
                              type="button"
                              onPointerDown={(e) => handleReorderPointerDown(e, displayIdx)}
                              onPointerMove={handleReorderPointerMove}
                              onPointerUp={handleReorderPointerUp}
                              onPointerCancel={handleReorderPointerUp}
                              onContextMenu={(e) => e.preventDefault()}
                              className="touch-none shrink-0 overflow-hidden rounded-lg active:scale-[0.98]"
                              aria-label={`Mover ${ex.name} desde la portada`}
                              style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                            >
                              <img
                                src={catalogEntry.coverImageUrl}
                                alt=""
                                draggable={false}
                                onContextMenu={(e) => e.preventDefault()}
                                onDragStart={(e) => e.preventDefault()}
                                className="pointer-events-none h-9 w-9 object-cover"
                                style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                              />
                            </button>
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(0,81,71,0.2)]">
                              <GripVertical size={14} className="text-[#00C9A7]" />
                            </div>
                          )}
                          <span className="shrink-0 text-xs font-bold tabular-nums text-[#4A6278]">
                            {displayIdx + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                            {ex.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      setShowReorderModal(false);
                      setReorderDragState(null);
                      reorderDragStateRef.current = null;
                    }}
                    className="mt-5 w-full rounded-2xl bg-[#00C9A7] py-4 text-sm font-bold uppercase tracking-widest text-black"
                    type="button"
                  >
                    Listo
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <FinishSessionModal
        isOpen={showFinishModal}
        isHistoryEditSession={isHistoryEditSession}
        isSubmittingSession={isSubmittingSession}
        missingSets={missingSetsGrouped}
        overlayBounds={sessionOverlayBounds}
        onFinish={() => void finishSession()}
        onDiscard={discardSession}
        onContinue={() => setShowFinishModal(false)}
        onDeleteSession={() => setShowDeleteSessionModal(true)}
        onJumpToMissing={jumpToMissingSet}
      />

      <DeleteSessionConfirmModal
        isOpen={showDeleteSessionModal}
        overlayBounds={sessionOverlayBounds}
        onConfirm={() => void deleteHistoricalSession()}
        onClose={() => setShowDeleteSessionModal(false)}
      />

      <ExerciseDetailModal
        detail={sessionExerciseDetail}
        overlayBounds={sessionOverlayBounds}
        onClose={() => setSessionExerciseDetail(null)}
      />
    </div>
  );
}
