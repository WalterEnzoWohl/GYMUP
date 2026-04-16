import type { MouseEvent } from 'react';
import { useState } from 'react';
import { BookOpen, CheckCircle2, Clock, Copy, Pencil, Plus, Settings, Target, Trash2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ActiveWorkoutEditLockModal } from '@/shared/components/layout/ActiveWorkoutEditLockModal';
import { Header } from '@/shared/components/layout/Header';
import type { Routine } from '@/shared/types/models';
import { useAppData } from '@/core/app-data/AppDataContext';
import { formatCompactWeight } from '@/shared/lib/unitUtils';

export default function WorkoutsPage() {
  const navigate = useNavigate();
  const { activeWorkout, appContext, appSettings, copyRoutine, deleteRoutine, routines, sessionHistory, setActiveRoutine } =
    useAppData();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [blockedRoutineId, setBlockedRoutineId] = useState<number | null>(null);
  const [switchingRoutineId, setSwitchingRoutineId] = useState<number | null>(null);

  const activeRoutine = routines.find((routine) => routine.id === appContext.activeRoutineId) ?? null;
  const hasRoutines = routines.length > 0;
  const filteredVolume = activeRoutine
    ? sessionHistory
        .filter((session) => session.routineId === activeRoutine.id)
        .reduce((acc, session) => acc + session.volume, 0)
    : 0;
  const weeklyHours = ((activeRoutine?.daysPerWeek ?? 0) * (activeRoutine?.avgMinutes ?? 0)) / 60;
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

  const copyCurrentRoutine = async (routine: Routine, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    await copyRoutine(routine);
  };

  const deleteCurrentRoutine = async (id: number) => {
    await deleteRoutine(id);
    setDeleteId(null);
  };

  const handleSelectRoutine = async (routineId: number, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setSwitchingRoutineId(routineId);

    try {
      await setActiveRoutine(routineId);
    } finally {
      setSwitchingRoutineId(null);
    }
  };

  const handleEditRoutine = (routineId: number, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (activeWorkout) {
      setBlockedRoutineId(routineId);
      return;
    }

    navigate(`/routine/${routineId}`, { state: { editMode: true } });
  };

  return (
    <div className="relative flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header rightContent={headerSettingsAction} />

      <div className="flex flex-col gap-6 px-5 py-6 pb-4">
        <div className="flex flex-col gap-5">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Entrenamientos</h1>
          <button
            onClick={() => navigate('/routine/new')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 shadow-[0_0_15px_rgba(0,201,167,0.15)] transition-colors active:bg-[#009F86]"
            type="button"
          >
            <Plus size={22} className="text-black" strokeWidth={2.5} />
            <span className="text-base font-extrabold text-black">Crear nueva rutina</span>
          </button>
          <button
            onClick={() => navigate('/exercise-explore')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(0,201,167,0.24)] bg-[rgba(0,201,167,0.08)] py-4 font-bold text-[#00C9A7] transition-colors active:bg-[rgba(0,201,167,0.14)]"
            type="button"
          >
            <BookOpen size={18} />
            Explorar ejercicios
          </button>
        </div>

        {hasRoutines ? (
          activeRoutine ? (
            <div className="rounded-3xl border border-[rgba(0,201,167,0.18)] bg-[linear-gradient(180deg,rgba(0,201,167,0.10),rgba(19,19,19,1))] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#00C9A7]">
                    Rutina actual seleccionada
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">{activeRoutine.name}</h2>
                  <p className="mt-2 text-sm text-[#C8C8C8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {activeRoutine.description ??
                      `${activeRoutine.daysPerWeek} días por semana con ${activeRoutine.days.length} entrenamientos disponibles.`}
                  </p>
                </div>
                <div className="rounded-2xl border border-[rgba(0,201,167,0.2)] bg-[rgba(0,201,167,0.08)] p-3">
                  <CheckCircle2 size={22} className="text-[#00C9A7]" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#13263A] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Clock size={14} className="text-[#00C9A7]" />
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider text-[#777575]"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      Tiempo semanal
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">{weeklyHours.toFixed(1)}</span>
                    <span className="text-sm font-bold italic text-[#9BAEC1]">h</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-[#13263A] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingUp size={14} className="text-[#00C9A7]" />
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider text-[#777575]"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      Volumen histórico
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">
                      {formatCompactWeight(filteredVolume, appSettings.weightUnit)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-[rgba(229,57,53,0.18)] bg-[rgba(229,57,53,0.08)] p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[rgba(229,57,53,0.15)] p-3">
                  <Target size={20} className="text-[#FF8A80]" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#FF8A80]">
                    Sin rutina seleccionada
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-white">
                    Elegí una rutina para empezar
                  </h2>
                  <p className="mt-2 text-sm text-[#D6B9B9]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Seleccioná una de tus rutinas disponibles abajo para actualizar los entrenamientos,
                    el resumen de la rutina y las opciones de inicio.
                  </p>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="rounded-3xl border border-[#203347] bg-[#13263A] p-6 text-sm text-[#9BAEC1]">
            Todavía no tenés rutinas creadas. Creá una nueva para empezar a entrenar.
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white">Cambiar rutina</span>
          <span
            className="rounded-full border border-[rgba(0,201,167,0.18)] bg-[rgba(0,201,167,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#00C9A7]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {routines.length} disponibles
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {routines.map((routine) => {
            const isActive = routine.id === activeRoutine?.id;

            return (
              <button
                key={routine.id}
                onClick={() => navigate(`/routine/${routine.id}`)}
                className={`relative w-full overflow-hidden rounded-2xl text-left transition-colors active:bg-[#1a1a1a] ${
                  isActive
                    ? 'border border-[rgba(0,201,167,0.18)] bg-[rgba(0,201,167,0.06)]'
                    : 'border border-[#203347] bg-[#13263A]'
                }`}
                style={{ boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              >
                <div
                  className="absolute bottom-0 left-0 top-0 w-1 rounded-l-2xl"
                  style={{ background: routine.color }}
                />

                <div className="flex flex-col gap-4 py-5 pl-6 pr-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold leading-tight text-white">{routine.name}</h3>
                        {isActive && (
                          <span className="rounded-full bg-[rgba(0,201,167,0.12)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#00C9A7]">
                            Activa
                          </span>
                        )}
                      </div>
                      <p
                        className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/60"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {routine.daysPerWeek} días / semana
                      </p>
                    </div>
                    <div className="-mr-1 flex items-center gap-1">
                      <button
                        onClick={(event) => void copyCurrentRoutine(routine, event)}
                        className="rounded-xl p-2 transition-colors hover:bg-white/5"
                        type="button"
                      >
                        <Copy size={14} className="text-white/70" />
                      </button>
                      <button
                        onClick={(event) => handleEditRoutine(routine.id, event)}
                        className="rounded-xl p-2 transition-colors hover:bg-white/5"
                        type="button"
                      >
                        <Pencil size={14} className="text-white/70" />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteId(routine.id);
                        }}
                        className="rounded-xl p-2 transition-colors hover:bg-white/5"
                        type="button"
                      >
                        <Trash2 size={14} className="text-[#E53935]/70" />
                      </button>
                    </div>
                  </div>

                  {routine.categories.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {routine.categories.map(({ name, percentage, color }) => (
                        <div key={name} className="flex items-center gap-3">
                          <span
                            className="w-12 text-[10px] font-semibold text-[#777575]"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                          >
                            {name}
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#203347]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${percentage}%`,
                                background: `linear-gradient(to right, ${color}, ${color}aa)`,
                                boxShadow: `0 0 8px ${color}40`,
                              }}
                            />
                          </div>
                          <span
                            className="w-8 text-right text-[10px] font-bold"
                            style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                          >
                            {percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {routine.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-lg bg-[#203347] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#777575]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {routine.avgMinutes && (
                        <div className="text-right">
                          <p className="text-xs font-extrabold text-white">{routine.avgMinutes} MIN</p>
                          <p className="text-[9px] uppercase tracking-wider text-[#777575]">Promedio</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-[#90A4B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {routine.days.length} entrenamientos disponibles
                    </p>
                    <button
                      onClick={(event) => void handleSelectRoutine(routine.id, event)}
                      disabled={isActive || switchingRoutineId === routine.id}
                      className={`rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-colors disabled:opacity-60 ${
                        isActive
                          ? 'border border-[rgba(0,201,167,0.18)] bg-[rgba(0,201,167,0.1)] text-[#00C9A7]'
                          : 'bg-[#00C9A7] text-black active:bg-[#009F86]'
                      }`}
                      type="button"
                    >
                      {isActive
                        ? 'Rutina actual'
                        : switchingRoutineId === routine.id
                        ? 'Cambiando...'
                        : 'Usar rutina'}
                    </button>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {deleteId !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDeleteId(null)} />
          <div className="relative w-full rounded-3xl p-6" style={{ background: '#1A2D42' }}>
            <h3 className="mb-2 text-center text-xl font-bold text-white">Eliminar rutina</h3>
            <p className="mb-6 text-center text-sm text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Esta acción no se puede deshacer. ¿Estás seguro?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => void deleteCurrentRoutine(deleteId)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E53935] py-4 font-bold text-white"
                type="button"
              >
                <Trash2 size={16} />
                Eliminar rutina
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="w-full rounded-2xl bg-[#203347] py-4 font-semibold text-white"
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {blockedRoutineId !== null && activeWorkout && (
        <ActiveWorkoutEditLockModal
          activeWorkoutName={activeWorkout.sessionName}
          onResume={() => navigate('/session')}
          onFinish={() => navigate('/session', { state: { action: 'finish' } })}
          onCancel={() => setBlockedRoutineId(null)}
        />
      )}

    </div>
  );
}
