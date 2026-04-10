import { useParams } from 'react-router';
import { Trophy, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { Header } from '@/shared/components/layout/Header';
import { getMuscleProgressInsights } from '@/core/domain/profileInsights';
import { useAppData } from '@/core/app-data/AppDataContext';

const weekLabels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];

export default function MuscleProgressPage() {
  const { id } = useParams();
  const { appContext, sessionHistory } = useAppData();
  const muscleProgress = getMuscleProgressInsights(sessionHistory, appContext.todayIso);
  const muscle = muscleProgress.find((item) => item.id === id) ?? muscleProgress[0];

  if (!muscle) {
    return (
      <div className="flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Header showBack title="Progreso" />
        <div className="px-5 py-5 text-sm text-[#9BAEC1]">No hay datos para ese grupo muscular.</div>
      </div>
    );
  }

  const chartData = muscle.weeklyDirectCounts.map((directCount, index) => ({
    week: weekLabels[index],
    directos: directCount,
  }));

  const maxDirect = Math.max(...muscle.weeklyDirectCounts);
  const minDirect = Math.min(...muscle.weeklyDirectCounts);
  const trend =
    (muscle.weeklyDirectCounts[muscle.weeklyDirectCounts.length - 1] ?? 0) -
    (muscle.weeklyDirectCounts[0] ?? 0);
  const missingDirectWork = Math.max(muscle.monthlyTarget - muscle.monthlyDirectCount, 0);

  return (
    <div className="flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header showBack title={`Progreso - ${muscle.name}`} />

      <div className="flex flex-col gap-5 px-5 py-5 pb-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">{muscle.name}</h1>
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{ background: `${muscle.color}20`, border: `1px solid ${muscle.color}40` }}
            >
              <span className="text-base font-bold" style={{ color: muscle.color }}>
                Niv. {muscle.level}
              </span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-xs font-semibold uppercase tracking-widest text-[#9BAEC1]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Ejercicios directos del mes
              </span>
              <span className="text-xs font-bold text-[#00C9A7]">
                {muscle.monthlyDirectCount} / {muscle.monthlyTarget}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#203347]">
              <div
                className="relative h-full rounded-full"
                style={{
                  width: `${muscle.progressPercent}%`,
                  background: 'linear-gradient(135deg, #00C9A7 0%, #00A894 100%)',
                }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-3 rounded-full bg-white/30" />
              </div>
            </div>
            <p className="mt-1 text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
              {missingDirectWork > 0
                ? `Faltan ${missingDirectWork} ejercicios directos para completar la referencia mensual.`
                : `Ya superaste la referencia mensual por ${muscle.monthlyDirectCount - muscle.monthlyTarget} ejercicios.`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Max. semanal', value: maxDirect.toString(), unit: 'directos' },
            { label: 'Min. semanal', value: minDirect.toString(), unit: 'directos' },
            { label: 'Tendencia', value: `${trend >= 0 ? '+' : ''}${trend}`, unit: 'directos', color: '#00C9A7' },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="rounded-xl border border-[#203347] bg-[#13263A] p-3">
              <p
                className="mb-1 text-[10px] uppercase tracking-wider text-[#9BAEC1]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {label}
              </p>
              <span className="text-base font-bold" style={{ color: color ?? 'white' }}>
                {value}
              </span>
              {unit && <span className="ml-1 text-xs text-[#9BAEC1]">{unit}</span>}
            </div>
          ))}
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-[#00C9A7]" />
            <h2 className="text-lg font-bold text-white">Estimulo directo semanal (8 semanas)</h2>
          </div>
          <div className="rounded-2xl border border-[#203347] bg-[#13263A] p-4">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#203347" />
                <XAxis
                  dataKey="week"
                  tick={{ fill: '#9BAEC1', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9BAEC1', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1A2D42',
                    border: '1px solid #203347',
                    borderRadius: 12,
                    color: 'white',
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${value} ejercicios`, 'Directos']}
                />
                <Line
                  type="monotone"
                  dataKey="directos"
                  stroke="#00C9A7"
                  strokeWidth={2}
                  dot={{ fill: '#00C9A7', r: 4 }}
                  activeDot={{ r: 6, fill: '#00C9A7', stroke: '#003830', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-[#FFD700]" />
            <h2 className="text-lg font-bold text-white">Records personales</h2>
          </div>
          {muscle.exercises.length > 0 ? (
            <div className="flex flex-col gap-3">
              {muscle.exercises.map((exercise, index) => (
                <div
                  key={exercise.name}
                  className="flex items-center justify-between rounded-2xl border border-[#203347] bg-[#13263A] px-4 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{exercise.name}</p>
                    <p className="mt-0.5 text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Record personal
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-bold text-[#00C9A7]">{exercise.pr > 0 ? exercise.pr : 'PC'}</span>
                    <span className="text-sm text-[#9BAEC1]">{exercise.pr > 0 ? exercise.unit : ''}</span>
                    {index === 0 && <Trophy size={14} className="ml-1 text-[#FFD700]" />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#203347] bg-[#13263A] px-4 py-4 text-sm text-[#9BAEC1]">
              Todavia no hay records personales para este grupo muscular. Se van a generar cuando empieces a registrar sesiones reales.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
