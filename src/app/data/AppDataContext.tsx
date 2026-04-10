import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { DEFAULT_APP_SETTINGS, mergeAppSettings } from './appSettings';
import { ACTIVITY_LEVEL_OPTIONS } from './constants';
import { buildAppContext, buildHistoryCalendar, buildWeekDayStatus } from './dateUtils';
import type {
  ActiveWorkoutDraft,
  AppContext,
  AppSettings,
  CompletedSessionInput,
  HistoryCalendarDay,
  Routine,
  SessionHistory,
  UpdateSessionInput,
  UserProfile,
  WeekDayStatus,
} from './models';
import {
  completeSession as completeSessionRecord,
  createRoutineCopy,
  deleteSession as deleteSessionRecord,
  deleteRoutine as deleteRoutineRecord,
  loadAppData,
  saveRoutine as saveRoutineRecord,
  updateSession as updateSessionRecord,
  updateProfile,
  uploadProfileAvatar as uploadProfileAvatarRecord,
} from './supabaseRepository';
import { DEFAULT_ROUTINES, DEFAULT_USER_PROFILE } from './seedData';

type AppDataContextValue = {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  userProfile: UserProfile;
  routines: Routine[];
  sessionHistory: SessionHistory[];
  appContext: AppContext;
  weekDays: WeekDayStatus[];
  historyDays: HistoryCalendarDay[];
  appSettings: AppSettings;
  refreshAppData: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateProfileAvatar: (avatarFile: Blob) => Promise<void>;
  updateAppSettings: (updates: Partial<AppSettings>) => void;
  setActiveRoutine: (routineId: number | null) => Promise<void>;
  saveRoutine: (routine: Routine) => Promise<Routine | undefined>;
  copyRoutine: (routine: Routine) => Promise<Routine | undefined>;
  deleteRoutine: (routineId: number) => Promise<void>;
  completeSession: (input: CompletedSessionInput) => Promise<SessionHistory | undefined>;
  updateSession: (input: UpdateSessionInput) => Promise<SessionHistory | undefined>;
  deleteSession: (sessionId: number) => Promise<void>;
  activeWorkout: ActiveWorkoutDraft | null;
  saveActiveWorkout: (draft: ActiveWorkoutDraft) => void;
  clearActiveWorkout: () => void;
};

const DEFAULT_APP_CONTEXT: AppContext = {
  todayIso: new Date().toISOString().slice(0, 10),
  todayLabel: '',
  activeRoutineId: DEFAULT_ROUTINES[0]?.id ?? null,
  currentDayName: DEFAULT_ROUTINES[0]?.days[0]?.name ?? '',
  nextDayName: DEFAULT_ROUTINES[0]?.days[1]?.name ?? '',
  nextDayLabel: 'Próximo',
  streakDays: 0,
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

function getActiveWorkoutStorageKey(userId: string) {
  return `wohl.activeWorkout.${userId}`;
}

function getAppSettingsStorageKey(userId: string) {
  return `wohl.appSettings.${userId}`;
}

function readActiveWorkout(userId: string): ActiveWorkoutDraft | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(getActiveWorkoutStorageKey(userId));
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as ActiveWorkoutDraft;
  } catch {
    window.localStorage.removeItem(getActiveWorkoutStorageKey(userId));
    return null;
  }
}

function writeActiveWorkout(userId: string, draft: ActiveWorkoutDraft | null) {
  if (typeof window === 'undefined') {
    return;
  }

  const storageKey = getActiveWorkoutStorageKey(userId);

  if (!draft) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(draft));
}

function readAppSettings(userId: string): AppSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_APP_SETTINGS;
  }

  const stored = window.localStorage.getItem(getAppSettingsStorageKey(userId));
  if (!stored) {
    return DEFAULT_APP_SETTINGS;
  }

  try {
    return mergeAppSettings(JSON.parse(stored) as Partial<AppSettings>);
  } catch {
    window.localStorage.removeItem(getAppSettingsStorageKey(userId));
    return DEFAULT_APP_SETTINGS;
  }
}

function writeAppSettings(userId: string, settings: AppSettings) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getAppSettingsStorageKey(userId), JSON.stringify(settings));
}

function withDerivedState(userProfile: UserProfile, routines: Routine[], sessionHistory: SessionHistory[]) {
  const appContext = buildAppContext(routines, sessionHistory, userProfile.activeRoutineId);
  const weekDays = buildWeekDayStatus(
    sessionHistory,
    appContext.todayIso,
    userProfile.preferredTrainingDays,
    userProfile.onboardingCompletedAt
  );
  const historyDays = buildHistoryCalendar(appContext.todayIso);

  return {
    userProfile,
    routines,
    sessionHistory,
    appContext,
    weekDays,
    historyDays,
  };
}

