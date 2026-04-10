import type {
  ActiveWorkoutExercise,
  ExerciseData,
  SessionHistory,
} from '@/shared/types/models';

export type ExerciseState = ActiveWorkoutExercise;

export const DEFAULT_REST = 90;
export const FREE_SESSION_NAME = 'Entrenamiento libre';
export const FREE_SESSION_FOCUS = 'Sesión vacía y personalizada';

export function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}

export function buildExerciseState(
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

export function buildExerciseStateFromHistorySession(
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

export function buildExerciseStateFromTemplate(
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

export function buildManualExerciseState(
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

export function markExerciseSetsCompleted(exercise: ExerciseState) {
  return {
    ...exercise,
    sets: exercise.sets.map((set) => ({ ...set, completed: true })),
  };
}

export function isBodyweightExercise(exercise: Pick<ExerciseState, 'implement'>) {
  const implement = exercise.implement?.trim().toLowerCase() ?? '';
  return implement.includes('peso corporal') || implement.includes('bodyweight');
}
