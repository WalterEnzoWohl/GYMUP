import type { SessionHistory } from '@/shared/types/models';
import { addDays, parseIsoDate } from '@/shared/lib/dateUtils';

const MONTH_ABBR_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function startOfWeekIso(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

// Maps normalized muscle name → radar group id
const MUSCLE_TO_RADAR: Record<string, string> = {
  pecho: 'pecho',
  espalda: 'espalda',
  hombros: 'hombros',
  deltoides: 'hombros',
  biceps: 'brazos',
  triceps: 'brazos',
  brazos: 'brazos',
  abdominales: 'abdomen',
  abdomen: 'abdomen',
  core: 'abdomen',
  oblicuos: 'abdomen',
  cuadriceps: 'cuadriceps',
  gluteos: 'gluteos',
  isquiotibiales: 'isquios',
  isquios: 'isquios',
  gemelos: 'gemelos',
  abductores: 'gemelos',
  pantorrillas: 'gemelos',
};

export const RADAR_GROUPS = [
  { id: 'pecho', label: 'Pecho' },
  { id: 'espalda', label: 'Espalda' },
  { id: 'hombros', label: 'Hombros' },
  { id: 'brazos', label: 'Brazos' },
  { id: 'abdomen', label: 'Abdomen' },
  { id: 'cuadriceps', label: 'Cuadriceps' },
  { id: 'gluteos', label: 'Glúteos' },
  { id: 'isquios', label: 'Isquios' },
  { id: 'gemelos', label: 'Gemelos' },
] as const;

export const RADAR_GROUP_COLORS: Record<string, string> = {
  pecho: '#00C9A7',
  espalda: '#7F98FF',
  hombros: '#F5B942',
  brazos: '#FF7D7D',
  abdomen: '#38BDF8',
  cuadriceps: '#A78BFA',
  gluteos: '#34D399',
  isquios: '#FB923C',
  gemelos: '#E879F9',
};

export type MetricsSummary = {
  totalSessions: number;
  sessionsDelta: number | null;
  totalVolumeKg: number;
  volumeDelta: number | null;
  totalDays: number;
  daysDelta: number | null;
  totalSeries: number;
  seriesDelta: number | null;
  currentStreak: number;
  maxStreak: number;
};

export function buildMetricsSummary(sessions: SessionHistory[], referenceIso: string): MetricsSummary {
  const fourWeeksAgo = addDays(referenceIso, -28);
  const eightWeeksAgo = addDays(referenceIso, -56);

  const recent = sessions.filter((s) => s.isoDate > fourWeeksAgo && s.isoDate <= referenceIso);
  const previous = sessions.filter((s) => s.isoDate > eightWeeksAgo && s.isoDate <= fourWeeksAgo);

  const totalSessions = sessions.length;
  const recentCount = recent.length;
  const prevCount = previous.length;
  const sessionsDelta = prevCount > 0 ? Math.round(((recentCount - prevCount) / prevCount) * 100) : null;

  const totalVolumeKg = sessions.reduce((acc, s) => acc + s.volume, 0);
  const recentVol = recent.reduce((acc, s) => acc + s.volume, 0);
  const prevVol = previous.reduce((acc, s) => acc + s.volume, 0);
  const volumeDelta = prevVol > 0 ? Math.round(((recentVol - prevVol) / prevVol) * 100) : null;

  const totalDays = new Set(sessions.map((s) => s.isoDate)).size;
  const recentDays = new Set(recent.map((s) => s.isoDate)).size;
  const prevDays = new Set(previous.map((s) => s.isoDate)).size;
  const daysDelta = prevDays > 0 ? Math.round(((recentDays - prevDays) / prevDays) * 100) : null;

  const countSets = (list: SessionHistory[]) =>
    list.reduce((acc, s) => acc + s.exercises.reduce((ea, e) => ea + e.sets.length, 0), 0);
  const totalSeries = countSets(sessions);
  const recentSeries = countSets(recent);
  const prevSeries = countSets(previous);
  const seriesDelta = prevSeries > 0 ? Math.round(((recentSeries - prevSeries) / prevSeries) * 100) : null;

  const trainingDays = new Set(sessions.map((s) => s.isoDate));
  let currentStreak = 0;
  let checkDate = referenceIso;
  while (trainingDays.has(checkDate)) {
    currentStreak++;
    checkDate = addDays(checkDate, -1);
  }

  const sortedDays = [...trainingDays].sort();
  let maxStreak = 0;
  let streak = 0;
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      streak = addDays(sortedDays[i - 1], 1) === sortedDays[i] ? streak + 1 : 1;
    }
    maxStreak = Math.max(maxStreak, streak);
  }

  return { totalSessions, sessionsDelta, totalVolumeKg, volumeDelta, totalDays, daysDelta, totalSeries, seriesDelta, currentStreak, maxStreak };
}