export function AppDataProvider({
  children,
  session,
}: {
  children: ReactNode;
  session: Session;
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    ...DEFAULT_USER_PROFILE,
    activityLevel:
      ACTIVITY_LEVEL_OPTIONS.find((option) => option.label === DEFAULT_USER_PROFILE.activityLevel)?.label ??
      DEFAULT_USER_PROFILE.activityLevel,
  });
  const [routines, setRoutines] = useState<Routine[]>(DEFAULT_ROUTINES);
  const [sessionHistory, setSessionHistory] = useState<SessionHistory[]>([]);
  const [activeWorkout, setActiveWorkoutState] = useState<ActiveWorkoutDraft | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  const refreshAppData = async () => {
    setStatus('loading');
    setError(null);

    try {
      const nextData = await loadAppData(session);
      setUserProfile(nextData.userProfile);
      setRoutines(nextData.routines);
      setSessionHistory(nextData.sessionHistory);
      setStatus('ready');
    } catch (caughtError) {
      setStatus('error');
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar la app.');
    }
  };

  useEffect(() => {
    void refreshAppData();
  }, [session.user.id]);

  useEffect(() => {
    setActiveWorkoutState(readActiveWorkout(session.user.id));
  }, [session.user.id]);

  useEffect(() => {
    setAppSettings(readAppSettings(session.user.id));
  }, [session.user.id]);

  const saveActiveWorkout = useCallback(
    (draft: ActiveWorkoutDraft) => {
      setActiveWorkoutState(draft);
      writeActiveWorkout(session.user.id, draft);
    },
    [session.user.id]
  );

  const clearActiveWorkout = useCallback(() => {
    setActiveWorkoutState(null);
    writeActiveWorkout(session.user.id, null);
  }, [session.user.id]);

  const updateAppSettings = useCallback(
    (updates: Partial<AppSettings>) => {
      setAppSettings((previous) => {
        const nextSettings = mergeAppSettings({
          ...previous,
          ...updates,
        });
        writeAppSettings(session.user.id, nextSettings);
        return nextSettings;
      });
    },
    [session.user.id]
  );

  const updateProfileAvatar = useCallback(
    async (avatarFile: Blob) => {
      const nextProfile = await uploadProfileAvatarRecord(session.user.id, avatarFile);
      setUserProfile(nextProfile);
    },
    [session.user.id]
  );

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    const nextProfile = await updateProfile(session.user.id, updates);
    setUserProfile(nextProfile);
  };

  const setActiveRoutine = async (routineId: number | null) => {
    const nextProfile = await updateProfile(session.user.id, {
      activeRoutineId: routineId,
    });
    setUserProfile(nextProfile);
  };

  const saveRoutine = async (routine: Routine) => {
    const savedRoutine = await saveRoutineRecord(session.user.id, routine);
    setRoutines((previous) => {
      const filtered = previous.filter((item) => item.id !== savedRoutine.id);
      return [...filtered, savedRoutine].sort((a, b) => a.id - b.id);
    });
    return savedRoutine;
  };

  const copyRoutine = async (routine: Routine) => {
    const copiedRoutine = await createRoutineCopy(session.user.id, routine);
    setRoutines((previous) => [...previous, copiedRoutine].sort((a, b) => a.id - b.id));
    return copiedRoutine;
  };

  const deleteRoutine = async (routineId: number) => {
    await deleteRoutineRecord(session.user.id, routineId);
    setRoutines((previous) => previous.filter((routine) => routine.id !== routineId));

    if (userProfile.activeRoutineId === routineId) {
      const nextRoutine = routines.find((routine) => routine.id !== routineId) ?? null;
      const nextProfile = await updateProfile(session.user.id, {
        activeRoutineId: nextRoutine?.id ?? null,
      });
      setUserProfile(nextProfile);
    }
  };

  const completeSession = async (input: CompletedSessionInput) => {
    const sessionRecord = await completeSessionRecord(session.user.id, input);
    setSessionHistory((previous) =>
      [sessionRecord, ...previous.filter((sessionItem) => sessionItem.id !== sessionRecord.id)].sort((a, b) => {
        if (a.isoDate === b.isoDate) {
          return b.id - a.id;
        }
        return b.isoDate.localeCompare(a.isoDate);
      })
    );
    return sessionRecord;
  };

  const updateSession = async (input: UpdateSessionInput) => {
    const sessionRecord = await updateSessionRecord(session.user.id, input);
    setSessionHistory((previous) =>
      [sessionRecord, ...previous.filter((sessionItem) => sessionItem.id !== sessionRecord.id)].sort((a, b) => {
        if (a.isoDate === b.isoDate) {
          return b.id - a.id;
        }
        return b.isoDate.localeCompare(a.isoDate);
      })
    );
    return sessionRecord;
  };

  const deleteSession = async (sessionId: number) => {
    await deleteSessionRecord(session.user.id, sessionId);
    setSessionHistory((previous) => previous.filter((sessionItem) => sessionItem.id !== sessionId));
  };

  const derivedState =
    status === 'ready'
      ? withDerivedState(userProfile, routines, sessionHistory)
      : {
          userProfile,
          routines,
          sessionHistory,
          appContext: DEFAULT_APP_CONTEXT,
          weekDays: [] as WeekDayStatus[],
          historyDays: [] as HistoryCalendarDay[],
        };

  return (
    <AppDataContext.Provider
      value={{
        status,
        error,
        ...derivedState,
        appSettings,
        refreshAppData,
        updateUserProfile,
        updateProfileAvatar,
        updateAppSettings,
        setActiveRoutine,
        saveRoutine,
        copyRoutine,
        deleteRoutine,
        completeSession,
        updateSession,
        deleteSession,
        activeWorkout,
        saveActiveWorkout,
        clearActiveWorkout,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData debe usarse dentro de AppDataProvider.');
  }
  return context;
}
