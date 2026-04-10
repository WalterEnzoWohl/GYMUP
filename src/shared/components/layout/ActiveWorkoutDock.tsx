import { useEffect, useMemo, useState } from 'react';
import { ChevronUp, Play, Square, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAppData } from '@/core/app-data/AppDataContext';

function formatElapsed(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
}

export function ActiveWorkoutDock() {
  const navigate = useNavigate();
  const { activeWorkout, clearActiveWorkout } = useAppData();
  const [expanded, setExpanded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const currentExerciseName = useMemo(() => {
    if (!activeWorkout) {
      return '';
    }

    const indexedExercise = activeWorkout.exercises[activeWorkout.currentExerciseIndex];
    if (indexedExercise) {
      return indexedExercise.name;
    }

    const firstPendingExercise = activeWorkout.exercises.find((exercise) =>
      exercise.sets.some((set) => !set.completed)
    );

    return firstPendingExercise?.name ?? activeWorkout.sessionFocus;
  }, [activeWorkout]);

  useEffect(() => {
    if (!activeWorkout) {
      return;
    }

    const updateElapsed = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(activeWorkout.startedAt).getTime()) / 1000)));
    };

    updateElapsed();
    const timerId = setInterval(updateElapsed, 1000);
    return () => clearInterval(timerId);
  }, [activeWorkout]);

  if (!activeWorkout) {
    return null;
  }

  const confirmDiscardWorkout = () => {
    clearActiveWorkout();
    setExpanded(false);
    setShowDiscardConfirm(false);
  };

  return (
    <>
      <div className="pointer-events-none absolute inset-x-4 bottom-[5.35rem] z-40">
        <div className="pointer-events-auto overflow-hidden rounded-[1.75rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(28,28,28,0.96)] shadow-[0_12px_36px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div className="flex items-center gap-3 px-3 py-3">
            <button
              onClick={() => setExpanded((value) => !value)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2A2A2A]"
              type="button"
              aria-label={expanded ? 'Cerrar acciones del entrenamiento' : 'Abrir acciones del entrenamiento'}
            >
              <ChevronUp
                size={22}
                className={`text-white transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>

            <button
              onClick={() => navigate('/session')}
              className="min-w-0 flex-1 text-left"
              type="button"
            >
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#54D62C] shadow-[0_0_10px_rgba(84,214,44,0.55)]" />
                <span className="truncate text-2xl font-bold tracking-tight text-white">
                  {activeWorkout.sessionName}
                </span>
                <span className="text-lg font-semibold text-[#D8D8D8]">{formatElapsed(elapsed)}</span>
              </div>
              <p
                className="mt-1 truncate text-sm text-[#90A4B8]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {currentExerciseName}
              </p>
            </button>

            <button
              onClick={() => setShowDiscardConfirm(true)}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2A2A2A]"
              type="button"
              aria-label="Descartar entrenamiento activo"
            >
              <Trash2 size={24} className="text-[#FF5D5D]" />
            </button>
          </div>

          {expanded && (
            <div className="grid grid-cols-2 gap-3 border-t border-[rgba(255,255,255,0.06)] px-3 pb-3 pt-3">
              <button
                onClick={() => navigate('/session')}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-3 font-bold text-black"
                type="button"
              >
                <Play size={16} className="text-black" />
                Reanudar
              </button>
              <button
                onClick={() => navigate('/session', { state: { action: 'finish' } })}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#1A2D42] py-3 font-semibold text-white"
                type="button"
              >
                <Square size={16} className="text-[#00C9A7]" />
                Finalizar
              </button>
            </div>
          )}
        </div>
      </div>

      {showDiscardConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-5">
          <button
            aria-label="Cerrar confirmación de descarte"
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowDiscardConfirm(false)}
            type="button"
          />
          <div className="relative w-full max-w-sm rounded-3xl bg-[#1A2D42] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <h3 className="text-center text-3xl font-bold tracking-tight text-white">
              ¿Estás seguro de descartar el entrenamiento?
            </h3>
            <p
              className="mt-3 text-center text-base text-[#D4D4D4]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Vas a perder la sesión activa y todos los cambios que todavía no guardaste.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={confirmDiscardWorkout}
                className="w-full rounded-2xl bg-[#F43A33] py-4 font-bold text-white"
                type="button"
              >
                Sí, descartar entrenamiento
              </button>
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="w-full rounded-2xl bg-[#2A2A2A] py-4 font-semibold text-white"
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