function epley1RM(kg: number, reps: number): number {
  if (reps <= 1) return kg;
  return Math.round(kg * (1 + reps / 30));
}

export type ExercisePR = {
  name: string;
  muscle: string;
  maxKg: number;
  bestReps: number;
  estimated1RM: number;
  sparkline: number[];
  deltaKg: number | null;
  volumeProgress: number | null;
};

export function buildExercisePRs(sessions: SessionHistory[]): ExercisePR[] {
  const map = new Map<string, {
    name: string;
    muscle: string;
    entries: { rm: number; kg: number; reps: number }[];
  }>();

  const sorted = [...sessions].sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  for (const session of sorted) {
    for (const exercise of session.exercises) {
      const key = exercise.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name: exercise.name, muscle: exercise.muscle, entries: [] });
      }

      const workSets = exercise.sets.filter((s) => s.kind !== 'warmup' && s.reps > 0 && s.kg > 0);
      if (workSets.length === 0) continue;

      let bestRM = 0;
      let bestKg = 0;
      let bestReps = 0;
      for (const s of workSets) {
        const rm = epley1RM(s.kg, s.reps);
        if (rm > bestRM) { bestRM = rm; bestKg = s.kg; bestReps = s.reps; }
      }

      if (bestRM > 0) map.get(key)!.entries.push({ rm: bestRM, kg: bestKg, reps: bestReps });
    }
  }

  const prs: ExercisePR[] = [];

  for (const { name, muscle, entries } of map.values()) {
    if (entries.length < 2) continue;

    const sparkline = entries.slice(-10).map((e) => e.rm);
    const maxEntry = entries.reduce((best, e) => (e.rm > best.rm ? e : best));
    const firstKg = entries[0].kg;
    const deltaKg = firstKg > 0 ? Math.round((maxEntry.kg - firstKg) * 10) / 10 : null;

    const firstVol = entries[0].kg * entries[0].reps;
    const lastVol = entries[entries.length - 1].kg * entries[entries.length - 1].reps;
    const volumeProgress = firstVol > 0 ? Math.round(((lastVol - firstVol) / firstVol) * 100) : null;

    prs.push({ name, muscle, maxKg: maxEntry.kg, bestReps: maxEntry.reps, estimated1RM: maxEntry.rm, sparkline, deltaKg, volumeProgress });
  }

  return prs.sort((a, b) => b.estimated1RM - a.estimated1RM).slice(0, 10);
}

export function buildMonthCalendarDays(referenceIso: string): { days: string[]; month: number; year: number } {
  const ref = parseIsoDate(referenceIso);
  const year = ref.getFullYear();
  const month = ref.getMonth();

  const firstOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const firstDate = parseIsoDate(firstOfMonth);
  const dow = firstDate.getDay();
  const daysBeforeFirst = dow === 0 ? 6 : dow - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lastOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  const lastDate = parseIsoDate(lastOfMonth);
  const lastDow = lastDate.getDay();
  const daysAfterLast = lastDow === 0 ? 0 : 7 - lastDow;

  const totalCells = daysBeforeFirst + daysInMonth + daysAfterLast;
  const gridStart = addDays(firstOfMonth, -daysBeforeFirst);

  return {
    days: Array.from({ length: totalCells }, (_, i) => addDays(gridStart, i)),
    month,
    year,
  };
}

export type WeeklyFrequencyPoint = { week: string; sessions: number };
export type MuscleRadarPoint = { muscle: string; value: number; fullMark: number };
export type VolumeProgressionPoint = Record<string, number | string>;
export type VolumeProgressionData = {
  points: VolumeProgressionPoint[];
  activeGroups: { id: string; label: string; color: string }[];
};

