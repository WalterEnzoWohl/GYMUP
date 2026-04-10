import type { AppContext, HistoryCalendarDay, Routine, SessionHistory, WeekDayStatus } from './models';

const TIME_ZONE = 'America/Argentina/Buenos_Aires';
const UPPERCASE_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  weekday: 'short',
});
const LONG_DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'long',
});
const LONG_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  weekday: 'long',
});

function normalizeText(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getTodayIso() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(new Date());
}

export function formatLongTodayLabel(isoDate: string) {
  const date = parseIsoDate(isoDate);
  const label = LONG_DATE_FORMATTER.format(date);
  return normalizeText(label);
}

export function formatDayLabel(isoDate: string) {
  const date = parseIsoDate(isoDate);
  const weekday = UPPERCASE_FORMATTER
    .format(date)
    .replace('.', '')
    .toUpperCase();
  return `${weekday} ${date.getDate()}`;
}

export function formatSessionDate(isoDate: string) {
  return SHORT_DATE_FORMATTER.format(parseIsoDate(isoDate)).toUpperCase();
}

export function parseIsoDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00-03:00`);
}

export function addDays(isoDate: string, amount: number) {
  const date = parseIsoDate(isoDate);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

function countStreakDays(sessions: SessionHistory[]) {
  const uniqueDates = Array.from(new Set(sessions.map((session) => session.isoDate))).sort((a, b) =>
    b.localeCompare(a)
  );

  if (uniqueDates.length === 0) {
    return 0;
  }

  let streak = 1;
  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previous = parseIsoDate(uniqueDates[index - 1]);
    const current = parseIsoDate(uniqueDates[index]);
    const diff = Math.round((previous.getTime() - current.getTime()) / 86400000);

    if (diff !== 1) {
      break;
    }

    streak += 1;
  }

  return streak;
}

export function buildAppContext(
  routines: Routine[],
  sessions: SessionHistory[],
  activeRoutineId?: number | null
): AppContext {
  const todayIso = getTodayIso();
  const todayLabel = formatLongTodayLabel(todayIso);
  const activeRoutine = routines.find((routine) => routine.id === activeRoutineId) ?? null;

  if (!activeRoutine || activeRoutine.days.length === 0) {
    return {
      todayIso,
      todayLabel,
      activeRoutineId: activeRoutine?.id ?? null,
      currentDayName: '',
      nextDayName: '',
      nextDayLabel: 'Próximo',
      streakDays: countStreakDays(sessions),
    };
  }

  const latestRoutineSession = sessions.find((session) => session.routineId === activeRoutine.id) ?? null;
  const latestDayIndex = latestRoutineSession
    ? activeRoutine.days.findIndex((day) => day.name === latestRoutineSession.name)
    : -1;
  const currentDayIndex = latestDayIndex >= 0 ? (latestDayIndex + 1) % activeRoutine.days.length : 0;
  const nextDayIndex = (currentDayIndex + 1) % activeRoutine.days.length;

  return {
    todayIso,
    todayLabel,
    activeRoutineId: activeRoutine.id,
    currentDayName: activeRoutine.days[currentDayIndex]?.name ?? activeRoutine.days[0].name,
    nextDayName: activeRoutine.days[nextDayIndex]?.name ?? activeRoutine.days[0].name,
    nextDayLabel: latestRoutineSession?.isoDate === todayIso ? 'Próximo' : 'Luego',
    streakDays: countStreakDays(sessions),
  };
}

function startOfWeek(isoDate: string) {
  const date = parseIsoDate(isoDate);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

const WEEKDAY_LABELS = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

export function buildWeekDayStatus(
  sessions: SessionHistory[],
  referenceIso: string,
  preferredTrainingDays: string[] = [],
  onboardingCompletedAt?: string
): WeekDayStatus[] {
  const mondayIso = startOfWeek(referenceIso);
  const preferredDays = new Set(preferredTrainingDays.map((day) => day.trim().toLowerCase()));
  const onboardingIso = onboardingCompletedAt?.slice(0, 10) ?? null;

  return Array.from({ length: 7 }, (_, index) => {
    const isoDate = addDays(mondayIso, index);
    const date = parseIsoDate(isoDate);
    const completed = sessions.some((session) => session.isoDate === isoDate);
    const active = isoDate === referenceIso;
    const weekdayName = normalizeText(LONG_WEEKDAY_FORMATTER.format(date));
    const hasExpectedSchedule =
      preferredDays.size === 0 || preferredDays.has(weekdayName.toLowerCase());
    const alreadyUsingApp = !onboardingIso || isoDate >= onboardingIso;
    const missed = isoDate < referenceIso && !completed && hasExpectedSchedule && alreadyUsingApp;

    return {
      day: WEEKDAY_LABELS[date.getDay()],
      isoDate,
      completed,
      missed,
      active,
    };
  });
}

export function buildHistoryCalendar(referenceIso: string): HistoryCalendarDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const isoDate = addDays(referenceIso, index - 6);
    const date = parseIsoDate(isoDate);
    return {
      day: WEEKDAY_LABELS[date.getDay()],
      num: date.getDate(),
      isoDate,
    };
  });
}
