import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { BarChart2, Clock, Pencil, TrendingUp, Zap } from 'lucide-react';
import { ActiveWorkoutEditLockModal } from '../components/ActiveWorkoutEditLockModal';
import { Header } from '../components/Header';
import { useAppData } from '../data/AppDataContext';
import { formatWeightNumber, formatWeightWithUnit, getWeightUnitLabel } from '../data/unitUtils';

export default function SessionHistoryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { activeWorkout, appSettings, sessionHistory } = useAppData();
  const [showEditLockModal, setShowEditLockModal] = useState(false);
  const session = sessionHistory.find((item) => item.id === Number(id)) ?? sessionHistory[0];
  const weightUnitLabel = getWeightUnitLabel(appSettings.weightUnit);

  if (!session) {
    return (
      <div className="flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Header showBack title="Sesion" />
        <div className="px-5 py-5 text-sm text-[#9BAEC1]">No se encontró la sesión.</div>
      </div>
    );
  }

  const delta = session.comparisonDelta ?? 0;
  const deltaText = `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`;
  const currentBar = delta >= 0 ? 88 : 74;
  const previousBar = delta >= 0 ? 78 : 84;
  const handleEditSession = () => {
    if (activeWorkout) {
      setShowEditLockModal(true);
      return;
    }

    navigate('/session', {
      state: {
        mode: 'history-edit',
        sessionId: session.id,
      },
    });
  };

  return (
    <div className="relative flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header
        showBack
        title={session.name}
        rightContent={
          <button
            onClick={handleEditSession}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(127,152,255,0.2)] bg-[rgba(127,152,255,0.08)] text-[#D8E4FF]"
            type="button"
            aria-label="Editar sesión"
          >
            <Pencil size={16} />
          </button>
        }
      />

      <div className="flex flex-col gap-5 px-5 py-5 pb-6">
        <div>
          <p
            className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#9BAEC1]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {session.dayLabel} - {session.date}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">{session.name}</h1>
          <p className="mt-1 text-sm text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {session.muscle}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-2xl border border-[rgba(0,201,167,0.2)] bg-[#13263A] p-4"
            style={{ borderLeftWidth: 4 }}
          >
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp size={14} className="text-[#00C9A7]" />
              <p className="text-[10px] uppercase tracking-widest text-[#9BAEC1]">Volumen</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-normal text-white">
                {formatWeightNumber(session.volume, appSettings.weightUnit, 0)}
              </span>
              <span className="text-xs font-bold italic text-[#9BAEC1]">{weightUnitLabel}</span>
            </div>
          </div>
          <div
            className="rounded-2xl border border-[rgba(127,152,255,0.2)] bg-[#13263A] p-4"
            style={{ borderLeftWidth: 4 }}
          >
            <div className="mb-2 flex items-center gap-2">
              <Clock size={14} className="text-[#7F98FF]" />
              <p className="text-[10px] uppercase tracking-widest text-[#9BAEC1]">Duracion</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-normal text-white">{session.duration}</span>
              <span className="text-xs font-bold italic text-[#9BAEC1]">min</span>
            </div>
          </div>
          <div className="rounded-2xl bg-[#13263A] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Zap size={14} className="text-orange-400" />
              <p className="text-[10px] uppercase tracking-widest text-[#9BAEC1]">Calorias</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-normal text-white">{session.kcal}</span>
              <span className="text-xs font-bold italic text-[#9BAEC1]">kcal</span>
            </div>
          </div>
          <div className="rounded-2xl bg-[#13263A] p-4">
            <div className="mb-2 flex items-center gap-2">
              <BarChart2 size={14} className="text-[#00C9A7]" />
              <p className="text-[10px] uppercase tracking-widest text-[#9BAEC1]">RPE prom.</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-normal text-white">{session.avgRpe.toFixed(1)}</span>
              <span className="text-xs font-bold italic text-[#9BAEC1]">/ 10</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#203347] bg-[#13263A] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#9BAEC1]">Vs. sesión anterior</p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="mb-1 h-2 overflow-hidden rounded-full bg-[#203347]">
                <div className="h-full rounded-full bg-[#00C9A7]" style={{ width: `${currentBar}%` }} />
              </div>
              <p className="text-sm font-bold text-white">Sesion actual</p>
            </div>
            <div className={`text-sm font-bold ${delta >= 0 ? 'text-[#00C9A7]' : 'text-[#E53935]'}`}>
              {deltaText}
            </div>
            <div className="flex-1">
              <div className="mb-1 h-2 overflow-hidden rounded-full bg-[#203347]">
                <div className="h-full rounded-full bg-[#9BAEC1]" style={{ width: `${previousBar}%` }} />
              </div>
              <p className="text-sm text-[#9BAEC1]">Sesion anterior</p>
            </div>
          </div>
        </div>

        {session.exercises.length > 0 ? (
          <div>
            <h2 className="mb-3 text-xl font-bold tracking-tight text-white">Ejercicios</h2>
            <div className="flex flex-col gap-3">
              {session.exercises.map((exercise) => (
                <div
                  key={`${session.id}-${exercise.name}`}
                  className="overflow-hidden rounded-2xl border border-[#203347] bg-[#13263A]"
                >
                  <div className="flex items-center justify-between border-b border-[#203347] px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{exercise.name}</p>
                      <p className="mt-0.5 text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        Max: {exercise.maxKg > 0 ? formatWeightWithUnit(exercise.maxKg, appSettings.weightUnit) : 'Peso corporal'}
                        {exercise.implement ? ` - ${exercise.implement}` : ''}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[rgba(0,201,167,0.2)] bg-[rgba(0,201,167,0.1)] px-2 py-1">
                      <span className="text-xs font-bold text-[#00C9A7]">{exercise.sets.length} series</span>
                    </div>
                  </div>

                  {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-4 py-3">
                      {exercise.secondaryMuscles.map((muscle) => (
                        <span
                          key={`${exercise.name}-${muscle}`}
                          className="rounded-full bg-[#203347] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#90A4B8]"
                        >
                          {muscle}
                        </span>
                      ))}
                    </div>
                  )}

                  <div>
                    <div className="grid grid-cols-4 gap-2 bg-[rgba(255,255,255,0.02)] px-4 py-2">
                      {['#', 'KG', 'Reps', 'RPE'].map((column) => (
                        <span
                          key={`${exercise.name}-${column}`}
                          className="text-center text-[10px] font-semibold uppercase tracking-wider text-[#9BAEC1]"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          {column}
                        </span>
                      ))}
                    </div>
                    {exercise.sets.map((set, index) => (
                      <div
                        key={`${exercise.name}-${index}`}
                        className="grid grid-cols-4 gap-2 border-t border-[rgba(255,255,255,0.03)] px-4 py-2"
                      >
                        <span className="text-center text-xs text-[#9BAEC1]">{index + 1}</span>
                        <span className="text-center text-xs font-medium text-white">
                          {set.kg > 0 ? formatWeightNumber(set.kg, appSettings.weightUnit) : '-'}
                        </span>
                        <span className="text-center text-xs font-medium text-white">{set.reps}</span>
                        <span className="text-center text-xs text-[#9BAEC1]">{set.rpe ?? '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#203347] bg-[#13263A] p-6 text-center">
            <p className="text-sm text-[#9BAEC1]">No hay detalles de ejercicios para esta sesión.</p>
          </div>
        )}
      </div>

      {showEditLockModal && activeWorkout && (
        <ActiveWorkoutEditLockModal
          activeWorkoutName={activeWorkout.sessionName}
          eyebrow="Edición bloqueada"
          title="No podés editar este entrenamiento ahora"
          description="Ya tenés un entrenamiento en curso. Para evitar inconsistencias entre esa sesión activa y tu historial, primero volvé a entrenar o cerrá esa sesión."
          subjectLabel="Entrenamiento activo"
          onResume={() => navigate('/session')}
          onFinish={() => navigate('/session', { state: { action: 'finish' } })}
          onCancel={() => setShowEditLockModal(false)}
        />
      )}
    </div>
  );
}
