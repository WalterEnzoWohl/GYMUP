import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Clock, Filter, Pencil, TrendingUp } from 'lucide-react';
import { ActiveWorkoutEditLockModal } from '@/shared/components/layout/ActiveWorkoutEditLockModal';
import { Header } from '@/shared/components/layout/Header';
import { useAppData } from '@/core/app-data/AppDataContext';
import type { SessionHistory } from '@/shared/types/models';
import { formatCompactWeight } from '@/shared/lib/unitUtils';

const muscles = ['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Biceps', 'Triceps', 'Gluteos', 'Abdominales'];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function matchesMuscle(session: SessionHistory, selectedMuscle: string) {
  if (selectedMuscle === 'Todos') {
    return true;
  }

  const haystack = [
    session.name,
    session.muscle,
    ...session.exercises.map((exercise: { muscle: string }) => exercise.muscle),
  ]
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const keywordMap: Record<string, string[]> = {
    Pecho: ['pecho'],
    Espalda: ['espalda'],
    Piernas: ['piernas', 'cuadriceps', 'isquios', 'gluteos', 'gemelos', 'abductores'],
    Hombros: ['hombros', 'deltoides'],
    Biceps: ['biceps'],
    Triceps: ['triceps'],
    Gluteos: ['gluteos'],
    Abdominales: ['abdominales'],
  };

  return (keywordMap[selectedMuscle] ?? [normalizeText(selectedMuscle)]).some((keyword) =>
    haystack.includes(keyword)
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { activeWorkout, appSettings, sessionHistory } = useAppData();
  const months = Array.from(new Set(sessionHistory.map((session) => session.isoDate.slice(0, 7)))).sort(
    (a, b) => b.localeCompare(a)
  );
  const [selectedMonth, setSelectedMonth] = useState(months[0] ?? '');
  const [selectedMuscle, setSelectedMuscle] = useState('Todos');
  const [blockedSessionId, setBlockedSessionId] = useState<number | null>(null);

  const filtered = sessionHistory.filter(
    (session) =>
      (selectedMonth ? session.isoDate.startsWith(selectedMonth) : true) && matchesMuscle(session, selectedMuscle)
  );

  const totalVolume = filtered.reduce((acc, session) => acc + session.volume, 0);
  const totalTime = filtered.reduce((acc, session) => acc + session.duration, 0);
  const avgRpe =
    filtered.length > 0
      ? (filtered.reduce((acc, session) => acc + session.avgRpe, 0) / filtered.length).toFixed(1)
      : '0.0';

  const monthLabels = Object.fromEntries(
    months.map((monthKey) => [
      monthKey,
      new Intl.DateTimeFormat('es-AR', {
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Argentina/Buenos_Aires',
      })
        .format(new Date(`${monthKey}-01T12:00:00-03:00`))
        .replace(/^\w/, (letter) => letter.toUpperCase()),
    ])
  );

  const handleEditSession = (sessionId: number) => {
    if (activeWorkout) {
      setBlockedSessionId(sessionId);
      return;
    }

    navigate('/session', {
      state: {
        mode: 'history-edit',
        sessionId,
      },
    });
  };

  return (
    <div className="relative flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header showBack title="Historial completo" />

      <div className="flex flex-col gap-5 px-5 py-5 pb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#203347] bg-[#13263A] p-4">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp size={12} className="text-[#00C9A7]" />
              <p className="text-[10px] uppercase tracking-widest text-[#9BAEC1]">Volumen</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-white">{formatCompactWeight(totalVolume, appSettings.weightUnit)}</span>
            </div>
          </div>
          <div className="rounded-xl border border-[#203347] bg-[#13263A] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Clock size={12} className="text-[#00C9A7]" />
              <p className="text-[10px] uppercase tracking-widest text-[#9BAEC1]">Tiempo</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-white">{(totalTime / 60).toFixed(1)}h</span>
            </div>
          </div>
          <div className="rounded-xl border border-[#203347] bg-[#13263A] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Filter size={12} className="text-[#00C9A7]" />
              <p className="text-[10px] uppercase tracking-widest text-[#9BAEC1]">RPE prom.</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-white">{avgRpe}</span>
              <span className="text-xs italic text-[#9BAEC1]">/ 10</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {months.map((monthKey) => (
            <button
              key={monthKey}
              onClick={() => setSelectedMonth(monthKey)}
              className={`flex-shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all ${
                selectedMonth === monthKey
                  ? 'bg-[#00C9A7] text-black'
                  : 'border border-[#203347] bg-[#1A2D42] text-[#9BAEC1]'
              }`}
            >
              {monthLabels[monthKey] ?? monthKey}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <Filter size={12} className="text-[#9BAEC1]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#9BAEC1]">
              Filtrar por músculo
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {muscles.map((muscle) => (
              <button
                key={muscle}
                onClick={() => setSelectedMuscle(muscle)}
                className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedMuscle === muscle ? 'bg-[#00C9A7] text-black' : 'bg-[#203347] text-[#9BAEC1]'
                }`}
              >
                {muscle}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#203347] bg-[#13263A] p-6 text-center">
              <p className="text-sm text-[#9BAEC1]">No hay sesiones que coincidan con el filtro.</p>
            </div>
          ) : (
            filtered.map((session) => {
              const deltaText =
                session.comparisonDelta !== undefined
                  ? `${session.comparisonDelta > 0 ? '+' : ''}${session.comparisonDelta.toFixed(1)}%`
                  : null;

              return (
                <div
                  key={session.id}
                  className="flex items-center gap-3 rounded-2xl border border-[#203347] bg-[#13263A] px-4 py-4 transition-colors active:bg-[#1a1a1a]"
                >
                  <button
                    onClick={() => navigate(`/session-history/${session.id}`)}
                    className="flex min-w-0 flex-1 items-center gap-4 text-left"
                    type="button"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[rgba(0,201,167,0.2)] bg-[rgba(0,201,167,0.1)]">
                      <TrendingUp size={16} className="text-[#00C9A7]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{session.name}</p>
                      <p className="mt-0.5 text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {session.date} - {session.duration} min - {session.muscle}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block text-sm font-bold text-[#00C9A7]">{session.kcal} kcal</span>
                      <span className="text-xs text-[#9BAEC1]">
                        {formatCompactWeight(session.volume, appSettings.weightUnit)}
                        {deltaText ? ` - ${deltaText}` : ''}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleEditSession(session.id)}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-[rgba(127,152,255,0.2)] bg-[rgba(127,152,255,0.08)] text-[#D8E4FF]"
                    type="button"
                    aria-label={`Editar ${session.name}`}
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {blockedSessionId !== null && activeWorkout && (
        <ActiveWorkoutEditLockModal
          activeWorkoutName={activeWorkout.sessionName}
          eyebrow="Edición bloqueada"
          title="No podés editar este entrenamiento ahora"
          description="Ya tenés un entrenamiento en curso. Para evitar inconsistencias entre esa sesión activa y tu historial, primero volvé a entrenar o cerrá esa sesión."
          subjectLabel="Entrenamiento activo"
          onResume={() => navigate('/session')}
          onFinish={() => navigate('/session', { state: { action: 'finish' } })}
          onCancel={() => setBlockedSessionId(null)}
        />
      )}
    </div>
  );
}
