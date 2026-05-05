import { useMemo, useState } from 'react';
import { ChevronRight, Clock, Dumbbell, Flame, Play, Settings, Target, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Header } from '@/shared/components/layout/Header';
import { normalizeGoal } from '@/core/domain/profileInsights';
import { useAppData } from '@/core/app-data/AppDataContext';
import { formatCompactWeight } from '@/shared/lib/unitUtils';
import { getUserFirstName } from '@/shared/lib/userProfileUtils';
import type { SessionHistory } from '@/shared/types/models';
import { WeeklyMuscleLoad } from '../components/WeeklyMuscleLoad';

function normalizeMuscleHighlight(label: string) {
  const normalized = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  if (!normalized) return null;
  if (normalized.includes('pecho')) return 'Pecho';
  if (normalized.includes('espalda') || normalized.includes('dorsal') || normalized.includes('trapec') || normalized.includes('romboid')) return 'Espalda';
  if (normalized.includes('hombro') || normalized.includes('deltoid')) return 'Hombros';
  if (normalized.includes('bicep') || normalized.includes('tricep') || normalized.includes('antebra') || normalized.includes('brazo')) return 'Brazos';
  if (normalized.includes('core') || normalized.includes('abdominal') || normalized.includes('abdomen') || normalized.includes('oblic')) return 'Core';
  if (normalized.includes('pierna') || normalized.includes('cuadri') || normalized.includes('femoral') || normalized.includes('glute') || normalized.includes('pantor') || normalized.includes('gemelo') || normalized.includes('aductor') || normalized.includes('abductor')) return 'Piernas';

  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
}

function buildLatestSessionGroups(session: SessionHistory | null) {
  if (!session) {
    return [];
  }

  const rawGroups = session.exercises.flatMap((exercise) => [exercise.muscle, ...(exercise.secondaryMuscles ?? [])]);
  const uniqueGroups: string[] = [];

  for (const rawGroup of rawGroups) {
    const nextGroup = normalizeMuscleHighlight(rawGroup);
    if (!nextGroup || uniqueGroups.includes(nextGroup)) {
      continue;
    }

    uniqueGroups.push(nextGroup);
  }

  if (uniqueGroups.length > 0) {
    return uniqueGroups.slice(0, 5);
  }

  return session.sessionFocus
    ? session.sessionFocus
        .split(',')
        .map((group) => normalizeMuscleHighlight(group))
        .filter((group): group is string => Boolean(group))
        .slice(0, 5)
    : [];
}

