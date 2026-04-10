import type { Session, User } from '@supabase/supabase-js';
import { ACTIVITY_LEVEL_OPTIONS } from './constants';
import { formatDayLabel, formatSessionDate, getTodayIso } from './dateUtils';
import { DEFAULT_USER_PROFILE } from './seedData';
import { getSupabaseClient } from '../lib/supabase';
import type {
  CompletedSessionInput,
  Routine,
  SessionHistory,
  SessionHistoryExercise,
  SessionHistoryExerciseSet,
  SetData,
  UpdateSessionInput,
  UserProfile,
} from './models';

type DbProfileRow = {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  gender: string | null;
  birth_date: string | null;
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number | null;
  goal: string;
  focus_muscle: string | null;
  workout_location: string | null;
  activity_level: string;
  training_level: string;
  preferred_training_days: string[] | null;
  preferred_schedule_mode: 'same' | 'different' | null;
  preferred_workout_time: string | null;
  preferred_workout_time_by_day: Record<string, string> | null;
  member_since: string;
  onboarding_completed_at: string | null;
  active_routine_id: number | null;
  avatar_path: string | null;
  avatar_updated_at: string | null;
};

const PROFILE_AVATAR_BUCKET = 'profile-avatars';
const SESSION_META_PREFIX = '__WOHL_SESSION_META__::';

type SessionExerciseMeta = {
  notes?: string;
  setKinds?: Array<'normal' | 'warmup'>;
};

type DecodedSessionNotes = {
  sessionNote?: string;
  exerciseMeta: SessionExerciseMeta[];
};

type DbRoutineRow = {
  id: number;
  owner_id: string;
  name: string;
  days_per_week: number;
  color: string;
  categories: Routine['categories'] | null;
  description: string | null;
  tags: string[] | null;
  avg_minutes: number | null;
};

type DbRoutineDayRow = {
  id: number;
  routine_id: number;
  position: number;
  name: string;
  focus: string;
  description: string | null;
};

type DbRoutineDayExerciseRow = {
  id: number;
  routine_day_id: number;
  position: number;
  name: string;
  muscle: string;
  implement: string | null;
  secondary_muscles: string[] | null;
  notes: string | null;
  sets_json: Array<{ kg: number; reps: number; rpe: number; kind?: 'normal' | 'warmup' }> | null;
};

type DbSessionRow = {
  id: number;
  owner_id: string;
  routine_id: number | null;
  session_date: string;
  day_name: string;
  muscle_summary: string;
  session_focus: string | null;
  duration_seconds: number;
  kcal: number;
  volume: number;
  avg_rpe: number;
  notes: string | null;
};

type DbSessionExerciseRow = {
  id: number;
  workout_session_id: number;
  position: number;
  name: string;
  muscle: string;
  implement: string | null;
  secondary_muscles: string[] | null;
  max_kg: number;
};

type DbSessionSetRow = {
  id: number;
  workout_session_exercise_id: number;
  position: number;
  kg: number;
  reps: number;
  rpe: number | null;
};

