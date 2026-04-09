alter table public.profiles
  add column if not exists gender text null,
  add column if not exists birth_date date null,
  add column if not exists target_weight_kg numeric(6, 2) null,
  add column if not exists focus_muscle text null,
  add column if not exists workout_location text null,
  add column if not exists preferred_training_days jsonb not null default '[]'::jsonb,
  add column if not exists preferred_schedule_mode text not null default 'same',
  add column if not exists preferred_workout_time text null,
  add column if not exists preferred_workout_time_by_day jsonb not null default '{}'::jsonb,
  add column if not exists onboarding_completed_at timestamptz null;

update public.profiles
set onboarding_completed_at = coalesce(onboarding_completed_at, updated_at, created_at, timezone('utc', now()))
where onboarding_completed_at is null
  and first_name <> ''
  and last_name <> ''
  and age > 0
  and height_cm > 0
  and weight_kg > 0;
