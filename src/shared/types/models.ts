export interface SetData {
  id: number;
  kg: number;
  reps: number;
  rpe: number;
  completed: boolean;
  kind?: 'normal' | 'warmup';
}

export interface ActiveWorkoutSet extends SetData {
  prevKg: number;
  prevReps: number;
  kind: 'normal' | 'warmup';
}

export interface ExerciseData {
  id: number;
  name: string;
  muscle: string;
  implement?: string;
  secondaryMuscles?: string[];
  notes?: string;
  sets: SetData[];
}

export interface ActiveWorkoutExercise {
  id: number;
  name: string;
  muscle: string;
  implement?: string;
  notes?: string;
  sets: ActiveWorkoutSet[];
}

export interface DayData {
  id?: number;
  name: string;
  focus: string;
  description?: string;
  exercises: ExerciseData[];
}

export interface RoutineCategory {
  name: string;
  percentage: number;
  color: string;
}

export interface Routine {
  id: number;
  name: string;
  daysPerWeek: number;
  color: string;
  categories: RoutineCategory[];
  description?: string;
  tags?: string[];
  avgMinutes?: number;
  days: DayData[];
}

export interface SessionHistoryExerciseSet {
  kg: number;
  reps: number;
  rpe?: number;
  kind?: 'normal' | 'warmup';
}

export interface SessionHistoryExercise {
  name: string;
  muscle: string;
  implement?: string;
  secondaryMuscles?: string[];
  notes?: string;
  sets: SessionHistoryExerciseSet[];
  maxKg: number;
}

export interface SessionHistory {
  id: number;
  routineId?: number;
  isoDate: string;
  date: string;
  dayLabel: string;
  name: string;
  muscle: string;
  duration: number;
  kcal: number;
  volume: number;
  avgRpe: number;
  comparisonDelta?: number;
  exercises: SessionHistoryExercise[];
  notes?: string;
  sessionFocus?: string;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl?: string;
  gender?: string;
  birthDate?: string;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  goal: string;
  focusMuscle?: string;
  workoutLocation?: string;
  activityLevel: string;
  activityFactor: number;
  activityDescription: string;
  trainingLevel: string;
  preferredTrainingDays: string[];
  preferredScheduleMode: 'same' | 'different';
  preferredWorkoutTime?: string;
  preferredWorkoutTimeByDay: Record<string, string>;
  memberSince: string;
  onboardingCompletedAt?: string;
  activeRoutineId?: number | null;
}

export interface AppSettings {
  weightUnit: 'kg' | 'lb';
  theme: 'dark' | 'light';
  soundsEnabled: boolean;
  vibrationEnabled: boolean;
  restTimerSeconds: number;
  autoWeightIncrement: boolean;
  showPreviousWeight: boolean;
}

export interface ActivityLevelOption {
  label: string;
  factor: number;
  description: string;
}

export interface AppContext {
  todayIso: string;
  todayLabel: string;
  activeRoutineId: number | null;
  currentDayName: string;
  nextDayName: string;
  nextDayLabel: string;
  streakDays: number;
}

export interface WeekDayStatus {
  day: string;
  isoDate: string;
  completed: boolean;
  missed: boolean;
  active: boolean;
}

export interface HistoryCalendarDay {
  day: string;
  num: number;
  isoDate: string;
}

export interface MuscleExerciseRecord {
  name: string;
  pr: number;
  unit: string;
}

export interface MuscleGroupRecord {
  id: string;
  name: string;
  color: string;
  exercises: MuscleExerciseRecord[];
}

export interface CompletedSessionInput {
  routineId?: number | null;
  routineName?: string;
  dayName: string;
  sessionFocus?: string;
  durationSeconds: number;
  notes?: string;
  exercises: ExerciseData[];
}

export interface UpdateSessionInput extends CompletedSessionInput {
  sessionId: number;
}

export interface ActiveWorkoutDraft {
  id: string;
  mode: 'free' | 'routine';
  routineId?: number | null;
  dayName: string;
  sessionName: string;
  sessionFocus: string;
  startedAt: string;
  notes: string;
  currentExerciseIndex: number;
  exercises: ActiveWorkoutExercise[];
}