function formatSessionDuration(minutes: number) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  return `${minutes} min`;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { appContext, appSettings, routines, sessionHistory, userProfile, weekDays } = useAppData();
  const [showTrainingPicker, setShowTrainingPicker] = useState(false);
  const activeGoal = normalizeGoal(userProfile.goal).toLowerCase();
  const currentRoutine = routines.find((routine) => routine.id === appContext.activeRoutineId) ?? null;

  const greetingName = getUserFirstName(userProfile);
  const headerSettingsAction = (
    <button
      onClick={() => navigate('/config')}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,201,167,0.22)] bg-[rgba(0,201,167,0.08)] transition-colors hover:bg-[rgba(0,201,167,0.14)]"
      type="button"
      aria-label="Abrir configuración"
    >
      <Settings size={17} className="text-[#00C9A7]" />
    </button>
  );

  if (routines.length === 0) {
    return (
      <div className="flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Header rightContent={headerSettingsAction} />
        <div className="px-5 py-6 text-sm text-[#9BAEC1]">Todavía no hay rutinas cargadas.</div>
      </div>
    );
  }

  if (!currentRoutine) {
    return (
      <div className="flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Header rightContent={headerSettingsAction} />
        <div className="flex flex-col gap-6 px-5 py-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#00C9A7]">
              {appContext.todayLabel}
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Hola, {greetingName}</h1>
            <p className="mt-2 text-sm text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Necesitás elegir una rutina activa para ver tus entrenamientos, el resumen del día y las opciones de inicio.
            </p>
          </div>

          <div className="rounded-3xl border border-[rgba(229,57,53,0.18)] bg-[rgba(229,57,53,0.08)] p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[rgba(229,57,53,0.15)] p-3">
                <Target size={20} className="text-[#FF8A80]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#FF8A80]">
                  Sin rutina seleccionada
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-white">Elegí una rutina para continuar</h2>
                <p className="mt-2 text-sm text-[#D6B9B9]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Andá a la sección Entrenamientos y marcá cuál querés usar como rutina actual.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/workouts')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 font-extrabold text-black shadow-[0_0_15px_rgba(0,201,167,0.15)] transition-colors active:bg-[#009F86]"
            type="button"
          >
            Elegir rutina activa
          </button>

          <button
            onClick={() => navigate('/session', { state: { mode: 'free' } })}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(245,185,66,0.24)] bg-[rgba(245,185,66,0.08)] py-4 font-bold text-[#F5B942] transition-colors active:bg-[rgba(245,185,66,0.14)]"
            type="button"
          >
            Empezar entrenamiento vacío
          </button>
        </div>
      </div>
    );
  }

  const currentDay =
    currentRoutine.days.find((day) => day.name === appContext.currentDayName) ?? currentRoutine.days[0];
  const nextDay =
    currentRoutine.days.find((day) => day.name === appContext.nextDayName) ??
    currentRoutine.days[1] ??
    currentDay;
  const latestSession = sessionHistory[0] ?? null;
  const todaySession =
    sessionHistory.find(
      (session) => session.isoDate === appContext.todayIso && session.routineId === currentRoutine.id
    ) ??
    sessionHistory.find((session) => session.isoDate === appContext.todayIso) ??
    null;
  const featuredDay = todaySession ? nextDay : currentDay;
  const featuredDayGroups = Array.from(
    new Set(
      featuredDay.exercises
        .flatMap((exercise) => [exercise.muscle, ...(exercise.secondaryMuscles ?? [])])
        .map((muscle) => normalizeMuscleHighlight(muscle))
        .filter((muscle): muscle is string => Boolean(muscle))
    )
  ).slice(0, 5);
  const featuredDayLabel = todaySession ? 'Próximo' : 'Hoy';
  const comparisonLabel =
    latestSession?.comparisonDelta !== undefined
      ? `${latestSession.comparisonDelta > 0 ? '+' : ''}${latestSession.comparisonDelta.toFixed(1)}%`
      : null;
  const latestSessionGroups = useMemo(() => buildLatestSessionGroups(latestSession), [latestSession]);
  const totalSets = latestSession?.exercises.reduce((sum, ex) => sum + ex.sets.length, 0) ?? 0;
  const prExercises = latestSession
    ? latestSession.exercises.filter((exercise) => {
        if (exercise.maxKg <= 0) return false;
        const historicalMax = sessionHistory
          .slice(1)
          .flatMap((s) => s.exercises)
          .filter((e) => e.name === exercise.name)
          .reduce((max, e) => Math.max(max, e.maxKg), 0);
        return exercise.maxKg > historicalMax;
      })
    : [];
  const statusMessage = todaySession
    ? `Hoy realizaste ${todaySession.name}. Venís con ${appContext.streakDays} días seguidos de entrenamiento.`
    : `Hoy toca ${currentDay.name}. Venís con ${appContext.streakDays} días seguidos de entrenamiento.`;

  const startWorkout = (dayName: string) => {
    setShowTrainingPicker(false);
    navigate('/session', {
      state: { routineId: currentRoutine.id, dayName },
    });
  };

  return (
    <div className="flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header rightContent={headerSettingsAction} />

      <div className="flex flex-col gap-8 px-5 py-6 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#00C9A7]">
            {appContext.todayLabel}
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Hola, {greetingName}</h1>
          <p className="text-sm text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {statusMessage}
          </p>
        </div>

        <div className="relative">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#00C9A7] to-[#009F86] opacity-20 blur-sm" />
          <button
            onClick={() => setShowTrainingPicker(true)}
            className="relative w-full overflow-hidden rounded-2xl transition-transform active:scale-[0.98]"
            style={{ background: 'linear-gradient(152deg, rgb(27,59,56) 0%, rgb(28,28,28) 100%)' }}
            type="button"
          >
            <div className="flex flex-col items-center gap-3 px-4 py-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(0,201,167,0.3)] bg-[rgba(0,201,167,0.15)] shadow-[0_0_20px_rgba(0,201,167,0.3)]">
                <Play size={24} fill="#00C9A7" className="ml-1 text-[#00C9A7]" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">Iniciar entrenamiento</span>
              <div className="rounded-full border border-[rgba(0,201,167,0.2)] bg-[rgba(0,201,167,0.1)] px-4 py-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#00C9A7]">
                  Rutina activa: {currentRoutine.name}
                </span>
              </div>
            </div>
            <div className="absolute right-6 top-4 opacity-5">
              <svg width="64" height="80" viewBox="0 0 64 80" fill="white">
                <path d="M36 0L0 44h28L16 80l48-52H36L48 0z" />
              </svg>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-2xl border border-[rgba(0,201,167,0.2)]" />
          </button>
        </div>

        <button
          onClick={() => navigate('/session', { state: { mode: 'free' } })}
          className="flex items-center justify-center gap-2 rounded-2xl border border-[rgba(245,185,66,0.24)] bg-[rgba(245,185,66,0.08)] py-4 font-bold text-[#F5B942] transition-colors active:bg-[rgba(245,185,66,0.14)]"
          type="button"
        >
          Empezar entrenamiento vacío
        </button>

        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold tracking-tight text-white">Próximo entrenamiento</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#00C9A7]">
              {featuredDayLabel}
            </span>
          </div>
          <button
            onClick={() => navigate(`/routine/${currentRoutine.id}`)}
            className="relative w-full overflow-hidden rounded-[1.75rem] border border-[rgba(32,51,71,0.95)] bg-[#13263A] p-5 text-left transition-opacity active:opacity-80"
            type="button"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,201,167,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(127,152,255,0.08),transparent_28%)]" />
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#00C9A7]">
                    {featuredDayLabel === 'Hoy' ? 'Sesión sugerida' : 'Próxima sesión'}
                  </p>
                  <h3 className="mt-2 text-[1.75rem] font-extrabold leading-tight tracking-tight text-white">{featuredDay.name}</h3>
                </div>

                <div className="shrink-0 rounded-2xl border border-[rgba(127,152,255,0.18)] bg-[rgba(127,152,255,0.08)] px-4 py-3 text-right">
                  <div className="mb-1 flex items-center justify-end gap-2 text-[#7F98FF]">
                    <Clock size={13} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Tiempo estimado</span>
                  </div>
                  <p className="text-2xl font-extrabold tracking-tight text-white">
                    {currentRoutine.avgMinutes ?? 78} min
                  </p>
                </div>
              </div>

              {featuredDayGroups.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {featuredDayGroups.map((group) => (
                    <span
                      key={group}
                      className="rounded-full border border-[rgba(144,164,184,0.18)] bg-[rgba(32,51,71,0.72)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#90A4B8]"
                    >
                      {group}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {[featuredDay.focus, featuredDay.description].filter(Boolean).join('. ')}
                </p>
              )}

              <div className="flex items-end justify-between gap-4 border-t border-[rgba(255,255,255,0.06)] pt-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[#9BAEC1]">
                    <Dumbbell size={13} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Estructura</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-white">{featuredDay.exercises.length} ejercicios</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#00C9A7]">
                    Rutina activa · {currentRoutine.name}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(0,201,167,0.18)] bg-[rgba(0,201,167,0.08)]">
                  <ChevronRight size={18} className="text-[#00C9A7]" />
                </div>
              </div>
            </div>
          </button>
        </div>

        <WeeklyMuscleLoad />

        <div className="flex flex-col gap-4">
          <span className="text-xl font-bold tracking-tight text-white">Resumen semanal</span>
          <div className="rounded-2xl border border-[#203347] bg-[#111111] p-4">
            <div className="mb-2 flex items-center justify-between">
              {weekDays.map(({ day, completed, missed, active }, index) => (
                <div key={`${day}-${index}`} className="flex flex-col items-center gap-3">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-widest ${
                      active ? 'text-[#00C9A7]' : 'text-[#90A4B8]'
                    }`}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {day}
                  </span>
                  {completed ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,201,167,0.2)] bg-[rgba(0,201,167,0.1)]">
                      <svg width="11" height="8" viewBox="0 0 11 8" fill="#00C9A7">
                        <path
                          d="M1 4L4 7L10 1"
                          stroke="#00C9A7"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    </div>
                  ) : active ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00C9A7] shadow-[0_0_15px_rgba(0,201,167,0.4)]">
                      <svg width="10" height="12" viewBox="0 0 10 12" fill="#0B1F33">
                        <path d="M6 0L0 7h4L2 12l8-7H6L8 0z" />
                      </svg>
                    </div>
                  ) : missed ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(229,57,53,0.3)] bg-[rgba(229,57,53,0.15)]">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1 1l8 8M9 1L1 9" stroke="#E53935" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(144,164,184,0.18)] bg-[rgba(32,51,71,0.72)]">
                      <span className="text-lg font-semibold leading-none text-[#90A4B8]">-</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 px-1">
            <Flame size={16} className="text-orange-400" />
            <span className="text-sm text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
              <span className="font-semibold text-white">{appContext.streakDays} días seguidos</span> - ritmo ideal para sostener tu objetivo de {activeGoal}.
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold tracking-tight text-white">Última sesión</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#90A4B8]">
              {latestSession?.dayLabel ?? 'Sin historial'}
            </span>
          </div>
          {latestSession ? (
            <button
              onClick={() => navigate(`/session-history/${latestSession.id}`)}
              className="relative w-full overflow-hidden rounded-[1.75rem] border border-[rgba(32,51,71,0.95)] bg-[#13263A] p-5 text-left transition-opacity active:opacity-80"
              type="button"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,201,167,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(127,152,255,0.1),transparent_28%)]" />
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#00C9A7]">
                      Sesión completada
                    </p>
                    <h3 className="mt-2 text-[1.75rem] font-extrabold leading-tight tracking-tight text-white">
                      {latestSession.name}
                    </h3>
                  </div>
                  <div className="shrink-0 rounded-2xl border border-[rgba(127,152,255,0.18)] bg-[rgba(127,152,255,0.08)] px-4 py-3 text-right">
                    <div className="mb-1 flex items-center justify-end gap-2 text-[#7F98FF]">
                      <Clock size={13} />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Tiempo</span>
                    </div>
                    <p className="text-2xl font-extrabold tracking-tight text-white">
                      {formatSessionDuration(latestSession.duration)}
                    </p>
                  </div>
                </div>

                {latestSessionGroups.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {latestSessionGroups.map((group) => (
                      <span
                        key={group}
                        className="rounded-full border border-[rgba(144,164,184,0.18)] bg-[rgba(32,51,71,0.72)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#90A4B8]"
                      >
                        {group}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 border-t border-[rgba(255,255,255,0.06)] pt-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6F859A]">Volumen</p>
                    <p className="mt-1 text-base font-bold text-white">
                      {formatCompactWeight(latestSession.volume, appSettings.weightUnit)}
                    </p>
                    {comparisonLabel && (
                      <p className="text-[10px] font-semibold text-[#00C9A7]">{comparisonLabel}</p>
                    )}
                  </div>
                  <div className="border-l border-[rgba(255,255,255,0.06)] pl-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6F859A]">Ejercicios</p>
                    <p className="mt-1 text-base font-bold text-white">{latestSession.exercises.length}</p>
                  </div>
                  <div className="border-l border-[rgba(255,255,255,0.06)] pl-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6F859A]">Series</p>
                    <p className="mt-1 text-base font-bold text-white">{totalSets}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  {prExercises.length > 0 ? (
                    <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-[rgba(245,185,66,0.22)] bg-[rgba(245,185,66,0.08)] px-3 py-2">
                      <TrendingUp size={13} className="shrink-0 text-[#F5B942]" />
                      <span className="truncate text-xs font-semibold text-[#F5B942]">
                        {prExercises.length === 1
                          ? `Nuevo PR · ${prExercises[0].name}`
                          : `${prExercises.length} nuevos PRs esta sesión`}
                      </span>
                    </div>
                  ) : (
                    <div />
                  )}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(0,201,167,0.18)] bg-[rgba(0,201,167,0.08)]">
                    <ChevronRight size={18} className="text-[#00C9A7]" />
                  </div>
                </div>
              </div>
            </button>
          ) : (
            <div className="rounded-2xl border border-[#203347] bg-[#13263A] p-5 text-sm text-[#9BAEC1]">
              Tu historial va a empezar a llenarse cuando completes tu primera sesión real.
            </div>
          )}
        </div>
      </div>

      {showTrainingPicker && (
        <div className="absolute inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowTrainingPicker(false)} />
          <div
            className="relative w-full rounded-t-[2rem] border-t border-[rgba(0,201,167,0.14)] bg-[#1A2D42] px-5 pb-6 pt-5"
            style={{ boxShadow: '0 -20px 60px rgba(0, 0, 0, 0.45)' }}
          >
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#3A3F50]" />

            <div className="mb-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#00C9A7]">
                Seleccionar entrenamiento
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">{currentRoutine.name}</h2>
              <p className="mt-2 text-sm text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Elegí cualquiera de los entrenamientos disponibles dentro de tu rutina actual.
              </p>
            </div>

            <div className="mb-4 rounded-2xl border border-[rgba(0,201,167,0.15)] bg-[rgba(0,201,167,0.06)] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#00C9A7]">
                    Rutina actual
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">{currentRoutine.name}</p>
                </div>
                <span className="rounded-full bg-[#13263A] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#90A4B8]">
                  {currentRoutine.days.length} sesiones
                </span>
              </div>
            </div>

            <div className="flex max-h-[24rem] flex-col gap-3 overflow-y-auto pr-1">
              {currentRoutine.days.map((day, index) => {
                const isSuggested = day.name === currentDay.name;
                const isNext = day.name === nextDay.name;

                return (
                  <button
                    key={`${currentRoutine.id}-${day.name}-${index}`}
                    onClick={() => startWorkout(day.name)}
                    className="rounded-2xl border border-[#2A2F3D] bg-[#13263A] p-4 text-left transition-colors active:bg-[#181C25]"
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-bold tracking-tight text-white">{day.name}</p>
                          {isSuggested && (
                            <span className="rounded-full bg-[rgba(0,201,167,0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#00C9A7]">
                              Sugerido hoy
                            </span>
                          )}
                          {!isSuggested && isNext && (
                            <span className="rounded-full bg-[rgba(127,152,255,0.12)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#7F98FF]">
                              Próximo
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-[#B7B7B7]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {day.focus}
                        </p>
                        {day.description && (
                          <p className="mt-2 text-xs text-[#8F95A3]" style={{ fontFamily: "'Inter', sans-serif" }}>
                            {day.description}
                          </p>
                        )}
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(0,201,167,0.18)] bg-[rgba(0,201,167,0.08)]">
                        <ChevronRight size={18} className="text-[#00C9A7]" />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-[#90A4B8]">
                        <Clock size={12} className="text-[#90A4B8]" />
                        <span style={{ fontFamily: "'Inter', sans-serif" }}>
                          {currentRoutine.avgMinutes ?? 78} min
                        </span>
                      </div>
                      <span className="rounded-full bg-[#1A2D42] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#00C9A7]">
                        {day.exercises.length} ejercicios
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