// 4-week training calendar: returns ISO date strings for 4 complete weeks (Mon–Sun)
export function buildCalendarDays(referenceIso: string): string[] {
  const weekStart = startOfWeekIso(referenceIso);
  const start = addDays(weekStart, -21);
  return Array.from({ length: 28 }, (_, i) => addDays(start, i));
}

function formatWeekRangeLabel(wStart: string, wEnd: string): string {
  const start = parseIsoDate(wStart);
  const end = parseIsoDate(wEnd);
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMon = MONTH_ABBR_ES[start.getMonth()].toUpperCase();
  const endMon = MONTH_ABBR_ES[end.getMonth()].toUpperCase();
  if (start.getMonth() === end.getMonth()) {
    return `${startDay}-${endDay}\n${startMon}`;
  }
  return `${startDay} ${startMon}\n– ${endDay} ${endMon}`;
}

// Session count per week for the last 8 weeks (oldest → newest)
export function buildWeeklyFrequency(
  sessions: SessionHistory[],
  referenceIso: string
): WeeklyFrequencyPoint[] {
  const currentWeekStart = startOfWeekIso(referenceIso);

  return Array.from({ length: 8 }, (_, i) => {
    const offset = -(7 - i);
    const wStart = addDays(currentWeekStart, offset * 7);
    const wEnd = addDays(wStart, 6);
    const count = sessions.filter((s) => s.isoDate >= wStart && s.isoDate <= wEnd).length;
    return { week: formatWeekRangeLabel(wStart, wEnd), sessions: count };
  });
}

// Sets per muscle group (last 8 weeks), normalized to 0–100 relative to highest group
export function buildMuscleRadar(
  sessions: SessionHistory[],
  referenceIso: string
): MuscleRadarPoint[] {
  const currentWeekStart = startOfWeekIso(referenceIso);
  const eightWeeksAgo = addDays(currentWeekStart, -7 * 7);

  const recentSessions = sessions.filter((s) => s.isoDate >= eightWeeksAgo);

  const setCounts: Record<string, number> = Object.fromEntries(
    RADAR_GROUPS.map((g) => [g.id, 0])
  );

  for (const session of recentSessions) {
    for (const exercise of session.exercises) {
      const groupId = MUSCLE_TO_RADAR[normalizeText(exercise.muscle)];
      if (groupId !== undefined && groupId in setCounts) {
        setCounts[groupId] += exercise.sets.length;
      }
    }
  }

  const maxSets = Math.max(...Object.values(setCounts), 1);

  return RADAR_GROUPS.map((group) => ({
    muscle: group.label,
    value: Math.round((setCounts[group.id] / maxSets) * 100),
    fullMark: 100,
  }));
}

// Volume (kg×reps) per muscle group per session — last 20 sessions oldest→newest
export function buildVolumeProgression(sessions: SessionHistory[]): VolumeProgressionData {
  const sorted = [...sessions]
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate))
    .slice(-20);

  const totals: Record<string, number> = Object.fromEntries(RADAR_GROUPS.map((g) => [g.id, 0]));

  const points: VolumeProgressionPoint[] = sorted.map((session) => {
    const point: VolumeProgressionPoint = { date: session.isoDate.slice(5).replace('-', '/') };
    const groupVolumes: Record<string, number> = Object.fromEntries(
      RADAR_GROUPS.map((g) => [g.id, 0])
    );

    for (const exercise of session.exercises) {
      const groupId = MUSCLE_TO_RADAR[normalizeText(exercise.muscle)];
      if (groupId !== undefined && groupId in groupVolumes) {
        const vol = exercise.sets.reduce((sum, s) => sum + s.kg * s.reps, 0);
        groupVolumes[groupId] += vol;
      }
    }

    let sessionTotal = 0;
    for (const [id, vol] of Object.entries(groupVolumes)) {
      point[id] = Math.round(vol);
      totals[id] += vol;
      sessionTotal += vol;
    }
    point['total'] = Math.round(sessionTotal);

    return point;
  });

  const activeGroups = RADAR_GROUPS.filter((g) => totals[g.id] > 0).map((g) => ({
    id: g.id,
    label: g.label,
    color: RADAR_GROUP_COLORS[g.id] ?? '#00C9A7',
  }));

  return { points, activeGroups };
}
