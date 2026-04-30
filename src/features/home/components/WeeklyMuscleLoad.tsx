import { useEffect, useState } from 'react';
import { useAppData } from '@/core/app-data/AppDataContext';
import type { SessionHistory, WeekDayStatus } from '@/shared/types/models';

const SVG_URL = '/cuerpo_completo.svg';

// App muscle name → SVG group IDs
const MUSCLE_TO_SVG: Record<string, string[]> = {
  Pecho: ['pecho_posterior'],
  Bíceps: ['biceps_anterior'],
  Tríceps: ['triceps_anterior', 'triceps_posterior'],
  Hombros: ['hombros_anterior', 'hombros_posterior'],
  Trapecios: ['trapecio_superior_anterior', 'trapecio_superior'],
  'Espalda alta': ['trapecio_medio', 'trapecio_inferior', 'infraespinosos_posterior'],
  Espalda: ['dorsales_posterior'],
  Lumbar: ['lumbar_posterior'],
  Core: ['recto_abdominal_anterior', 'oblicuos_anterior', 'oblicuos_externos_posterior'],
  Cuádriceps: ['cuadriceps_anterior'],
  Isquios: ['isquiotibial_posterior'],
  Glúteos: ['Gluteos_posterior'],
  Pantorrillas: ['gemelos_anterior', 'soleo_anterior_interno_externo', 'gemelos_posterior', 'soleo_posterior_interno_externo'],
  Antebrazos: ['antebrazo_anterior', 'antebrazos_posterior'],
  Abductores: ['abductor_posterior'],
  Aductores: ['aductor_posterior'],
  Cuello: ['cuello_anterior'],
};

// Non-muscle body parts that need a base visible color on dark bg
const NON_MUSCLE_IDS = [
  'cabeza_anterior', 'manos_anterior', 'rodillas_anterior', 'pies_anteriores', 'cadera',
  'cabeza_posterior', 'manos_posterior', 'rodillas_posterior', 'pies_posteriores', 'codos_posterior', 'talon',
];

const ALL_MUSCLE_IDS = Object.values(MUSCLE_TO_SVG).flat();

function getMuscleColor(sets: number): string {
  if (sets <= 0) return '#FFFFFF';
  if (sets <= 3) return '#D8FFF5';
  if (sets <= 6) return '#A8F7DF';
  if (sets <= 9) return '#63EFC2';
  if (sets <= 12) return '#16D9A8';
  return '#00B884';
}

function buildColoredSvg(svgText: string, muscleSets: Record<string, number>): string {
  const rules: string[] = [];

  // Subtle base color for anatomical landmarks (head, hands, feet, knees, elbows)
  for (const id of NON_MUSCLE_IDS) {
    rules.push(`#${id} path{fill:#1C3C57}`);
  }

  // Default all muscle groups to white (0 sets)
  for (const id of ALL_MUSCLE_IDS) {
    rules.push(`#${id} path{fill:#FFFFFF}`);
  }

  // Override with color per sets count
  for (const [muscle, svgIds] of Object.entries(MUSCLE_TO_SVG)) {
    if (svgIds.length === 0) continue;
    const sets = muscleSets[muscle] ?? 0;
    if (sets <= 0) continue;
    const color = getMuscleColor(sets);
    for (const id of svgIds) {
      rules.push(`#${id} path{fill:${color}}`);
    }
  }

  const styleBlock = `<style>${rules.join('')}</style>`;

  return svgText
    .replace(/(<svg[^>]*)\bwidth="[^"]*"/, '$1width="100%"')
    .replace(/(<svg[^>]*)\bheight="[^"]*"/, '$1height="auto"')
    .replace(/(<svg[^>]*>)/, `$1${styleBlock}`);
}

