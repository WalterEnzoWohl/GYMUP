import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { BarChart2, Check, Home, TrendingUp } from 'lucide-react';
import { useAppData } from '../data/AppDataContext';
import { formatWeightNumber, formatWeightWithUnit, getWeightUnitLabel } from '../data/unitUtils';

type CompletedSet = {
  kg: number;
  reps: number;
  rpe: number;
  completed: boolean;
};

type CompletedExercise = {
  name: string;
  sets: CompletedSet[];
};

type PostSessionState = {
  duration?: number;
  volume?: number;
  setsCompleted?: number;
  totalSets?: number;
  exercises?: CompletedExercise[];
  notes?: string;
  sessionName?: string;
  sessionFocus?: string;
  previousVolume?: number;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}

export default function PostSessionPage() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: PostSessionState };
  const { appSettings } = useAppData();

  const duration = state?.duration ?? 2595;
  const volume = state?.volume ?? 12450;
  const setsCompleted = state?.setsCompleted ?? 14;
  const totalSets = state?.totalSets ?? 24;
  const exercises = state?.exercises ?? [];
  const notes = state?.notes ?? '';
  const sessionName = state?.sessionName ?? 'Upper B';
  const sessionFocus = state?.sessionFocus ?? 'Espalda, pecho y hombros';
  const previousVolume = state?.previousVolume ?? 0;
  const weightUnitLabel = getWeightUnitLabel(appSettings.weightUnit);

  const completedSets = exercises.flatMap((exercise) => exercise.sets.filter((set) => set.completed));
  const avgRpe =
    completedSets.length > 0
      ? (completedSets.reduce((acc, set) => acc + set.rpe, 0) / completedSets.length).toFixed(1)
      : '8.0';
  const estimatedKcal = Math.max(380, Math.round(duration / 60 / 5 + setsCompleted * 18));
  const delta =
    previousVolume > 0 ? ((volume - previousVolume) / previousVolume) * 100 : null;
  const deltaText = delta !== null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}% vs anterior` : 'Sin comparación previa';

  useEffect(() => {
    const canvas = document.getElementById('confetti-canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      life: number;
    }> = [];
    const colors = ['#00C9A7', '#FFFFFF', '#7F98FF', '#FFD700', '#FF7F50'];

    for (let index = 0; index < 80; index += 1) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 5 + 3,
        life: 1,
      });
    }

    let frame = 0;
    const animate = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.05;
        particle.life -= 0.008;
        context.globalAlpha = particle.life;
        context.fillStyle = particle.color;
        context.fillRect(particle.x, particle.y, particle.size, particle.size);
      });
      frame += 1;
      if (frame < 150) {
        requestAnimationFrame(animate);
      } else {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animate();
  }, []);

  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{ background: '#102235', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <canvas id="confetti-canvas" className="pointer-events-none absolute inset-0 z-0 h-full w-full" />

      <div className="relative z-10 flex flex-col items-center gap-6 px-5 py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#00C9A7] bg-[rgba(0,201,167,0.15)] shadow-[0_0_30px_rgba(0,201,167,0.3)]">
            <Check size={36} className="text-[#00C9A7]" strokeWidth={3} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Sesión completada</h1>
          <p className="text-sm text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {sessionName} - {sessionFocus}
          </p>
        </div>

        <div className="flex w-full items-center justify-between rounded-2xl border border-[#203347] bg-[#141720] p-5">
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-widest text-[#9BAEC1]">Duración total</p>
            <span className="text-4xl font-bold tracking-tight text-white">{formatTime(duration)}</span>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(0,201,167,0.2)] bg-[rgba(0,201,167,0.1)]">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="12" stroke="#00C9A7" strokeWidth="2" />
              <path d="M16 9v7l4 4" stroke="#00C9A7" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[rgba(0,201,167,0.15)] bg-[#13263A] p-4" style={{ borderLeftWidth: 4 }}>
            <p className="mb-2 text-[10px] uppercase tracking-widest text-[#9BAEC1]">Volumen total</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-normal text-white">
                {formatWeightNumber(volume, appSettings.weightUnit, 0)}
              </span>
              <span className="text-xs font-bold italic text-[#9BAEC1]">{weightUnitLabel}</span>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <TrendingUp size={10} className="text-[#00C9A7]" />
              <span className="text-[10px] font-semibold text-[#00C9A7]">{deltaText}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(127,152,255,0.15)] bg-[#13263A] p-4" style={{ borderLeftWidth: 4 }}>
            <p className="mb-2 text-[10px] uppercase tracking-widest text-[#9BAEC1]">Series</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-normal text-white">{setsCompleted}</span>
              <span className="text-xs font-bold italic text-[#9BAEC1]">/ {totalSets}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[#13263A] p-4">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-[#9BAEC1]">RPE promedio</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-normal text-white">{avgRpe}</span>
              <span className="text-xs font-bold italic text-[#9BAEC1]">/ 10</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[#13263A] p-4">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-[#9BAEC1]">Kcal est.</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-normal text-white">{estimatedKcal}</span>
              <span className="text-xs font-bold italic text-[#9BAEC1]">kcal</span>
            </div>
          </div>
        </div>

        {exercises.length > 0 && (
          <div className="w-full">
            <h2 className="mb-3 text-lg font-bold text-white">Resumen de ejercicios</h2>
            <div className="flex flex-col gap-2">
              {exercises.slice(0, 4).map((exercise) => {
                const doneSets = exercise.sets.filter((set) => set.completed);
                const maxKg = Math.max(...exercise.sets.map((set) => set.kg));
                return (
                  <div
                    key={exercise.name}
                    className="flex items-center justify-between rounded-xl border border-[#203347] bg-[#13263A] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{exercise.name}</p>
                      <p className="mt-0.5 text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {doneSets.length} series completadas
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-[#00C9A7]">
                        {maxKg > 0 ? formatWeightWithUnit(maxKg, appSettings.weightUnit) : 'Peso corporal'}
                      </span>
                      <p className="text-xs text-[#9BAEC1]">máx.</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {notes && (
          <div className="w-full rounded-2xl border border-[#203347] bg-[#13263A] p-4">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-[#9BAEC1]">Notas</p>
            <p className="text-sm text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
              {notes}
            </p>
          </div>
        )}

        <div className="flex w-full flex-col gap-3">
          <button
            onClick={() => navigate('/history')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#203347] bg-[#1A2D42] py-4"
          >
            <BarChart2 size={18} className="text-[#00C9A7]" />
            <span className="font-semibold text-white">Ver historial completo</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 shadow-[0_0_20px_rgba(0,201,167,0.2)]"
          >
            <Home size={18} className="text-black" />
            <span className="text-base font-bold text-black">Volver al inicio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
