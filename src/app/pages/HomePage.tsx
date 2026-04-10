import { useState } from 'react';
import { ChevronRight, Clock, Flame, Play, Settings, Target, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { normalizeGoal } from '../data/profileInsights';
import { useAppData } from '../data/AppDataContext';
import { formatWeightNumber, getWeightUnitLabel } from '../data/unitUtils';
import { getUserFirstName } from '../data/userProfileUtils';

function buildFocusPreview(day: { exercises: Array<{ muscle: string }> }) {
  const counts = day.exercises.reduce<Record<string, number>>((acc, exercise) => {
    acc[exercise.muscle] = (acc[exercise.muscle] ?? 0) + 1;
    return acc;
  }, {});

  const entries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const maxCount = entries[0]?.[1] ?? 1;

  return entries.map(([name, count]) => ({
    name,
    width: `${Math.max(32, Math.round((count / maxCount) * 100))}%`,
  }));
}

export default function HomePage() {
  const navigate = useNavigate();
  const { appContext, appSettings, routines, sessionHistory, userProfile, weekDays } = useAppData();
  const [showTrainingPicker, setShowTrainingPicker] = useState(false);
  const activeGoal = normalizeGoal(userProfile.goal).toLowerCase();
  const currentRoutine = routines.find((routine) => routine.id === appContext.activeRoutineId) ?? null;
  const weightUnitLabel = getWeightUnitLabel(appSettings.weightUnit);
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
  const featuredDayPreview = buildFocusPreview(featuredDay);
  const featuredDayLabel = todaySession ? 'Próximo' : 'Hoy';
  const comparisonLabel =
    latestSession?.comparisonDelta !== undefined
      ? `${latestSession.comparisonDelta > 0 ? '+' : ''}${latestSession.comparisonDelta.toFixed(1)}%`
      : null;
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
            className="w-full rounded-2xl border border-[#203347] bg-[#111111] p-5 text-left transition-colors active:bg-[#1a1a1a]"
            type="button"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold tracking-tight text-white">{featuredDay.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Clock size={11} className="text-[#90A4B8]" />
                  <span className="text-sm text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {currentRoutine.avgMinutes ?? 78} min - {featuredDay.exercises.length} ejercicios
                  </span>
                </div>
                <p
                  className="mt-3 max-w-[18rem] text-sm text-[#D4D4D4]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {featuredDay.focus}. {featuredDay.description}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[rgba(0,201,167,0.2)] bg-[rgba(0,201,167,0.1)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20.5 6.5a4.5 4.5 0 0 1-6.36 0L12 4.36l2.14 2.14A4.5 4.5 0 0 1 20.5 6.5zM3.5 6.5a4.5 4.5 0 0 0 6.36 0L12 4.36 9.86 6.5A4.5 4.5 0 0 0 3.5 6.5z"
                    stroke="#00C9A7"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3.5 17.5a4.5 4.5 0 0 0 6.36 0L12 19.64l-2.14-2.14A4.5 4.5 0 0 0 3.5 17.5zM20.5 17.5a4.5 4.5 0 0 1-6.36 0L12 19.64l2.14-2.14A4.5 4.5 0 0 1 20.5 17.5z"
                    stroke="#00C9A7"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line x1="12" y1="4.36" x2="12" y2="19.64" stroke="#00C9A7" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div className="mb-4 flex flex-col gap-3">
              {featuredDayPreview.map(({ name, width }) => (
                <div key={name} className="flex items-center justify-between gap-3">
                  <span className="w-24 text-sm text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {name}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#203347]">
                    <div
                      className="h-full rounded-full"
                      style={{ width, background: 'linear-gradient(to right, #00C9A7, #009F86)' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {featuredDay.exercises.slice(0, 3).map((exercise) => (
                <span
                  key={exercise.id}
                  className="rounded-full border border-[rgba(0,201,167,0.18)] bg-[rgba(0,201,167,0.08)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#00C9A7]"
                >
                  {exercise.name}
                </span>
              ))}
            </div>
          </button>
        </div>

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
                    <div className="h-10 w-10 rounded-full bg-[#203347]" />
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
              className="grid w-full grid-cols-2 gap-4 transition-opacity active:opacity-80"
              type="button"
            >
              <div
                className="relative overflow-hidden rounded-xl border border-[rgba(0,201,167,0.2)] bg-[#13263A] p-5 text-left"
                style={{ borderLeftWidth: 4 }}
              >
                <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#9BAEC1]">
                  Volumen total
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-normal text-white">
                    {formatWeightNumber(latestSession.volume, appSettings.weightUnit, 0)}
                  </span>
                  <span className="text-sm font-bold italic text-[#9BAEC1]">{weightUnitLabel}</span>
                </div>
                {comparisonLabel && (
                  <div className="mt-1 flex items-center gap-1">
                    <TrendingUp size={12} className="text-[#00C9A7]" />
                    <span className="text-xs font-semibold text-[#00C9A7]">{comparisonLabel} vs anterior</span>
                  </div>
                )}
                <div className="absolute right-[-10px] top-[-10px] opacity-5">
                  <TrendingUp size={60} className="text-white" />
                </div>
              </div>

              <div
                className="relative overflow-hidden rounded-xl border border-[rgba(127,152,255,0.2)] bg-[#13263A] p-5 text-left"
                style={{ borderLeftWidth: 4 }}
              >
                <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#9BAEC1]">
                  Tiempo
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-3xl font-normal text-white">{latestSession.duration}:00</span>
                </div>
                <div className="mt-1 text-xs text-[#9BAEC1]">{latestSession.name}</div>
                <div className="absolute right-[-10px] top-[-10px] opacity-5">
                  <Clock size={60} className="text-white" />
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