function normalizeMuscle(muscle: string): string | null {
  const n = muscle.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  if (n.includes('pecho') || n.includes('pectoral')) return 'Pecho';
  if (n.includes('hombro') || n.includes('deltoid')) return 'Hombros';
  if (n.includes('bicep')) return 'Bíceps';
  if (n.includes('tricep')) return 'Tríceps';
  if (n.includes('antebraz')) return 'Antebrazos';
  if (n.includes('espalda alta')) return 'Espalda alta';
  if (n.includes('trapecio') || n.includes('trapez')) return 'Trapecios';
  if (n.includes('espalda') || n.includes('dorsal')) return 'Espalda';
  if (n.includes('core') || n.includes('abdomin') || n.includes('oblic')) return 'Core';
  if (n.includes('lumbar')) return 'Lumbar';
  if (n.includes('cuadricep')) return 'Cuádriceps';
  if (n.includes('isquio') || n.includes('femoral')) return 'Isquios';
  if (n.includes('glute')) return 'Glúteos';
  if (n.includes('abductor')) return 'Abductores';
  if (n.includes('aductor')) return 'Aductores';
  if (n.includes('pantorrilla') || n.includes('gemelo') || n.includes('soleo')) return 'Pantorrillas';
  if (n.includes('cuello')) return 'Cuello';
  return null;
}

function buildWeeklyMuscleSets(
  sessionHistory: SessionHistory[],
  weekDays: WeekDayStatus[],
): Record<string, number> {
  const weekIsos = new Set(weekDays.map((d) => d.isoDate));
  const result: Record<string, number> = {};

  for (const session of sessionHistory) {
    if (!weekIsos.has(session.isoDate)) continue;
    for (const exercise of session.exercises) {
      const muscle = normalizeMuscle(exercise.muscle);
      if (muscle) {
        result[muscle] = (result[muscle] ?? 0) + exercise.sets.length;
      }
    }
  }

  return result;
}

const LEGEND = [
  { label: '0', color: '#FFFFFF' },
  { label: '1–3', color: '#D8FFF5' },
  { label: '4–6', color: '#A8F7DF' },
  { label: '7–9', color: '#63EFC2' },
  { label: '10–12', color: '#16D9A8' },
  { label: '13+', color: '#00B884' },
];

let svgCache: string | null = null;

export function WeeklyMuscleLoad() {
  const { sessionHistory, weekDays } = useAppData();
  const [svgHtml, setSvgHtml] = useState<string | null>(null);

  const muscleSets = buildWeeklyMuscleSets(sessionHistory, weekDays);
  const muscleSetsKey = JSON.stringify(muscleSets);

  useEffect(() => {
    if (svgCache) {
      setSvgHtml(buildColoredSvg(svgCache, muscleSets));
      return;
    }
    fetch(SVG_URL)
      .then((r) => r.text())
      .then((text) => {
        svgCache = text;
        setSvgHtml(buildColoredSvg(text, muscleSets));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (svgCache) {
      setSvgHtml(buildColoredSvg(svgCache, muscleSets));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muscleSetsKey]);

  const totalSets = Object.values(muscleSets).reduce((s, v) => s + v, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xl font-bold tracking-tight text-white">Carga muscular</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-[#00C9A7]">
          Esta semana
        </span>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-[rgba(32,51,71,0.95)] bg-[#0B1F33]">
        {svgHtml ? (
          <div
            className="pointer-events-none w-full select-none"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled SVG injection
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        ) : (
          <div className="h-60 animate-pulse rounded-t-[1.75rem] bg-[#13263A]" />
        )}

        {/* Legend */}
        <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] px-5 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6F859A]">
            Series
          </span>
          <div className="flex items-center gap-3">
            {LEGEND.map(({ label, color }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div
                  className="h-2.5 w-2.5 rounded-full border border-[rgba(255,255,255,0.12)]"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[9px] font-medium text-[#6F859A]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {totalSets === 0 && (
          <p className="pb-3 text-center text-xs text-[#4A6478]">
            Sin series registradas esta semana
          </p>
        )}
      </div>
    </div>
  );
}
