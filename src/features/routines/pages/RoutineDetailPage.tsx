import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBeforeUnload, useBlocker, useLocation, useNavigate, useParams } from 'react-router';
import {
  BookOpen, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  Clock, Copy, Dumbbell, History, MoreVertical, Pencil, Play,
  Plus, RefreshCw, Save, Timer, Trash2, X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { ActiveWorkoutEditLockModal } from '@/shared/components/layout/ActiveWorkoutEditLockModal';
import { Header } from '@/shared/components/layout/Header';
import { useAppData } from '@/core/app-data/AppDataContext';
import { useExerciseCatalog } from '@/features/exercises/hooks/useExerciseCatalog';
import { ExerciseDetailSheet } from '@/features/exercises/components/ExerciseDetailSheet';
import type { CatalogExerciseItem } from '@/features/exercises/components/ExerciseDetailSheet';
import { NumberWheelPicker } from '@/features/onboarding/components/WheelPickers';
import type { WheelPickerOption } from '@/features/onboarding/components/WheelPickers';
import type { Routine } from '@/shared/types/models';

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

type EditExerciseDraft = {
  exerciseSlug?: string;
  name: string;
  muscle: string;
  implement?: string;
  secondaryMuscles?: string[];
  sets: number;
  reps: number;
  kg: number;
  restSeconds?: number;
};

type EditDayDraft = {
  name: string;
  exercises: EditExerciseDraft[];
};

type RoutineEditorDraftState = {
  name: string;
  days: EditDayDraft[];
  activeDay: number;
  expandedExerciseKeys: string[];
};

type DragState = {
  dayIndex: number;
  fromIndex: number;
  toIndex: number;
};

type RoutineDetailLocationState = {
  catalogResult?: {
    exercises: CatalogExerciseItem[];
    dayIndex: number;
    mode: 'add' | 'replace';
    replaceIndex?: number;
  };
  routineDraft?: RoutineEditorDraftState;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNewRoutineDraftStorageKey(userId: string) {
  return `wohl.newRoutineDraft.${userId}`;
}

function readNewRoutineDraft(userId: string): RoutineEditorDraftState | null {
  if (typeof window === 'undefined') return null;

  const stored = window.localStorage.getItem(getNewRoutineDraftStorageKey(userId));
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as RoutineEditorDraftState;
    if (
      !parsed ||
      typeof parsed.name !== 'string' ||
      !Array.isArray(parsed.days) ||
      typeof parsed.activeDay !== 'number' ||
      !Array.isArray(parsed.expandedExerciseKeys)
    ) {
      window.localStorage.removeItem(getNewRoutineDraftStorageKey(userId));
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(getNewRoutineDraftStorageKey(userId));
    return null;
  }
}

function writeNewRoutineDraft(userId: string, draft: RoutineEditorDraftState | null) {
  if (typeof window === 'undefined') return;

  const storageKey = getNewRoutineDraftStorageKey(userId);
  if (!draft) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(draft));
}

function createEmptyDay(index: number): EditDayDraft {
  return { name: `Día ${index + 1}`, exercises: [] };
}

function createInitialNewDraftDays(): EditDayDraft[] {
  return [createEmptyDay(0), createEmptyDay(1)];
}

function buildDraftDays(routine: Routine): EditDayDraft[] {
  return routine.days.map((day) => ({
    name: day.name,
    exercises: day.exercises.map((ex) => ({
      exerciseSlug: ex.exerciseSlug,
      name: ex.name,
      muscle: ex.muscle,
      implement: ex.implement,
      secondaryMuscles: ex.secondaryMuscles,
      sets: ex.sets.length || 3,
      reps: ex.sets[0]?.reps || 10,
      kg: ex.sets[0]?.kg ?? 0,
      restSeconds: ex.restSeconds,
    })),
  }));
}

function cloneDraftDays(days: EditDayDraft[]): EditDayDraft[] {
  return days.map((day) => ({
    ...day,
    exercises: day.exercises.map((exercise) => ({
      ...exercise,
      secondaryMuscles: exercise.secondaryMuscles ? [...exercise.secondaryMuscles] : undefined,
    })),
  }));
}

function getReorderedExercises(
  exercises: EditExerciseDraft[],
  from: number,
  to: number
): EditExerciseDraft[] {
  const arr = [...exercises];
  const [item] = arr.splice(from, 1);
  arr.splice(to, 0, item);
  return arr;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoutineDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeWorkout, appContext, routines, saveRoutine, appSettings, currentUserId } = useAppData();
  const { catalog } = useExerciseCatalog();

  const routeState = (location.state ?? {}) as RoutineDetailLocationState;
  const isNew = location.pathname === '/routine/new' || id === 'new';
  const routine = !isNew ? (routines.find((r) => r.id === Number(id)) ?? null) : null;
  const persistedDraft = useMemo(
    () => (isNew ? readNewRoutineDraft(currentUserId) : null),
    [currentUserId, isNew]
  );
  const restoredDraft = routeState.routineDraft ?? persistedDraft;
  const initialNewDays = useMemo(() => createInitialNewDraftDays(), []);

  const catalogBySlug = useMemo(
    () => new Map(catalog.filter((e) => Boolean(e.coverImageUrl)).map((e) => [e.slug, e])),
    [catalog]
  );

  // ── View state ──────────────────────────────────────────────────────────────
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<CatalogExerciseItem | null>(null);
  const [showEditLockModal, setShowEditLockModal] = useState(false);

  const initialDayIndex = useMemo(
    () => Math.max(0, (routine?.days ?? []).findIndex((d) => d.name === appContext.currentDayName)),
    [routine, appContext.currentDayName]
  );
  const [activeDay, setActiveDay] = useState(() =>
    restoredDraft ? Math.max(0, restoredDraft.activeDay) : initialDayIndex
  );
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(
    () => new Set(restoredDraft?.expandedExerciseKeys.length ? restoredDraft.expandedExerciseKeys : ['0-0'])
  );

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(isNew);
  const [draftName, setDraftName] = useState(() =>
    restoredDraft ? restoredDraft.name : isNew ? '' : (routine?.name ?? '')
  );
  const [draftDays, setDraftDays] = useState<EditDayDraft[]>(() =>
    restoredDraft ? cloneDraftDays(restoredDraft.days) : isNew ? initialNewDays : routine ? buildDraftDays(routine) : []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [nameError, setNameError] = useState('');
  const [exerciseMenu, setExerciseMenu] = useState<{
    dayIndex: number;
    exerciseIndex: number;
    rect: DOMRect;
  } | null>(null);
  const [restPickerTarget, setRestPickerTarget] = useState<{ dayIndex: number; exerciseIndex: number } | null>(null);
  const [restPickerDraft, setRestPickerDraft] = useState('90');
  const [pendingDayRemoval, setPendingDayRemoval] = useState<{ dayIndex: number; dayName: string } | null>(null);
  const [showCancelRoutineModal, setShowCancelRoutineModal] = useState(false);
  const skipBlockerRef = useRef(false);

  // ── Day reorder modal ────────────────────────────────────────────────────────
  const [showDayReorderModal, setShowDayReorderModal] = useState(false);
  const [reorderDays, setReorderDays] = useState<EditDayDraft[]>([]);
  const [reorderActiveIdx, setReorderActiveIdx] = useState(0);

  // ── Drag state ──────────────────────────────────────────────────────────────
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const exerciseListRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<{
    timer: ReturnType<typeof setTimeout>;
    activated: boolean;
    dayIndex: number;
    exerciseIndex: number;
    pointerId: number;
    element: HTMLElement;
    startY: number;
  } | null>(null);

  // ── Day slider swipe ────────────────────────────────────────────────────────
  const swipeStartX = useRef<number | null>(null);

  const handleSliderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    swipeStartX.current = e.clientX;
  };
  const handleSliderPointerUp = (e: React.PointerEvent, totalDays: number) => {
    if (swipeStartX.current === null) return;
    const delta = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) setActiveDay((p) => Math.min(totalDays - 1, p + 1));
    else setActiveDay((p) => Math.max(0, p - 1));
  };

  const isEditRoute = /^\/routine\/[^/]+\/edit$/.test(location.pathname);
  const exitEditorPath = isNew ? '/workouts' : routine ? `/routine/${routine.id}` : '/workouts';

  // Snapshot to detect changes (for cancel confirmation)
  const draftSnapshotRef = useRef({
    name: isNew ? '' : (routine?.name ?? ''),
    days: JSON.stringify(isNew ? initialNewDays : routine ? buildDraftDays(routine) : []),
  });

  const persistNewRoutineDraft = useCallback(
    (draft: RoutineEditorDraftState | null) => {
      if (!isNew) return;
      writeNewRoutineDraft(currentUserId, draft);
    },
    [currentUserId, isNew]
  );

  const hasUnsavedChanges =
    isEditing &&
    (draftName !== draftSnapshotRef.current.name ||
      JSON.stringify(draftDays) !== draftSnapshotRef.current.days);

  const hasNewRoutineDraftContent = useMemo(() => {
    if (!isNew) return false;
    if (draftName.trim()) return true;
    return JSON.stringify(draftDays) !== JSON.stringify(initialNewDays);
  }, [draftDays, draftName, initialNewDays, isNew]);

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) => {
        if (skipBlockerRef.current) return false;
        if (isNew) return false;
        if (!hasUnsavedChanges) return false;
        if (currentLocation.pathname === nextLocation.pathname) return false;
        if (nextLocation.pathname === '/exercise-catalog') return false;
        return true;
      },
      [hasUnsavedChanges, isNew]
    )
  );

  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (isNew) return;
        if (hasUnsavedChanges) event.preventDefault();
      },
      [hasUnsavedChanges, isNew]
    )
  );

  // ── Handle location state ────────────────────────────────────────────────────
  useEffect(() => {
    skipBlockerRef.current = false;
  }, [location.pathname]);

  useEffect(() => {
    if (isNew) {
      if (restoredDraft) {
        setDraftName(restoredDraft.name);
        setDraftDays(cloneDraftDays(restoredDraft.days));
        setActiveDay(Math.max(0, Math.min(restoredDraft.activeDay, Math.max(restoredDraft.days.length - 1, 0))));
        setExpandedExercises(new Set(restoredDraft.expandedExerciseKeys.length ? restoredDraft.expandedExerciseKeys : ['0-0']));
        draftSnapshotRef.current = {
          name: restoredDraft.name,
          days: JSON.stringify(restoredDraft.days),
        };
        setIsEditing(true);
        setSaveError(null);
        setNameError('');
        setExerciseMenu(null);
        return;
      }

      const initialDays = createInitialNewDraftDays();
      setDraftName('');
      setDraftDays(initialDays);
      setActiveDay(0);
      setExpandedExercises(new Set(['0-0']));
      draftSnapshotRef.current = { name: '', days: JSON.stringify(initialDays) };
      setIsEditing(true);
      setSaveError(null);
      setNameError('');
      setExerciseMenu(null);
      return;
    }

    if (routine && isEditRoute) {
      if (restoredDraft) {
        setDraftName(restoredDraft.name);
        setDraftDays(cloneDraftDays(restoredDraft.days));
        setActiveDay(Math.max(0, Math.min(restoredDraft.activeDay, Math.max(restoredDraft.days.length - 1, 0))));
        setExpandedExercises(new Set(restoredDraft.expandedExerciseKeys.length ? restoredDraft.expandedExerciseKeys : ['0-0']));
        setIsEditing(true);
        setSaveError(null);
        setNameError('');
        setExerciseMenu(null);
        return;
      }

      const days = buildDraftDays(routine);
      setDraftName(routine.name);
      setDraftDays(days);
      setActiveDay(initialDayIndex);
      setExpandedExercises(new Set(['0-0']));
      draftSnapshotRef.current = { name: routine.name, days: JSON.stringify(days) };
      setIsEditing(true);
      setSaveError(null);
      setNameError('');
      setExerciseMenu(null);
      return;
    }

    if (!isEditRoute) {
      setIsEditing(false);
      setSaveError(null);
      setNameError('');
      setExerciseMenu(null);
    }
  }, [initialDayIndex, isNew, isEditRoute, routine, location.pathname]);

  useEffect(() => {
    if (!exerciseMenu) return;

    const closeMenu = () => setExerciseMenu(null);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);

    return () => {
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [exerciseMenu]);

  useEffect(() => {
    if (!isNew) return;
    persistNewRoutineDraft({
      name: draftName,
      days: cloneDraftDays(draftDays),
      activeDay,
      expandedExerciseKeys: Array.from(expandedExercises),
    });
  }, [activeDay, draftDays, draftName, expandedExercises, isNew, persistNewRoutineDraft]);

  useEffect(() => {
    const result = routeState.catalogResult;

    if (!result) return;
    navigate(location.pathname, { replace: true, state: {} });

    const { exercises, dayIndex: targetDay, mode: returnMode, replaceIndex } = result;

    if (returnMode === 'replace' && replaceIndex !== undefined && exercises[0]) {
      const ex = exercises[0];
      setDraftDays((prev) =>
        prev.map((day, di) => {
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
      setActiveDay(targetDay);
    } else if (returnMode === 'add') {
      setDraftDays((prev) =>
        prev.map((day, di) => {
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
      setActiveDay(targetDay);
    }
  }, [location.pathname, navigate, routeState.catalogResult]);

  // ── Edit actions ─────────────────────────────────────────────────────────────

  const enterEditMode = () => {
    if (activeWorkout) {
      setShowEditLockModal(true);
      return;
    }

    if (routine?.id) {
      navigate(`/routine/${routine.id}/edit`);
    }
  };

  const cancelEdit = () => {
    if (isNew && hasNewRoutineDraftContent) {
      setShowCancelRoutineModal(true);
      return;
    }
    navigate(exitEditorPath);
  };

  const discardNewRoutine = () => {
    persistNewRoutineDraft(null);
    setShowCancelRoutineModal(false);
    skipBlockerRef.current = true;
    navigate(exitEditorPath);
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!draftName.trim()) {
      setNameError('Tu rutina necesita un nombre para poder guardarse.');
      return;
    }

    if (isNew && routines.length >= 3) {
      setSaveError('Alcanzaste el límite de 3 rutinas. Eliminá una antes de crear una nueva.');
      return;
    }

    const hasAnyExercise = draftDays.some((d) => d.exercises.length > 0);
    if (!hasAnyExercise) {
      setSaveError('Agregá al menos un ejercicio a algún día antes de guardar.');
      return;
    }

    const routineToSave: Routine = {
      id: routine?.id ?? 0,
      name: draftName.trim(),
      daysPerWeek: draftDays.length,
      color: routine?.color ?? '#00C9A7',
      categories: routine?.categories ?? [],
      description: routine?.description ?? 'Sistema personalizado creado en WOHL.',
      tags: routine?.tags ?? ['PERSONALIZADA'],
      avgMinutes: routine?.avgMinutes ?? 75,
      days: draftDays.map((day, di) => ({
        name: day.name.trim() || `Día ${di + 1}`,
        focus: day.exercises.map((e) => e.muscle).slice(0, 3).join(', ') || 'Sesión personalizada',
        exercises: day.exercises.map((ex, ei) => ({
          id: ei + 1,
          exerciseSlug: ex.exerciseSlug,
          name: ex.name,
          muscle: ex.muscle,
          implement: ex.implement,
          secondaryMuscles: ex.secondaryMuscles,
          restSeconds: ex.restSeconds,
          sets: Array.from({ length: ex.sets }, (_, si) => ({
            id: si + 1,
            kg: ex.kg,
            reps: ex.reps,
            rpe: 0,
            completed: false,
            kind: 'normal' as const,
          })),
        })),
      })),
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      const saved = await saveRoutine(routineToSave);
      const targetRoutineId = saved?.id ?? routine?.id;
      persistNewRoutineDraft(null);
      skipBlockerRef.current = true;
      if (targetRoutineId) {
        navigate(`/routine/${targetRoutineId}`, { replace: true });
      } else {
        navigate('/workouts', { replace: true });
      }
    } catch (error) {
      const cause = error instanceof Error ? (error.cause as Error | undefined) : undefined;
      const detail = cause ? ` (${cause instanceof Error ? cause.message : String(cause)})` : '';
      setSaveError(
        `${error instanceof Error ? error.message : 'No se pudo guardar la rutina.'}${detail}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openCatalog = (dayIndex: number) => {
    const day = draftDays[dayIndex];
    if (!day) return;
    const routineDraft: RoutineEditorDraftState = {
      name: draftName,
      days: cloneDraftDays(draftDays),
      activeDay,
      expandedExerciseKeys: Array.from(expandedExercises),
    };
    navigate('/exercise-catalog', {
      state: {
        dayIndex,
        dayName: day.name,
        mode: 'add',
        existingDaySlugs: day.exercises.map((e) => e.exerciseSlug).filter(Boolean),
        currentDayExerciseCount: day.exercises.length,
        returnTo: isNew ? '/routine/new' : `/routine/${id}/edit`,
        routineDraft,
      },
    });
  };

  const openCatalogReplace = (dayIndex: number, exerciseIndex: number) => {
    const day = draftDays[dayIndex];
    if (!day) return;
    const routineDraft: RoutineEditorDraftState = {
      name: draftName,
      days: cloneDraftDays(draftDays),
      activeDay,
      expandedExerciseKeys: Array.from(expandedExercises),
    };
    navigate('/exercise-catalog', {
      state: {
        dayIndex,
        dayName: day.name,
        mode: 'replace',
        replaceIndex: exerciseIndex,
        existingDaySlugs: day.exercises.map((e) => e.exerciseSlug).filter(Boolean),
        currentDayExerciseCount: day.exercises.length,
        returnTo: isNew ? '/routine/new' : `/routine/${id}/edit`,
        routineDraft,
      },
    });
  };

  // ── Draft mutation helpers ───────────────────────────────────────────────────

  const updateDayName = (dayIndex: number, name: string) =>
    setDraftDays((prev) => prev.map((d, i) => (i === dayIndex ? { ...d, name } : d)));

  const addDay = () => {
    if (draftDays.length >= 7) return;
    const newDay = createEmptyDay(draftDays.length);
    setDraftDays((prev) => [...prev, newDay]);
    setActiveDay(draftDays.length);
  };

  const duplicateDay = () => {
    if (draftDays.length >= 7) return;
    const current = draftDays[activeDaySafe];
    if (!current) return;
    const insertAt = activeDaySafe + 1;
    const duplicated: EditDayDraft = {
      name: `${current.name} (copia)`,
      exercises: current.exercises.map((ex) => ({ ...ex })),
    };
    setDraftDays((prev) => {
      const next = [...prev];
      next.splice(insertAt, 0, duplicated);
      return next;
    });
    setActiveDay(insertAt);
  };

  const removeDay = (dayIndex: number) => {
    if (draftDays.length <= 2) return;
    const day = draftDays[dayIndex];
    if (day.exercises.length > 0) {
      setPendingDayRemoval({ dayIndex, dayName: day.name });
      return;
    }
    setDraftDays((prev) => prev.filter((_, i) => i !== dayIndex));
    setActiveDay((prev) => (prev >= dayIndex ? Math.max(0, prev - 1) : prev));
  };

  const confirmRemoveDay = () => {
    if (!pendingDayRemoval) return;
    const { dayIndex } = pendingDayRemoval;
    setDraftDays((prev) => prev.filter((_, i) => i !== dayIndex));
    setActiveDay((prev) => (prev >= dayIndex ? Math.max(0, prev - 1) : prev));
    setPendingDayRemoval(null);
  };

  const openDayReorderModal = () => {
    setReorderDays([...draftDays]);
    setReorderActiveIdx(activeDaySafe);
    setShowDayReorderModal(true);
  };

  const moveDayInReorder = (from: number, to: number) => {
    setReorderDays((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setReorderActiveIdx((prev) => {
      if (from === prev) return to;
      if (from < prev && to >= prev) return prev - 1;
      if (from > prev && to <= prev) return prev + 1;
      return prev;
    });
  };

  const confirmDayReorder = () => {
    setDraftDays(reorderDays);
    setActiveDay(reorderActiveIdx);
    setShowDayReorderModal(false);
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) =>
    setDraftDays((prev) =>
      prev.map((d, di) =>
        di !== dayIndex
          ? d
          : { ...d, exercises: d.exercises.filter((_, ei) => ei !== exerciseIndex) }
      )
    );

  const updateExerciseField = (
    dayIndex: number,
    exerciseIndex: number,
    field: 'sets' | 'reps' | 'kg',
    value: number
  ) => {
    const next =
      field === 'kg'
        ? Number.isFinite(value) && value >= 0 ? value : 0
        : Number.isFinite(value) && value > 0 ? value : 1;
    setDraftDays((prev) =>
      prev.map((d, di) =>
        di !== dayIndex
          ? d
          : {
              ...d,
              exercises: d.exercises.map((ex, ei) =>
                ei !== exerciseIndex ? ex : { ...ex, [field]: next }
              ),
            }
      )
    );
  };

  // ── Drag handlers ────────────────────────────────────────────────────────────

  const handleGripPointerMove = (e: React.PointerEvent) => {
    if (!dragStateRef.current || !exerciseListRef.current) return;
    const children = Array.from(exerciseListRef.current.children) as HTMLElement[];
    let newTo = children.length - 1;
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        newTo = i;
        break;
      }
    }
    if (newTo !== dragStateRef.current.toIndex) {
      const updated = { ...dragStateRef.current, toIndex: newTo };
      dragStateRef.current = updated;
      setDragState(updated);
    }
  };

  const handleGripPointerUp = () => {
    if (!dragStateRef.current) return;
    const { dayIndex, fromIndex, toIndex } = dragStateRef.current;
    dragStateRef.current = null;
    setDragState(null);
    if (fromIndex !== toIndex) {
      setDraftDays((prev) =>
        prev.map((d, di) => {
          if (di !== dayIndex) return d;
          return { ...d, exercises: getReorderedExercises(d.exercises, fromIndex, toIndex) };
        })
      );
    }
  };

  // Long-press on thumbnail → activate drag; quick tap → open detail
  const handleThumbnailPointerDown = (e: React.PointerEvent, dayIdx: number, exIdx: number) => {
    e.stopPropagation();
    const element = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    const startY = e.clientY;

    const timer = setTimeout(() => {
      if (!longPressRef.current) return;
      longPressRef.current.activated = true;
      element.setPointerCapture(pointerId);
      navigator.vibrate?.(20);
      const newDragState: DragState = { dayIndex: dayIdx, fromIndex: exIdx, toIndex: exIdx };
      dragStateRef.current = newDragState;
      setDragState(newDragState);
    }, 500);

    longPressRef.current = { timer, activated: false, dayIndex: dayIdx, exerciseIndex: exIdx, pointerId, element, startY };
  };

  const handleThumbnailPointerMove = (e: React.PointerEvent) => {
    if (!longPressRef.current) return;
    if (!longPressRef.current.activated) {
      // Cancel if user scrolls before threshold
      if (Math.abs(e.clientY - longPressRef.current.startY) > 8) {
        clearTimeout(longPressRef.current.timer);
        longPressRef.current = null;
      }
      return;
    }
    handleGripPointerMove(e);
  };

  const handleThumbnailPointerUp = (e: React.PointerEvent, slug: string | undefined) => {
    if (!longPressRef.current) return;
    const { timer, activated } = longPressRef.current;
    clearTimeout(timer);
    longPressRef.current = null;
    if (!activated) {
      if (slug) openExerciseDetail(slug);
      return;
    }
    handleGripPointerUp();
  };

  const handleThumbnailPointerCancel = () => {
    if (!longPressRef.current) return;
    const { timer, activated } = longPressRef.current;
    clearTimeout(timer);
    longPressRef.current = null;
    if (activated) handleGripPointerUp();
  };

  // ── View helpers ─────────────────────────────────────────────────────────────

  const toggleExercise = (dayIndex: number, exerciseIndex: number) => {
    const key = `${dayIndex}-${exerciseIndex}`;
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openExerciseDetail = (slug: string) => {
    const entry = catalogBySlug.get(slug);
    if (!entry) return;
    setSelectedExerciseDetail({
      exerciseSlug: entry.slug,
      name: entry.title,
      titleEn: entry.titleEn,
      muscle: entry.muscle,
      implement: entry.implement,
      secondaryMuscles: entry.secondaryMuscles,
      coverImageUrl: entry.coverImageUrl,
      animationMediaUrl: entry.animationMediaUrl,
      animationMediaType: entry.animationMediaType,
      instructions: entry.instructions,
      overview: entry.overview,
    });
  };

  // ── Derived values ────────────────────────────────────────────────────────────
  const totalExercises = (routine?.days ?? []).reduce((acc, d) => acc + d.exercises.length, 0);
  const totalSets = (routine?.days ?? []).reduce(
    (acc, d) => acc + d.exercises.reduce((s, e) => s + e.sets.length, 0),
    0
  );
  const editTotalExercises = draftDays.reduce((acc, d) => acc + d.exercises.length, 0);
  const editTotalSets = draftDays.reduce((acc, d) => acc + d.exercises.reduce((s, e) => s + e.sets, 0), 0);
  const accentColor = routine?.color ?? '#00C9A7';

  const activeDaySafe = Math.min(activeDay, isEditing ? draftDays.length - 1 : (routine?.days.length ?? 1) - 1);
  const viewDay = routine?.days[activeDaySafe];
  const editDay = draftDays[activeDaySafe];
  const activeDays = isEditing ? draftDays : (routine?.days ?? []);
  const totalDays = activeDays.length;

  // Display exercises (potentially reordered during drag)
  const displayExercises = (() => {
    if (!editDay) return [];
    if (!dragState || dragState.dayIndex !== activeDaySafe || dragState.fromIndex === dragState.toIndex) {
      return editDay.exercises;
    }
    return getReorderedExercises(editDay.exercises, dragState.fromIndex, dragState.toIndex);
  })();

  // ── Not found ────────────────────────────────────────────────────────────────
  if (!isNew && !routine) {
    return (
      <div className="flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Header showBack title="Rutina" onBack={() => navigate('/workouts')} />
        <div className="px-5 py-5 text-sm text-[#9BAEC1]">No se encontró la rutina.</div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header
        showBack={!isEditing}
        leftContent={
          isEditing ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="flex items-center rounded-xl px-1 text-sm font-semibold text-[#90A4B8] transition-colors hover:text-white"
            >
              Cancelar
            </button>
          ) : undefined
        }
        onBack={() => navigate('/workouts')}
        title={isNew ? 'Nueva rutina' : undefined}
        rightContent={
          isEditing ? (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-xl bg-[#00C9A7] px-3 py-2 text-xs font-bold text-black disabled:opacity-50"
            >
              <Save size={13} />
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          ) : (
            <button
              onClick={enterEditMode}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#203347] bg-[#1A2D42]"
            >
              <Pencil size={14} className="text-[#9BAEC1]" />
            </button>
          )
        }
      />

      <div className="flex flex-col gap-6 px-5 py-5 pb-4">

        {/* ── Name + meta ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div
            className="inline-flex items-center self-start rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
            style={{
              background: `${accentColor}20`,
              color: accentColor,
              border: `1px solid ${accentColor}40`,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {isEditing ? draftDays.length : (routine?.daysPerWeek ?? 0)} días por semana
          </div>

          {isEditing ? (
            <div>
              <input
                type="text"
                value={draftName}
                onChange={(e) => {
                  setDraftName(e.target.value);
                  if (nameError && e.target.value.trim()) setNameError('');
                }}
                placeholder="Nombre de la rutina"
                className={`w-full rounded-xl border bg-[#13263A] px-4 py-3 text-2xl font-extrabold text-white outline-none ${
                  nameError
                    ? 'border-[rgba(255,125,125,0.45)]'
                    : 'border-[#203347] focus:border-[rgba(0,201,167,0.4)]'
                }`}
              />
              {nameError ? (
                <p className="mt-1.5 text-sm text-[#FF8E8E]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {nameError}
                </p>
              ) : null}
            </div>
          ) : (
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white">
              {routine!.name}
            </h1>
          )}

          {!isEditing && (
            <>
              <p className="text-sm leading-6 text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {routine!.description}
              </p>
              {routine!.tags && (
                <div className="flex flex-wrap gap-2">
                  {routine!.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-[#203347] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#90A4B8]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Stats grid ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Dias/sem',
              value: (isEditing ? draftDays.length : routine!.daysPerWeek).toString(),
              icon: <Clock size={14} style={{ color: accentColor }} />,
            },
            {
              label: 'Ejercicios',
              value: (isEditing ? editTotalExercises : totalExercises).toString(),
              icon: <Dumbbell size={14} style={{ color: accentColor }} />,
            },
            {
              label: 'Series',
              value: (isEditing ? editTotalSets : totalSets).toString(),
              icon: (
                <div
                  className="h-3.5 w-3.5 rounded-full border-2"
                  style={{ borderColor: accentColor }}
                />
              ),
            },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-xl border border-[#203347] bg-[#13263A] p-3">
              <div className="mb-1.5 flex items-center gap-1.5">
                {icon}
                <span className="text-[10px] uppercase tracking-wider text-[#9BAEC1]">{label}</span>
              </div>
              <span className="text-xl font-bold text-white">{value}</span>
            </div>
          ))}
        </div>

        {/* ── Day slider ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          {/* Row: prev arrow + card + next arrow */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveDay((p) => Math.max(0, p - 1))}
              disabled={activeDaySafe === 0}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#203347] bg-[#1A2D42] text-[#9BAEC1] disabled:opacity-25 transition-opacity"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Swipeable card */}
            <div
              className="flex-1 cursor-pointer select-none rounded-2xl border border-[#203347] bg-[#13263A] px-4 py-3"
              onPointerDown={handleSliderPointerDown}
              onPointerUp={(e) => handleSliderPointerUp(e, totalDays)}
            >
              <div className="flex items-center justify-between gap-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={editDay?.name ?? ''}
                    onChange={(e) => updateDayName(activeDaySafe, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-transparent text-sm font-bold uppercase tracking-[0.18em] outline-none"
                    style={{ color: accentColor }}
                  />
                ) : (
                  <p
                    className="text-sm font-bold uppercase tracking-[0.18em]"
                    style={{ color: accentColor }}
                  >
                    {viewDay?.name}
                  </p>
                )}
                {isEditing ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openDayReorderModal(); }}
                    className="shrink-0 rounded-lg bg-[rgba(127,152,255,0.1)] px-2 py-0.5 text-xs font-semibold text-[#7F98FF] transition-colors active:bg-[rgba(127,152,255,0.2)]"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {activeDaySafe + 1} / {totalDays}
                  </button>
                ) : (
                  <span className="shrink-0 text-xs text-[#4F6378]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {activeDaySafe + 1} / {totalDays}
                  </span>
                )}
              </div>
              {!isEditing && viewDay?.focus && (
                <p className="mt-0.5 text-[11px] text-[#6F859A]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {viewDay.focus}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveDay((p) => Math.min(totalDays - 1, p + 1))}
              disabled={activeDaySafe === totalDays - 1}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#203347] bg-[#1A2D42] text-[#9BAEC1] disabled:opacity-25 transition-opacity"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5">
            {activeDays.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveDay(i)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === activeDaySafe ? 'w-4 bg-[#00C9A7]' : 'w-1.5 bg-[#203347]'
                }`}
              />
            ))}
          </div>

          {/* Edit mode: remove / add day */}
          {isEditing && (
            <div className="mt-1 flex justify-center gap-2">
              {draftDays.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeDay(activeDaySafe)}
                  className="flex items-center gap-1.5 rounded-xl border border-[rgba(255,125,125,0.25)] bg-[rgba(255,125,125,0.07)] px-3 py-1.5 text-xs font-semibold text-[#FF8E8E]"
                >
                  <Trash2 size={12} />
                  Eliminar día
                </button>
              )}
              {draftDays.length < 7 && (
                <button
                  type="button"
                  onClick={addDay}
                  className="flex items-center gap-1.5 rounded-xl border border-[rgba(0,201,167,0.25)] bg-[rgba(0,201,167,0.07)] px-3 py-1.5 text-xs font-semibold text-[#00C9A7]"
                >
                  <Plus size={12} />
                  Añadir día
                </button>
              )}
              {draftDays.length < 7 && (
                <button
                  type="button"
                  onClick={duplicateDay}
                  className="flex items-center gap-1.5 rounded-xl border border-[rgba(127,152,255,0.25)] bg-[rgba(127,152,255,0.07)] px-3 py-1.5 text-xs font-semibold text-[#7F98FF]"
                >
                  <Copy size={12} />
                  Duplicar día
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Exercise list ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {isEditing ? (
            /* ── EDIT MODE exercises ── */
            <>
              {editDay?.exercises.length === 0 ? (
                <p className="py-2 text-center text-sm text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  No hay ejercicios todavía. Sumá uno desde el catálogo.
                </p>
              ) : null}

              {/* Draggable list */}
              <div ref={exerciseListRef} className="flex flex-col gap-3">
                {displayExercises.map((exercise, displayIndex) => {
                  const catalogEntry = exercise.exerciseSlug
                    ? catalogBySlug.get(exercise.exerciseSlug)
                    : undefined;
                  const key = `${activeDaySafe}-${displayIndex}`;
                  const isExpanded = expandedExercises.has(key);
                  const isDragging = dragState?.dayIndex === activeDaySafe && dragState.toIndex === displayIndex && dragState.fromIndex !== dragState.toIndex;
                  const isBeingDragged = dragState !== null && dragState.dayIndex === activeDaySafe;
                  const isActiveDragItem = dragState !== null && dragState.dayIndex === activeDaySafe && dragState.toIndex === displayIndex;

                  return (
                    <div
                      key={displayIndex}
                      className={`overflow-hidden rounded-2xl border bg-[#13263A] transition-all duration-150 ${
                        isDragging
                          ? 'border-[rgba(0,201,167,0.45)] shadow-[0_6px_24px_rgba(0,0,0,0.45)] scale-[1.015]'
                          : 'border-[#203347]'
                      }`}
                    >
                      {/* Header */}
                      <div className={`flex items-center gap-2 px-3 py-3 ${isBeingDragged ? 'select-none' : ''}`}>
                        {/* Thumbnail — tap: open detail | long press: drag to reorder */}
                        {catalogEntry?.coverImageUrl ? (
                          <div
                            className={`h-11 w-11 flex-shrink-0 overflow-hidden rounded-full transition-all duration-150 ${
                              isActiveDragItem
                                ? 'scale-110 cursor-grabbing ring-2 ring-[rgba(0,201,167,0.6)]'
                                : 'cursor-pointer'
                            }`}
                            onContextMenu={(e) => e.preventDefault()}
                            onPointerDown={(e) => handleThumbnailPointerDown(e, activeDaySafe, displayIndex)}
                            onPointerMove={handleThumbnailPointerMove}
                            onPointerUp={(e) => handleThumbnailPointerUp(e, exercise.exerciseSlug)}
                            onPointerCancel={handleThumbnailPointerCancel}
                            style={{
                              WebkitTouchCallout: 'none',
                              WebkitUserSelect: 'none',
                              userSelect: 'none',
                            }}
                          >
                            <img
                              src={catalogEntry.coverImageUrl}
                              alt=""
                              draggable={false}
                              onContextMenu={(e) => e.preventDefault()}
                              onDragStart={(e) => e.preventDefault()}
                              className="pointer-events-none h-full w-full object-cover"
                              loading="lazy"
                              style={{
                                WebkitTouchCallout: 'none',
                                WebkitUserSelect: 'none',
                                userSelect: 'none',
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-150 ${
                              isActiveDragItem ? 'scale-110 opacity-80' : 'cursor-pointer'
                            }`}
                            style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}
                            onContextMenu={(e) => e.preventDefault()}
                            onPointerDown={(e) => handleThumbnailPointerDown(e, activeDaySafe, displayIndex)}
                            onPointerMove={handleThumbnailPointerMove}
                            onPointerUp={(e) => handleThumbnailPointerUp(e, exercise.exerciseSlug)}
                            onPointerCancel={handleThumbnailPointerCancel}
                          >
                            <Dumbbell size={16} style={{ color: accentColor }} />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => !isBeingDragged && toggleExercise(activeDaySafe, displayIndex)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-semibold text-white">{exercise.name}</p>
                          <p className="truncate text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                            {exercise.sets} series · {exercise.muscle}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={(event) =>
                            !isBeingDragged &&
                            setExerciseMenu({
                              dayIndex: activeDaySafe,
                              exerciseIndex: displayIndex,
                              rect: event.currentTarget.getBoundingClientRect(),
                            })
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9BAEC1] transition-colors active:bg-[#203347]"
                        >
                          <MoreVertical size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => !isBeingDragged && toggleExercise(activeDaySafe, displayIndex)}
                          className="flex h-8 w-8 items-center justify-center text-[#9BAEC1]"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>

                      {/* Expanded edit section */}
                      {isExpanded && !isBeingDragged ? (
                        <div className="border-t border-[#203347] pb-4">
                          {(exercise.implement || exercise.secondaryMuscles?.length) ? (
                            <div className="flex flex-wrap gap-2 px-4 pt-3 pb-2">
                              {exercise.implement && (
                                <span className="rounded-full border border-[rgba(0,201,167,0.25)] bg-[rgba(0,201,167,0.08)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#00C9A7]">
                                  {exercise.implement}
                                </span>
                              )}
                              {exercise.secondaryMuscles?.map((m) => (
                                <span
                                  key={m}
                                  className="rounded-full bg-[#203347] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#90A4B8]"
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          ) : null}

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

                          {Array.from({ length: exercise.sets }, (_, si) => (
                            <div
                              key={si}
                              className="grid grid-cols-3 gap-2 items-center border-t border-[rgba(255,255,255,0.03)] px-4 py-2.5"
                            >
                              <span className="text-center text-sm text-[#9BAEC1]">{si + 1}</span>
                              <input
                                type="number"
                                min={0}
                                value={exercise.kg}
                                onChange={(e) =>
                                  updateExerciseField(activeDaySafe, displayIndex, 'kg', Number(e.target.value))
                                }
                                className="w-full rounded-lg bg-[#203347] py-1.5 text-center text-sm font-medium text-white outline-none"
                              />
                              <input
                                type="number"
                                min={1}
                                value={exercise.reps}
                                onChange={(e) =>
                                  updateExerciseField(activeDaySafe, displayIndex, 'reps', Number(e.target.value))
                                }
                                className="w-full rounded-lg bg-[#203347] py-1.5 text-center text-sm font-medium text-white outline-none"
                              />
                            </div>
                          ))}

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
                                  updateExerciseField(activeDaySafe, displayIndex, 'sets', exercise.sets - 1)
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
                                  updateExerciseField(activeDaySafe, displayIndex, 'sets', exercise.sets + 1)
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

              {/* Add exercise button */}
              {(editDay?.exercises.length ?? 0) < 15 ? (
                <button
                  type="button"
                  onClick={() => openCatalog(activeDaySafe)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(0,201,167,0.3)] py-3 text-sm font-semibold text-[#00C9A7]"
                >
                  <Plus size={14} />
                  Añadir ejercicio
                </button>
              ) : (
                <p className="text-center text-xs text-[#4F6378]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Máximo 15 ejercicios por día
                </p>
              )}
            </>
          ) : (
            /* ── VIEW MODE exercises ── */
            viewDay?.exercises.map((exercise, index) => {
              const catalogEntry = exercise.exerciseSlug
                ? catalogBySlug.get(exercise.exerciseSlug)
                : undefined;
              const key = `${activeDaySafe}-${index}`;
              return (
                <div
                  key={exercise.id}
                  className="overflow-hidden rounded-2xl border border-[#203347] bg-[#13263A]"
                >
                  {/* Header row: thumbnail (opens detail) + name/meta (toggles) + chevron (toggles) */}
                  <div className="flex w-full items-center gap-3 px-4 py-4">
                    {catalogEntry?.coverImageUrl ? (
                      <div
                        className="h-11 w-11 flex-shrink-0 cursor-pointer overflow-hidden rounded-full"
                        onClick={() => {
                          if (exercise.exerciseSlug) openExerciseDetail(exercise.exerciseSlug);
                        }}
                      >
                        <img
                          src={catalogEntry.coverImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}
                      >
                        <Dumbbell size={16} style={{ color: accentColor }} />
                      </div>
                    )}

                    <button
                      onClick={() => toggleExercise(activeDaySafe, index)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="text-sm font-semibold text-white">{exercise.name}</p>
                      <p className="mt-0.5 text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {exercise.sets.length} series - {exercise.muscle}
                      </p>
                    </button>

                    <button
                      onClick={() => toggleExercise(activeDaySafe, index)}
                      className="flex h-8 w-8 items-center justify-center text-[#9BAEC1]"
                    >
                      {expandedExercises.has(key) ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                  </div>

                  {expandedExercises.has(key) && (
                    <div className="border-t border-[#203347] px-4 py-4">
                      <div className="mb-3 flex flex-wrap gap-2">
                        {exercise.implement && (
                          <span className="rounded-full border border-[rgba(0,201,167,0.25)] bg-[rgba(0,201,167,0.08)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#00C9A7]">
                            {exercise.implement}
                          </span>
                        )}
                        {exercise.secondaryMuscles?.map((muscle) => (
                          <span
                            key={muscle}
                            className="rounded-full bg-[#203347] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#90A4B8]"
                          >
                            {muscle}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-[rgba(255,255,255,0.03)] px-4 py-2">
                        {['Serie', 'Kg', 'Reps'].map((column) => (
                          <span
                            key={column}
                            className="text-center text-[10px] font-semibold uppercase tracking-wider text-[#9BAEC1]"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                          >
                            {column}
                          </span>
                        ))}
                      </div>
                      {exercise.sets.map((set, setIndex) => (
                        <div
                          key={set.id}
                          className="grid grid-cols-3 gap-2 border-t border-[rgba(255,255,255,0.03)] px-4 py-3"
                        >
                          <span className="text-center text-sm text-[#9BAEC1]">{setIndex + 1}</span>
                          <span className="text-center text-sm font-medium text-white">
                            {set.kg > 0 ? set.kg : '-'}
                          </span>
                          <span className="text-center text-sm font-medium text-white">{set.reps}</span>
                        </div>
                      ))}

                      {exercise.notes && (
                        <p className="mt-3 text-xs leading-5 text-[#D4D4D4]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {exercise.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Save error ───────────────────────────────────────────────────────── */}
        {saveError ? (
          <div
            className="rounded-2xl border border-[rgba(255,125,125,0.22)] bg-[rgba(255,125,125,0.08)] px-4 py-3 text-sm text-[#FFB4B4]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {saveError}
          </div>
        ) : null}

        {/* ── Bottom buttons ───────────────────────────────────────────────────── */}
        {isEditing ? (
          <div className="flex flex-col gap-2 pb-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 shadow-[0_0_15px_rgba(0,201,167,0.2)] disabled:opacity-50"
            >
              <Save size={18} className="text-black" />
              <span className="text-base font-bold text-black">
                {isSaving ? 'Guardando...' : 'Guardar rutina'}
              </span>
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="py-3 text-sm font-semibold text-[#9BAEC1]"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex gap-3 pb-2">
            <button
              onClick={() =>
                navigate('/session', {
                  state: { routineId: routine!.id, dayName: viewDay?.name },
                })
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 shadow-[0_0_15px_rgba(0,201,167,0.2)] transition-colors active:bg-[#009F86]"
            >
              <Play size={18} fill="black" className="ml-0.5 text-black" />
              <span className="font-bold text-black">Iniciar {viewDay?.name}</span>
            </button>
            <button
              onClick={enterEditMode}
              className="flex w-14 items-center justify-center rounded-2xl border border-[#203347] bg-[#1A2D42]"
            >
              <Pencil size={18} className="text-[#9BAEC1]" />
            </button>
          </div>
        )}
      </div>

      {/* ── Day reorder modal ────────────────────────────────────────────────── */}
      {showDayReorderModal && (
        <div className="absolute inset-0 z-[55]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDayReorderModal(false)} />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl" style={{ background: '#1A2D42' }}>
            <div className="mx-auto mb-3 mt-4 h-1 w-10 rounded-full bg-[#203347]" />
            <div className="px-5 pb-8">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-base font-bold text-white">Ordenar días</p>
                <button
                  type="button"
                  onClick={() => setShowDayReorderModal(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9BAEC1] active:bg-[#203347]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {reorderDays.map((day, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
                      i === reorderActiveIdx
                        ? 'border-[rgba(0,201,167,0.35)] bg-[rgba(0,201,167,0.08)]'
                        : 'border-[#203347] bg-[#13263A]'
                    }`}
                  >
                    <span
                      className="w-5 text-center text-xs font-bold text-[#4F6378]"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm font-semibold text-white">{day.name}</span>
                    <span className="text-xs text-[#6F859A]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {day.exercises.length} ej.
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => moveDayInReorder(i, i - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#203347] text-[#9BAEC1] disabled:opacity-25 active:bg-[#2A3D52]"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={i === reorderDays.length - 1}
                        onClick={() => moveDayInReorder(i, i + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#203347] text-[#9BAEC1] disabled:opacity-25 active:bg-[#2A3D52]"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={confirmDayReorder}
                className="mt-4 w-full rounded-2xl bg-[#00C9A7] py-4 font-bold text-black"
              >
                Confirmar orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Exercise options menu (edit mode) ────────────────────────────────── */}
      {exerciseMenu !== null && (() => {
        if (typeof document === 'undefined') return null;

        const selectedExercise = draftDays[exerciseMenu.dayIndex]?.exercises[exerciseMenu.exerciseIndex];
        if (!selectedExercise) return null;

        const shell = document.querySelector<HTMLElement>('.wohl-shell');
        const shellRect = shell?.getBoundingClientRect() ?? {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
        const menuWidth = 288;
        const menuHeight = 320;
        const spaceBelow = shellRect.top + shellRect.height - exerciseMenu.rect.bottom;
        const menuTop =
          spaceBelow >= menuHeight + 8
            ? exerciseMenu.rect.bottom - shellRect.top + 8
            : Math.max(12, exerciseMenu.rect.top - shellRect.top - menuHeight - 8);
        const menuLeft = Math.max(
          12,
          Math.min(exerciseMenu.rect.right - shellRect.left - menuWidth, shellRect.width - menuWidth - 12)
        );

        return createPortal(
          <div
            className="fixed z-[55]"
            style={{
              top: shellRect.top,
              left: shellRect.left,
              width: shellRect.width,
              height: shellRect.height,
            }}
          >
            <button
              type="button"
              aria-label="Cerrar menu de ejercicio"
              className="absolute inset-0 bg-black/20"
              onClick={() => setExerciseMenu(null)}
            />
            <div
              className="absolute w-[18rem] rounded-3xl border border-[rgba(32,51,71,0.92)] bg-[#13263A] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.42)]"
              style={{ top: menuTop, left: menuLeft }}
            >
              <div className="border-b border-white/6 px-2 pb-3">
                <h3 className="text-lg font-bold tracking-tight text-white">{selectedExercise.name}</h3>
                <p className="mt-1 text-xs text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {selectedExercise.muscle}
                  {selectedExercise.implement ? ` - ${selectedExercise.implement}` : ''}
                </p>
              </div>

              <div className="mt-2 flex flex-col">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedExercise.exerciseSlug) {
                      void navigate(`/muscle-progress/${selectedExercise.exerciseSlug}`);
                    }
                    setExerciseMenu(null);
                  }}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-white/5"
                >
                  <History size={17} className="text-white/85" />
                  <span>Ver historial de este ejercicio</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const { dayIndex, exerciseIndex } = exerciseMenu;
                    setExerciseMenu(null);
                    openCatalogReplace(dayIndex, exerciseIndex);
                  }}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-white/5"
                >
                  <RefreshCw size={17} className="text-white/85" />
                  <span>Reemplazar ejercicio</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const current = selectedExercise.restSeconds ?? appSettings.restTimerSeconds;
                    setRestPickerDraft(REST_VALID_VALUES.has(String(current)) ? String(current) : '90');
                    setRestPickerTarget({
                      dayIndex: exerciseMenu.dayIndex,
                      exerciseIndex: exerciseMenu.exerciseIndex,
                    });
                    setExerciseMenu(null);
                  }}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-white/5"
                >
                  <Timer size={17} className="text-white/85" />
                  <span>Tiempo de descanso</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    removeExercise(exerciseMenu.dayIndex, exerciseMenu.exerciseIndex);
                    setExerciseMenu(null);
                  }}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-[#FF5D5D] transition-colors hover:bg-[rgba(229,57,53,0.08)]"
                >
                  <Trash2 size={17} className="text-[#FF5D5D]" />
                  <span>Eliminar ejercicio</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedExercise.exerciseSlug) {
                      openExerciseDetail(selectedExercise.exerciseSlug);
                    }
                    setExerciseMenu(null);
                  }}
                  disabled={!selectedExercise.exerciseSlug}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-white/5 disabled:opacity-45"
                >
                  <BookOpen size={17} className="text-white/85" />
                  <span>Ver instrucciones / forma correcta</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* ── Rest timer picker ─────────────────────────────────────────────────── */}
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
          setDraftDays((prev) =>
            prev.map((d, di) =>
              di !== dayIndex
                ? d
                : {
                    ...d,
                    exercises: d.exercises.map((ex, ei) =>
                      ei !== exerciseIndex ? ex : { ...ex, restSeconds: seconds }
                    ),
                  }
            )
          );
          setRestPickerTarget(null);
        }}
        wholeOptions={REST_OPTIONS}
      />

      {/* ── Exercise detail sheet ─────────────────────────────────────────────── */}
      <ExerciseDetailSheet
        exercise={selectedExerciseDetail}
        onClose={() => setSelectedExerciseDetail(null)}
      />

      {/* ── Edit lock modal ───────────────────────────────────────────────────── */}
      {pendingDayRemoval ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-5">
          <button
            type="button"
            aria-label="Cerrar confirmación de eliminación de día"
            className="absolute inset-0 bg-black/70"
            onClick={() => setPendingDayRemoval(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-[#1A2D42] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.42)]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#2A3C50]" />
            <h3 className="text-center text-3xl font-extrabold tracking-tight text-white">Eliminar día?</h3>
            <p className="mt-3 text-center text-sm text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Se eliminará <span className="font-semibold text-white">{pendingDayRemoval.dayName}</span> con todos sus ejercicios.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={confirmRemoveDay}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(255,93,93,0.24)] bg-[#FF4D4D] py-4 font-bold text-white shadow-[0_12px_30px_rgba(255,77,77,0.24)]"
              >
                <Trash2 size={16} />
                Eliminar día
              </button>
              <button
                type="button"
                onClick={() => setPendingDayRemoval(null)}
                className="flex w-full items-center justify-center rounded-2xl bg-[#2A2F3D] py-4 font-bold text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCancelRoutineModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-5">
          <button
            type="button"
            aria-label="Cerrar modal de rutina nueva"
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowCancelRoutineModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-[#1A2D42] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.42)]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#2A3C50]" />
            <h3 className="text-center text-3xl font-extrabold tracking-tight text-white">Salir de la rutina?</h3>
            <p className="mt-3 text-center text-sm text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Podés guardar esta rutina, descartarla o seguir creándola.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={async () => {
                  setShowCancelRoutineModal(false);
                  await handleSave();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 font-bold text-black shadow-[0_0_15px_rgba(0,201,167,0.2)]"
              >
                <Save size={16} />
                Guardar
              </button>
              <button
                type="button"
                onClick={discardNewRoutine}
                className="flex w-full items-center justify-center rounded-2xl border border-[rgba(255,125,125,0.22)] bg-[rgba(255,125,125,0.08)] py-4 font-bold text-[#FF8E8E]"
              >
                Descartar rutina
              </button>
              <button
                type="button"
                onClick={() => setShowCancelRoutineModal(false)}
                className="flex w-full items-center justify-center rounded-2xl bg-[#2A2F3D] py-4 font-bold text-white"
              >
                Continuar creando rutina
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Unsaved changes modal */}
      {blocker.state === 'blocked' ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-5">
          <button
            type="button"
            aria-label="Cerrar modal de cambios"
            className="absolute inset-0 bg-black/70"
            onClick={() => blocker.reset()}
          />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-[#1A2D42] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.42)]">
            <h3 className="text-center text-3xl font-extrabold tracking-tight text-white">Guardar cambios?</h3>
            <p className="mt-3 text-center text-sm text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Hay cambios sin guardar en esta rutina.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={async () => {
                  blocker.reset();
                  await handleSave();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 font-bold text-black shadow-[0_0_15px_rgba(0,201,167,0.2)]"
              >
                <Save size={16} />
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  persistNewRoutineDraft(null);
                  blocker.proceed();
                }}
                className="flex w-full items-center justify-center rounded-2xl border border-[rgba(255,125,125,0.22)] bg-[rgba(255,125,125,0.08)] py-4 font-bold text-[#FF8E8E]"
              >
                Descartar cambios
              </button>
              <button
                type="button"
                onClick={() => blocker.reset()}
                className="flex w-full items-center justify-center rounded-2xl bg-[#2A2F3D] py-4 font-bold text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showEditLockModal && activeWorkout && (
        <ActiveWorkoutEditLockModal
          activeWorkoutName={activeWorkout.sessionName}
          onResume={() => navigate('/session')}
          onFinish={() => navigate('/session', { state: { action: 'finish' } })}
          onCancel={() => setShowEditLockModal(false)}
        />
      )}
    </div>
  );
}