function encodeMetadataPayload(payload: object) {
  const raw = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';

  raw.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function decodeMetadataPayload(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as {
    exerciseMeta?: SessionExerciseMeta[];
  };
}

function decodeSessionNotes(rawNotes: string | null): DecodedSessionNotes {
  if (!rawNotes) {
    return { sessionNote: undefined, exerciseMeta: [] };
  }

  const metaIndex = rawNotes.indexOf(SESSION_META_PREFIX);
  if (metaIndex === -1) {
    return {
      sessionNote: rawNotes.trim() || undefined,
      exerciseMeta: [],
    };
  }

  const visibleNotes = rawNotes.slice(0, metaIndex).trim() || undefined;
  const encodedMeta = rawNotes.slice(metaIndex + SESSION_META_PREFIX.length).trim();

  try {
    const decoded = decodeMetadataPayload(encodedMeta);
    return {
      sessionNote: visibleNotes,
      exerciseMeta: decoded.exerciseMeta ?? [],
    };
  } catch {
    return {
      sessionNote: rawNotes.trim() || undefined,
      exerciseMeta: [],
    };
  }
}

function encodeSessionNotes(sessionNote: string | undefined, exercises: CompletedSessionInput['exercises']) {
  const sanitizedSessionNote = sessionNote?.trim() ?? '';
  const exerciseMeta = exercises.map((exercise) => ({
    notes: exercise.notes?.trim() || undefined,
    setKinds: exercise.sets.map((set) => set.kind ?? 'normal'),
  }));

  const hasMeta = exerciseMeta.some(
    (exercise) =>
      (exercise.notes && exercise.notes.length > 0) ||
      exercise.setKinds?.some((kind) => kind === 'warmup')
  );

  if (!hasMeta) {
    return sanitizedSessionNote || null;
  }

  const encodedMeta = encodeMetadataPayload({ exerciseMeta });
  return `${sanitizedSessionNote}${sanitizedSessionNote ? '\n\n' : ''}${SESSION_META_PREFIX}${encodedMeta}`;
}

function resolveActivityLevel(label: string) {
  return (
    ACTIVITY_LEVEL_OPTIONS.find((option) => option.label === label) ??
    ACTIVITY_LEVEL_OPTIONS.find((option) => option.label === DEFAULT_USER_PROFILE.activityLevel) ??
    ACTIVITY_LEVEL_OPTIONS[0]
  );
}

function formatMemberSince(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
  const label = formatter.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function buildProfileAvatarUrl(avatarPath: string | null, avatarUpdatedAt: string | null) {
  if (!avatarPath) {
    return undefined;
  }

  const client = getSupabaseClient();
  const { data } = client.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(avatarPath);
  if (!data.publicUrl) {
    return undefined;
  }

  return avatarUpdatedAt ? `${data.publicUrl}?v=${encodeURIComponent(avatarUpdatedAt)}` : data.publicUrl;
}

function buildUserProfile(row: DbProfileRow): UserProfile {
  const activity = resolveActivityLevel(row.activity_level);
  const firstName = row.first_name.trim();
  const lastName = row.last_name.trim();
  const fullName = `${firstName} ${lastName}`.trim() || 'Tu perfil';

  return {
    firstName,
    lastName,
    fullName,
    avatarUrl: buildProfileAvatarUrl(row.avatar_path, row.avatar_updated_at),
    gender: row.gender ?? undefined,
    birthDate: row.birth_date ?? undefined,
    age: row.age,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    targetWeightKg: row.target_weight_kg ?? undefined,
    goal: row.goal,
    focusMuscle: row.focus_muscle ?? DEFAULT_USER_PROFILE.focusMuscle,
    workoutLocation: row.workout_location ?? DEFAULT_USER_PROFILE.workoutLocation,
    activityLevel: activity.label,
    activityFactor: activity.factor,
    activityDescription: activity.description,
    trainingLevel: row.training_level,
    preferredTrainingDays: row.preferred_training_days ?? [],
    preferredScheduleMode: row.preferred_schedule_mode ?? DEFAULT_USER_PROFILE.preferredScheduleMode,
    preferredWorkoutTime: row.preferred_workout_time ?? DEFAULT_USER_PROFILE.preferredWorkoutTime,
    preferredWorkoutTimeByDay: row.preferred_workout_time_by_day ?? {},
    memberSince: row.member_since || formatMemberSince(),
    onboardingCompletedAt: row.onboarding_completed_at ?? undefined,
    activeRoutineId: row.active_routine_id,
  };
}

function buildProfileInsert(user: User) {
  return {
    id: user.id,
    email: user.email ?? null,
    first_name: '',
    last_name: '',
    gender: null,
    birth_date: null,
    age: DEFAULT_USER_PROFILE.age,
    height_cm: DEFAULT_USER_PROFILE.heightCm,
    weight_kg: DEFAULT_USER_PROFILE.weightKg,
    target_weight_kg: null,
    goal: DEFAULT_USER_PROFILE.goal,
    focus_muscle: DEFAULT_USER_PROFILE.focusMuscle ?? null,
    workout_location: DEFAULT_USER_PROFILE.workoutLocation ?? null,
    activity_level: DEFAULT_USER_PROFILE.activityLevel,
    training_level: DEFAULT_USER_PROFILE.trainingLevel,
    preferred_training_days: DEFAULT_USER_PROFILE.preferredTrainingDays,
    preferred_schedule_mode: DEFAULT_USER_PROFILE.preferredScheduleMode,
    preferred_workout_time: DEFAULT_USER_PROFILE.preferredWorkoutTime ?? null,
    preferred_workout_time_by_day: DEFAULT_USER_PROFILE.preferredWorkoutTimeByDay,
    member_since: formatMemberSince(),
    onboarding_completed_at: null,
    avatar_path: null,
    avatar_updated_at: null,
  };
}

function buildSetTemplate(sets: SetData[]) {
  return sets.map((set) => ({
    kg: set.kg,
    reps: set.reps,
    rpe: set.rpe,
    kind: set.kind ?? 'normal',
  }));
}

function composeRoutine(days: DbRoutineDayRow[], exercises: DbRoutineDayExerciseRow[], row: DbRoutineRow): Routine {
  return {
    id: row.id,
    name: row.name,
    daysPerWeek: row.days_per_week,
    color: row.color,
    categories: row.categories ?? [],
    description: row.description ?? undefined,
    tags: row.tags ?? undefined,
    avgMinutes: row.avg_minutes ?? undefined,
    days: days
      .filter((day) => day.routine_id === row.id)
      .sort((a, b) => a.position - b.position)
      .map((day) => ({
        id: day.id,
        name: day.name,
        focus: day.focus,
        description: day.description ?? undefined,
        exercises: exercises
          .filter((exercise) => exercise.routine_day_id === day.id)
          .sort((a, b) => a.position - b.position)
          .map((exercise) => ({
            id: exercise.id,
            name: exercise.name,
            muscle: exercise.muscle,
            implement: exercise.implement ?? undefined,
            secondaryMuscles: exercise.secondary_muscles ?? undefined,
            notes: exercise.notes ?? undefined,
            sets: (exercise.sets_json ?? []).map((set, index) => ({
              id: index + 1,
              kg: set.kg,
              reps: set.reps,
              rpe: set.rpe,
              completed: false,
              kind: set.kind ?? 'normal',
            })),
          })),
      })),
  };
}

function getComparisonDelta(
  currentVolume: number,
  previousSession?: Pick<SessionHistory, 'volume'> | null
) {
  if (!previousSession || previousSession.volume <= 0) {
    return undefined;
  }

  return Number((((currentVolume - previousSession.volume) / previousSession.volume) * 100).toFixed(1));
}

function composeSessions(
  sessionRows: DbSessionRow[],
  exerciseRows: DbSessionExerciseRow[],
  setRows: DbSessionSetRow[]
): SessionHistory[] {
  const sessionsDescending = sessionRows
    .slice()
    .sort((a, b) => {
      if (a.session_date === b.session_date) {
        return b.id - a.id;
      }
      return b.session_date.localeCompare(a.session_date);
    })
    .map((sessionRow) => {
      const decodedNotes = decodeSessionNotes(sessionRow.notes);
      const exercises: SessionHistoryExercise[] = exerciseRows
        .filter((exercise) => exercise.workout_session_id === sessionRow.id)
        .sort((a, b) => a.position - b.position)
        .map((exercise) => {
          const exerciseMeta = decodedNotes.exerciseMeta[exercise.position] ?? {};
          const sets: SessionHistoryExerciseSet[] = setRows
            .filter((set) => set.workout_session_exercise_id === exercise.id)
            .sort((a, b) => a.position - b.position)
            .map((set) => ({
              kg: set.kg,
              reps: set.reps,
              rpe: set.rpe ?? undefined,
              kind: exerciseMeta.setKinds?.[set.position] ?? 'normal',
            }));

          return {
            name: exercise.name,
            muscle: exercise.muscle,
            implement: exercise.implement ?? undefined,
            secondaryMuscles: exercise.secondary_muscles ?? undefined,
            notes: exerciseMeta.notes,
            sets,
            maxKg: exercise.max_kg,
          };
        });

      return {
        id: sessionRow.id,
        routineId: sessionRow.routine_id ?? undefined,
        isoDate: sessionRow.session_date,
        date: formatSessionDate(sessionRow.session_date),
        dayLabel: formatDayLabel(sessionRow.session_date),
        name: sessionRow.day_name,
        muscle: sessionRow.muscle_summary,
        duration: Math.round(sessionRow.duration_seconds / 60),
        kcal: sessionRow.kcal,
        volume: sessionRow.volume,
        avgRpe: sessionRow.avg_rpe,
        exercises,
        notes: decodedNotes.sessionNote,
        sessionFocus: sessionRow.session_focus ?? undefined,
      } satisfies SessionHistory;
    });

  return sessionsDescending.map((session, index) => ({
    ...session,
    comparisonDelta: getComparisonDelta(
      session.volume,
      sessionsDescending.slice(index + 1).find((previous) => previous.name === session.name)
    ),
  }));
}

function buildSessionSummary(exercises: CompletedSessionInput['exercises']) {
  const completedExercises = exercises
    .map((exercise) => ({
      ...exercise,
      sets: exercise.sets.filter((set) => set.completed),
    }))
    .filter((exercise) => exercise.sets.length > 0);

  const allSets = completedExercises.flatMap((exercise) => exercise.sets);
  const volume = completedExercises.reduce(
    (total, exercise) =>
      total + exercise.sets.reduce((exerciseTotal, set) => exerciseTotal + set.kg * set.reps, 0),
    0
  );
  const avgRpe =
    allSets.length > 0
      ? Number((allSets.reduce((total, set) => total + (set.rpe ?? 0), 0) / allSets.length).toFixed(1))
      : 0;
  const kcal = Math.max(380, Math.round(allSets.length * 18 + (allSets.length > 0 ? 120 : 0)));
  const muscleSummary = Array.from(new Set(completedExercises.map((exercise) => exercise.muscle)))
    .slice(0, 3)
    .join(', ');

  return {
    completedExercises,
    volume,
    avgRpe,
    kcal,
    muscleSummary: muscleSummary || 'Sesion general',
  };
}

export async function ensureUserBootstrapped(session: Session) {
  const client = getSupabaseClient();
  const userId = session.user.id;

  const { data: existingProfile } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle<DbProfileRow>();

  if (!existingProfile) {
    const { error } = await client.from('profiles').insert(buildProfileInsert(session.user));
    if (error) {
      throw error;
    }
  }
}

export async function loadUserProfile(userId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single<DbProfileRow>();

  if (error) {
    throw error;
  }

  return buildUserProfile(data);
}

export async function loadRoutines(userId: string) {
  const client = getSupabaseClient();
  const { data: routineRows, error: routineError } = await client
    .from('routines')
    .select('*')
    .eq('owner_id', userId)
    .order('id', { ascending: true });

  if (routineError) {
    throw routineError;
  }

  const routineIds = (routineRows as DbRoutineRow[]).map((routine) => routine.id);
  if (routineIds.length === 0) {
    return [];
  }

  const { data: dayRows, error: dayError } = await client
    .from('routine_days')
    .select('*')
    .in('routine_id', routineIds)
    .order('position', { ascending: true });

  if (dayError) {
    throw dayError;
  }

  const dayIds = (dayRows as DbRoutineDayRow[]).map((day) => day.id);
  const exerciseRows = dayIds.length
    ? await client
        .from('routine_day_exercises')
        .select('*')
        .in('routine_day_id', dayIds)
        .order('position', { ascending: true })
    : { data: [], error: null };

  if (exerciseRows.error) {
    throw exerciseRows.error;
  }

  return (routineRows as DbRoutineRow[]).map((routine) =>
    composeRoutine(dayRows as DbRoutineDayRow[], exerciseRows.data as DbRoutineDayExerciseRow[], routine)
  );
}

export async function loadSessionHistory(userId: string) {
  const client = getSupabaseClient();
  const { data: sessionRows, error: sessionError } = await client
    .from('workout_sessions')
    .select('*')
    .eq('owner_id', userId)
    .order('session_date', { ascending: false })
    .order('id', { ascending: false });

  if (sessionError) {
    throw sessionError;
  }

  const sessionIds = (sessionRows as DbSessionRow[]).map((session) => session.id);
  if (sessionIds.length === 0) {
    return [];
  }

  const { data: exerciseRows, error: exerciseError } = await client
    .from('workout_session_exercises')
    .select('*')
    .in('workout_session_id', sessionIds)
    .order('position', { ascending: true });

  if (exerciseError) {
    throw exerciseError;
  }

  const exerciseIds = (exerciseRows as DbSessionExerciseRow[]).map((exercise) => exercise.id);
  const setRows = exerciseIds.length
    ? await client
        .from('workout_session_sets')
        .select('*')
        .in('workout_session_exercise_id', exerciseIds)
        .order('position', { ascending: true })
    : { data: [], error: null };

  if (setRows.error) {
    throw setRows.error;
  }

  return composeSessions(
      sessionRows as DbSessionRow[],
      exerciseRows as DbSessionExerciseRow[],
      setRows.data as DbSessionSetRow[]
  );
}

export async function loadAppData(session: Session) {
  await ensureUserBootstrapped(session);
  const userId = session.user.id;
  const [userProfile, routines, sessionHistory] = await Promise.all([
    loadUserProfile(userId),
    loadRoutines(userId),
    loadSessionHistory(userId),
  ]);

  return {
    userProfile,
    routines,
    sessionHistory,
  };
}

export async function updateProfile(userId: string, updates: Partial<UserProfile>) {
  const client = getSupabaseClient();
  const payload: Partial<DbProfileRow> = {};

  if (updates.firstName !== undefined) payload.first_name = updates.firstName;
  if (updates.lastName !== undefined) payload.last_name = updates.lastName;
  if (updates.gender !== undefined) payload.gender = updates.gender ?? null;
  if (updates.birthDate !== undefined) payload.birth_date = updates.birthDate ?? null;
  if (updates.age !== undefined) payload.age = updates.age;
  if (updates.heightCm !== undefined) payload.height_cm = updates.heightCm;
  if (updates.weightKg !== undefined) payload.weight_kg = updates.weightKg;
  if (updates.targetWeightKg !== undefined) payload.target_weight_kg = updates.targetWeightKg ?? null;
  if (updates.goal !== undefined) payload.goal = updates.goal;
  if (updates.focusMuscle !== undefined) payload.focus_muscle = updates.focusMuscle ?? null;
  if (updates.workoutLocation !== undefined) payload.workout_location = updates.workoutLocation ?? null;
  if (updates.activityLevel !== undefined) payload.activity_level = updates.activityLevel;
  if (updates.trainingLevel !== undefined) payload.training_level = updates.trainingLevel;
  if (updates.preferredTrainingDays !== undefined) payload.preferred_training_days = updates.preferredTrainingDays;
  if (updates.preferredScheduleMode !== undefined) payload.preferred_schedule_mode = updates.preferredScheduleMode;
  if (updates.preferredWorkoutTime !== undefined) payload.preferred_workout_time = updates.preferredWorkoutTime ?? null;
  if (updates.preferredWorkoutTimeByDay !== undefined) payload.preferred_workout_time_by_day = updates.preferredWorkoutTimeByDay;
  if (updates.memberSince !== undefined) payload.member_since = updates.memberSince;
  if (updates.onboardingCompletedAt !== undefined) payload.onboarding_completed_at = updates.onboardingCompletedAt ?? null;
  if (updates.activeRoutineId !== undefined) payload.active_routine_id = updates.activeRoutineId ?? null;

  const { data, error } = await client
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .single<DbProfileRow>();

  if (error) {
    throw error;
  }

  return buildUserProfile(data);
}

export async function uploadProfileAvatar(userId: string, avatarFile: Blob) {
  const client = getSupabaseClient();
  const avatarPath = `${userId}/avatar`;
  const avatarUpdatedAt = new Date().toISOString();

  const { error: uploadError } = await client.storage.from(PROFILE_AVATAR_BUCKET).upload(avatarPath, avatarFile, {
    upsert: true,
    contentType: avatarFile.type || 'image/webp',
    cacheControl: '3600',
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data, error } = await client
    .from('profiles')
    .update({
      avatar_path: avatarPath,
      avatar_updated_at: avatarUpdatedAt,
    })
    .eq('id', userId)
    .select('*')
    .single<DbProfileRow>();

  if (error) {
    throw error;
  }

  return buildUserProfile(data);
}

export async function saveRoutine(userId: string, routine: Routine) {
  const client = getSupabaseClient();
  const routinePayload = {
    owner_id: userId,
    name: routine.name,
    days_per_week: routine.daysPerWeek,
    color: routine.color,
    categories: routine.categories,
    description: routine.description ?? null,
    tags: routine.tags ?? null,
    avg_minutes: routine.avgMinutes ?? null,
  };

  const existingId = routine.id > 0 ? routine.id : null;
  const routineQuery = existingId
    ? client.from('routines').update(routinePayload).eq('id', existingId).eq('owner_id', userId)
    : client.from('routines').insert(routinePayload);

  const { data: savedRoutineRows, error: routineError } = await routineQuery.select('*');

  if (routineError) {
    throw routineError;
  }

  const savedRoutine = (savedRoutineRows as DbRoutineRow[])[0];

  if (existingId) {
    const { error: deleteDaysError } = await client
      .from('routine_days')
      .delete()
      .eq('routine_id', existingId);

    if (deleteDaysError) {
      throw deleteDaysError;
    }
  }

  for (const [dayIndex, day] of routine.days.entries()) {
    const { data: dayRows, error: dayError } = await client
      .from('routine_days')
      .insert({
        routine_id: savedRoutine.id,
        position: dayIndex,
        name: day.name,
        focus: day.focus,
        description: day.description ?? null,
      })
      .select('*');

    if (dayError) {
      throw dayError;
    }

    const insertedDay = (dayRows as DbRoutineDayRow[])[0];

    if (day.exercises.length > 0) {
      const exercisePayload = day.exercises.map((exercise, exerciseIndex) => ({
        routine_day_id: insertedDay.id,
        position: exerciseIndex,
        name: exercise.name,
        muscle: exercise.muscle,
        implement: exercise.implement ?? null,
        secondary_muscles: exercise.secondaryMuscles ?? null,
        notes: exercise.notes ?? null,
        sets_json: buildSetTemplate(exercise.sets),
      }));

      const { error: exerciseError } = await client.from('routine_day_exercises').insert(exercisePayload);
      if (exerciseError) {
        throw exerciseError;
      }
    }
  }

  const refreshedRoutines = await loadRoutines(userId);
  return refreshedRoutines.find((item) => item.id === savedRoutine.id) ?? refreshedRoutines[0];
}

export async function deleteRoutine(userId: string, routineId: number) {
  const client = getSupabaseClient();
  const { error } = await client
    .from('routines')
    .delete()
    .eq('owner_id', userId)
    .eq('id', routineId);

  if (error) {
    throw error;
  }
}

export async function createRoutineCopy(userId: string, routine: Routine) {
  return saveRoutine(userId, {
    ...routine,
    id: 0,
    name: `Copia de ${routine.name}`,
  });
}

export async function completeSession(userId: string, input: CompletedSessionInput) {
  const client = getSupabaseClient();
  const todayIso = getTodayIso();
  const summary = buildSessionSummary(input.exercises);
  const durationSeconds = Math.max(0, Math.round(input.durationSeconds));

  const { data: sessionRows, error: sessionError } = await client
    .from('workout_sessions')
    .insert({
      owner_id: userId,
      routine_id: input.routineId ?? null,
      session_date: todayIso,
      day_name: input.dayName,
      muscle_summary: summary.muscleSummary,
      session_focus: input.sessionFocus ?? null,
      duration_seconds: durationSeconds,
      kcal: Math.max(summary.kcal, Math.round(durationSeconds / 300)),
      volume: summary.volume,
      avg_rpe: summary.avgRpe,
      notes: encodeSessionNotes(input.notes, input.exercises),
    })
    .select('*');

  if (sessionError) {
    throw sessionError;
  }

  const insertedSession = (sessionRows as DbSessionRow[])[0];

  for (const [exerciseIndex, exercise] of summary.completedExercises.entries()) {
    const { data: exerciseRows, error: exerciseError } = await client
      .from('workout_session_exercises')
      .insert({
        workout_session_id: insertedSession.id,
        position: exerciseIndex,
        name: exercise.name,
        muscle: exercise.muscle,
        implement: exercise.implement ?? null,
        secondary_muscles: exercise.secondaryMuscles ?? null,
        max_kg: Math.max(...exercise.sets.map((set) => set.kg), 0),
      })
      .select('*');

    if (exerciseError) {
      throw exerciseError;
    }

    const insertedExercise = (exerciseRows as DbSessionExerciseRow[])[0];
    if (exercise.sets.length > 0) {
      const setPayload = exercise.sets.map((set, setIndex) => ({
        workout_session_exercise_id: insertedExercise.id,
        position: setIndex,
        kg: set.kg,
        reps: set.reps,
        rpe: set.rpe ?? null,
      }));

      const { error: setError } = await client.from('workout_session_sets').insert(setPayload);
      if (setError) {
        throw setError;
      }
    }
  }

  const sessions = await loadSessionHistory(userId);
  return sessions.find((session) => session.id === insertedSession.id) ?? sessions[0];
}

export async function updateSession(userId: string, input: UpdateSessionInput) {
  const client = getSupabaseClient();
  const summary = buildSessionSummary(input.exercises);
  const durationSeconds = Math.max(0, Math.round(input.durationSeconds));

  const { error: sessionError } = await client
    .from('workout_sessions')
    .update({
      routine_id: input.routineId ?? null,
      day_name: input.dayName,
      muscle_summary: summary.muscleSummary,
      session_focus: input.sessionFocus ?? null,
      duration_seconds: durationSeconds,
      kcal: Math.max(summary.kcal, Math.round(durationSeconds / 300)),
      volume: summary.volume,
      avg_rpe: summary.avgRpe,
      notes: encodeSessionNotes(input.notes, input.exercises),
    })
    .eq('owner_id', userId)
    .eq('id', input.sessionId);

  if (sessionError) {
    throw sessionError;
  }

  const { error: deleteExercisesError } = await client
    .from('workout_session_exercises')
    .delete()
    .eq('workout_session_id', input.sessionId);

  if (deleteExercisesError) {
    throw deleteExercisesError;
  }

  for (const [exerciseIndex, exercise] of summary.completedExercises.entries()) {
    const { data: exerciseRows, error: exerciseError } = await client
      .from('workout_session_exercises')
      .insert({
        workout_session_id: input.sessionId,
        position: exerciseIndex,
        name: exercise.name,
        muscle: exercise.muscle,
        implement: exercise.implement ?? null,
        secondary_muscles: exercise.secondaryMuscles ?? null,
        max_kg: Math.max(...exercise.sets.map((set) => set.kg), 0),
      })
      .select('*');

    if (exerciseError) {
      throw exerciseError;
    }

    const insertedExercise = (exerciseRows as DbSessionExerciseRow[])[0];

    if (exercise.sets.length > 0) {
      const setPayload = exercise.sets.map((set, setIndex) => ({
        workout_session_exercise_id: insertedExercise.id,
        position: setIndex,
        kg: set.kg,
        reps: set.reps,
        rpe: set.rpe ?? null,
      }));

      const { error: setError } = await client.from('workout_session_sets').insert(setPayload);
      if (setError) {
        throw setError;
      }
    }
  }

  const sessions = await loadSessionHistory(userId);
  return sessions.find((session) => session.id === input.sessionId) ?? sessions[0];
}

export async function deleteSession(userId: string, sessionId: number) {
  const client = getSupabaseClient();
  const { error } = await client
    .from('workout_sessions')
    .delete()
    .eq('owner_id', userId)
    .eq('id', sessionId);

  if (error) {
    throw error;
  }
}
