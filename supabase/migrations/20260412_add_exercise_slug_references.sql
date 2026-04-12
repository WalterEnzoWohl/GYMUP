alter table public.routine_day_exercises
add column if not exists exercise_slug text null;

create index if not exists routine_day_exercises_exercise_slug_idx
  on public.routine_day_exercises (exercise_slug);

alter table public.workout_session_exercises
add column if not exists exercise_slug text null;

create index if not exists workout_session_exercises_exercise_slug_idx
  on public.workout_session_exercises (exercise_slug);
