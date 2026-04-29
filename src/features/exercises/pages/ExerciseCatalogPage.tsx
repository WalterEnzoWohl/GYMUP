import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Check, Info, Plus, Search, X } from 'lucide-react';
import { useExerciseCatalog } from '@/features/exercises/hooks/useExerciseCatalog';
import { ExerciseDetailSheet } from '@/features/exercises/components/ExerciseDetailSheet';
import { FilterSheet } from '@/features/exercises/components/FilterSheet';
import type { CatalogExerciseItem } from '@/features/exercises/components/ExerciseDetailSheet';
import { useAppData } from '@/core/app-data/AppDataContext';
import { Header } from '@/shared/components/layout/Header';

const ALL_MUSCLES_OPTION = '__all__';
const ALL_IMPLEMENTS_OPTION = '__all__';

const POPULAR_ORDER_EN = [
  'Incline Bench Press (Barbell)',
  'Incline Bench Press (Dumbbell)',
  'Overhead Triceps Extension (Cable)',
  'Bench Press (Barbell)',
  'Bench Press (Dumbbell)',
  'Bench Press (Cable)',
  'Bench Press (Smith Machine)',
  'Chest Dip (Weighted)',
  'Triceps Dip (Weighted)',
  'Chest Dip',
  'Butterfly (Pec Deck)',
  'Push Up',
  'Cable Fly Crossovers',
  'Chest Fly (Dumbbell)',
  'Decline Bench Press (Barbell)',
  'Chest Press (Machine)',
  'Triceps Rope Pushdown',
  'Triceps Pushdown',
  'Pull Up',
  'Pull Up (Weighted)',
  'Preacher Curl (Barbell)',
  'Behind the Back Curl (Cable)',
  'Pullover (Machine)',
  'Pullover (Dumbbell)',
  'Bent Over Row (Barbell)',
  'Bent Over Row (Dumbbell)',
  'Lat Pulldown (Cable)',
  'Hammer Curl (Dumbbell)',
  'T Bar Row',
  'Dumbbell Row',
  'Inverted Row',
  'Seated Row (Machine)',
  'Bicep Curl (Barbell)',
  'EZ Bar Biceps Curl',
  'Bicep Curl (Dumbbell)',
  'Concentration Curl',
  'Lateral Raise (Dumbbell)',
  'Lateral Raise (Cable)',
  'Lateral Raise (Machine)',
  'Overhead Press (Barbell)',
  'Overhead Press (Dumbbell)',
  'Shoulder Press (Dumbbell)',
  'Overhead Press (Smith Machine)',
  'Seated Shoulder Press (Machine)',
  'Shrug (Dumbbell)',
  'Shrug (Barbell)',
  'Arnold Press (Dumbbell)',
  'Face Pull',
  'Front Raise (Dumbbell)',
  'Rear Delt Reverse Fly (Dumbbell)',
  'Squat (Barbell)',
  'Romanian Deadlift (Barbell)',
  'Romanian Deadlift (Dumbbell)',
  'Leg Extension (Machine)',
  'Seated Leg Curl (Machine)',
  'Deadlift (Barbell)',
  'Deadlift (Trap bar)',
  'Straight Leg Deadlift',
  'Sumo Deadlift',
  'Bulgarian Split Squat',
  'Goblet Squat',
  'Leg Press (Machine)',
  'Reverse Lunge (Dumbbell)',
  'Walking Lunge',
  'Lunge (Dumbbell)',
  'Calf Press (Machine)',
  'Seated Calf Raise',
  'Standing Calf Raise',
  'Front Squat',
  'Hack Squat',
  'Hack Squat (Machine)',
  'Hip Thrust (Barbell)',
  'Glute Bridge',
  'Hip Thrust',
  'Dumbbell Step Up',
  'Cable Crunch',
  'Lying Neck Curls',
  'Lying Neck Extension',
  'Wrist Roller',
  'Plank',
  'Side Plank',
  'Hanging Leg Raise',
  'Back Extension (Hyperextension)',
  'Superman',
  'Ab Wheel',
  'Hanging Knee Raise',
  'Cable Core Palloff Press',
  'Bicycle Crunch',
  'Crunch',
  'Reverse Crunch',
  'Farmers Walk',
  'Burpee',
  'Jump Rope',
  'Kettlebell Swing',
  'Rowing Machine',
  'Running',
  'Air Bike',
  'Boxing',
  'Battle Ropes',
  'Box Jump',
];

function normalizeForRanking(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

const POPULAR_RANK = new Map<string, number>(
  POPULAR_ORDER_EN.map((title, index) => [normalizeForRanking(title), index])
);

const MUSCLE_LABELS_ES: Record<string, string> = {
  abdominals: 'Abdominales',
  abductors: 'Abductores',
  adductors: 'Aductores',
  biceps: 'Bíceps',
  calves: 'Pantorrillas',
  deltoids: 'Hombros',
  erector_spinae: 'Lumbar',
  forearms: 'Antebrazos',
  full_body: 'Full body',
  glutes: 'Glúteos',
  hamstrings: 'Isquiotibiales',
  latissimus_dorsi: 'Espalda',
  neck: 'Cuello',
  pectoralis_major: 'Pecho',
  quadriceps: 'Cuádriceps',
  trapezius: 'Trapecios',
  triceps: 'Tríceps',
  upper_back: 'Espalda alta',
  cardio: 'Cardio',
};

const MUSCLE_POPULARITY_ORDER = [
  'pectoralis_major', 'latissimus_dorsi', 'quadriceps', 'biceps', 'triceps',
  'deltoids', 'hamstrings', 'glutes', 'abdominals', 'calves', 'upper_back',
  'erector_spinae', 'trapezius', 'forearms', 'adductors', 'abductors', 'neck',
  'full_body', 'cardio',
];

const EQUIPMENT_LABELS_ES: Record<string, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  cable: 'Cable/Polea',
  machine: 'Máquina',
  bodyweight: 'Peso corporal',
  kettlebell: 'Kettlebell',
  resistance_band: 'Banda',
  plate: 'Disco',
  suspension: 'Suspensión',
  band: 'Banda',
  ez_bar: 'Barra EZ',
  trap_bar: 'Trap bar',
  smith_machine: 'Smith Machine',
  other: 'Otro',
};

const EQUIPMENT_POPULARITY_ORDER = [
  'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight',
  'kettlebell', 'resistance_band', 'plate', 'suspension', 'other',
];

type CatalogNavState = {
  dayIndex: number;
  dayName: string;
  mode: 'add' | 'replace';
  replaceIndex?: number;
  existingDaySlugs: string[];
  currentDayExerciseCount: number;
  returnTo: string;
};

// ─── Sub-component ────────────────────────────────────────────────────────────

interface ExerciseRowProps {
  exercise: CatalogExerciseItem;
  mode: 'add' | 'replace';
  isSelected: boolean;
  isAtMax: boolean;
  isInDay: boolean;
  onToggle: () => void;
  onDetail: () => void;
  onReplace: () => void;
}

function ExerciseRow({ exercise, mode, isSelected, isAtMax, isInDay, onToggle, onDetail, onReplace }: ExerciseRowProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
        isSelected
          ? 'border border-[rgba(0,201,167,0.4)] bg-[rgba(0,201,167,0.08)]'
          : isInDay && mode === 'add'
            ? 'bg-[#13263A] opacity-50'
            : 'bg-[#13263A]'
      }`}
    >
      {exercise.coverImageUrl ? (
        <button
          type="button"
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg"
          onClick={onDetail}
        >
          <img src={exercise.coverImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          {isSelected ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,201,167,0.72)]">
              <Check size={18} className="text-white" strokeWidth={3} />
            </div>
          ) : null}
        </button>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{exercise.name}</p>
        <p className="truncate text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
          {[exercise.muscle, exercise.implement].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onDetail}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9BAEC1] transition-colors active:bg-[#2A415A]"
          aria-label="Ver detalles"
        >
          <Info size={16} />
        </button>
        {mode === 'replace' ? (
          <button
            type="button"
            onClick={onReplace}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(0,201,167,0.15)] text-[#00C9A7] transition-colors active:bg-[rgba(0,201,167,0.25)]"
            aria-label="Seleccionar ejercicio"
          >
            <Plus size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            disabled={(isAtMax && !isSelected) || isInDay}
            className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${
              isSelected
                ? 'border-[#00C9A7] bg-[#00C9A7]'
                : isAtMax || isInDay
                  ? 'border-[rgba(155,174,193,0.25)] opacity-40'
                  : 'border-[rgba(155,174,193,0.4)] bg-transparent active:border-[#00C9A7]'
            }`}
            aria-label={isSelected ? 'Deseleccionar' : 'Seleccionar'}
          >
            {isSelected ? <Check size={13} className="text-black" strokeWidth={3} /> : null}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExerciseCatalogPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { catalog, isLoading, error } = useExerciseCatalog();
  const { sessionHistory } = useAppData();

  const navState = (location.state ?? {}) as Partial<CatalogNavState>;
  const dayIndex = navState.dayIndex ?? 0;
  const dayName = navState.dayName ?? '';
  const mode = navState.mode ?? 'add';
  const replaceIndex = navState.replaceIndex;
  const existingSlugsSet = useMemo(() => new Set(navState.existingDaySlugs ?? []), [navState.existingDaySlugs]);
  const currentDayExerciseCount = navState.currentDayExerciseCount ?? 0;
  const returnTo = navState.returnTo ?? '/';

  const remainingSlots = 15 - currentDayExerciseCount;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState(ALL_MUSCLES_OPTION);
  const [selectedImplement, setSelectedImplement] = useState(ALL_IMPLEMENTS_OPTION);
  const [showMuscleSheet, setShowMuscleSheet] = useState(false);
  const [showImplementSheet, setShowImplementSheet] = useState(false);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<CatalogExerciseItem | null>(null);

  const isAtMax = mode === 'add' && selectedSlugs.size >= remainingSlots;

  const exerciseLibrary = useMemo<CatalogExerciseItem[]>(() => {
    if (catalog.length === 0) return [];
    return catalog
      .filter((e) => Boolean(e.coverImageUrl))
      .map((e) => ({
        exerciseSlug: e.slug,
        name: e.title,
        muscle: e.muscle,
        implement: e.implement,
        secondaryMuscles: e.secondaryMuscles,
        coverImageUrl: e.coverImageUrl,
        animationMediaUrl: e.animationMediaUrl,
        animationMediaType: e.animationMediaType,
        instructions: e.instructions,
        overview: e.overview,
      }))
      .sort((a, b) => {
        const keyA = normalizeForRanking(a.exerciseSlug?.replace(/-/g, ' ') ?? '');
        const keyB = normalizeForRanking(b.exerciseSlug?.replace(/-/g, ' ') ?? '');
        const rankA = POPULAR_RANK.get(keyA) ?? Infinity;
        const rankB = POPULAR_RANK.get(keyB) ?? Infinity;
        if (rankA !== rankB) return rankA - rankB;
        if (rankA === Infinity) return a.name.localeCompare(b.name, 'es');
        return 0;
      });
  }, [catalog]);

  const catalogBySlug = useMemo(
    () => new Map(exerciseLibrary.map((e) => [e.exerciseSlug ?? '', e])),
    [exerciseLibrary]
  );

  const catalogSummaryBySlug = useMemo(
    () => new Map(catalog.filter((e) => Boolean(e.coverImageUrl)).map((e) => [e.slug, e])),
    [catalog]
  );

  const muscleOptions = useMemo(() => {
    const sorted = Array.from(new Set(exerciseLibrary.map((exercise) => exercise.muscle))).sort((a, b) =>
      a.localeCompare(b, 'es')
    );
    return [ALL_MUSCLES_OPTION, ...sorted];
  }, [exerciseLibrary]);

  const implementOptions = useMemo(() => {
    const sorted = Array.from(
      new Set(exerciseLibrary.map((exercise) => exercise.implement).filter(Boolean) as string[])
    ).sort((a, b) => a.localeCompare(b, 'es'));
    return [ALL_IMPLEMENTS_OPTION, ...sorted];
  }, [exerciseLibrary]);

  const filteredExercises = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return exerciseLibrary.filter((exercise) => {
      if (selectedMuscle !== ALL_MUSCLES_OPTION && exercise.muscle !== selectedMuscle) return false;
      if (selectedImplement !== ALL_IMPLEMENTS_OPTION && exercise.implement !== selectedImplement) return false;
      if (normalizedSearch) {
        const haystack = [exercise.name, exercise.muscle, exercise.implement ?? ''].join(' ').toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }
      return true;
    });
  }, [exerciseLibrary, catalogSummaryBySlug, searchQuery, selectedMuscle, selectedImplement]);

  const recentExercises = useMemo(() => {
    const seen = new Set<string>();
    const result: CatalogExerciseItem[] = [];
    const sortedSessions = [...sessionHistory].sort((a, b) => b.isoDate.localeCompare(a.isoDate));
    for (const session of sortedSessions) {
      for (const ex of session.exercises) {
        if (!ex.exerciseSlug || seen.has(ex.exerciseSlug)) continue;
        const catalogEntry = catalogBySlug.get(ex.exerciseSlug);
        if (!catalogEntry) continue;
        seen.add(ex.exerciseSlug);
        result.push(catalogEntry);
        if (result.length >= 8) return result;
      }
    }
    return result;
  }, [sessionHistory, catalogBySlug]);

  const recommendedExercises = useMemo(() => {
    return exerciseLibrary
      .filter((e) => e.exerciseSlug && !existingSlugsSet.has(e.exerciseSlug))
      .slice(0, 6);
  }, [exerciseLibrary, existingSlugsSet]);

  const toggleSelection = (exercise: CatalogExerciseItem) => {
    const key = exercise.exerciseSlug ?? exercise.name;
    if (!selectedSlugs.has(key) && isAtMax) return;
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleConfirmAdd = () => {
    if (selectedSlugs.size === 0) return;
    const exercises = exerciseLibrary.filter((e) => selectedSlugs.has(e.exerciseSlug ?? e.name));
    navigate(returnTo, {
      state: { catalogResult: { exercises, dayIndex, mode: 'add' } },
    });
  };

  const handleReplaceSelect = (exercise: CatalogExerciseItem) => {
    navigate(returnTo, {
      state: { catalogResult: { exercises: [exercise], dayIndex, mode: 'replace', replaceIndex } },
    });
  };

  const isFiltering =
    searchQuery.trim() !== '' ||
    selectedMuscle !== ALL_MUSCLES_OPTION ||
    selectedImplement !== ALL_IMPLEMENTS_OPTION;

  const pageTitle = mode === 'replace'
    ? 'Reemplazar ejercicio'
    : dayName
      ? `Agregar · ${dayName}`
      : 'Catálogo de ejercicios';

  return (
    <div
      className="relative flex flex-col"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <Header showBack title={pageTitle} />

      {/* Search + filters */}
      <div className="px-5 pb-3 pt-4">
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BAEC1]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ejercicio, músculo o implemento..."
            className="w-full rounded-xl border border-[#203347] bg-[#13263A] py-3 pl-9 pr-4 text-sm text-white outline-none focus:border-[rgba(0,201,167,0.4)]"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setShowMuscleSheet(true); setShowImplementSheet(false); }}
            className={`flex-1 truncate rounded-xl border py-2.5 text-sm font-semibold transition-all ${
              selectedMuscle !== ALL_MUSCLES_OPTION
                ? 'border-[rgba(0,201,167,0.4)] bg-[rgba(0,201,167,0.1)] text-[#00C9A7]'
                : 'border-[#203347] bg-[#13263A] text-[#9BAEC1]'
            }`}
          >
            {selectedMuscle === ALL_MUSCLES_OPTION
              ? 'Músculo'
              : (MUSCLE_LABELS_ES[selectedMuscle] ?? selectedMuscle)}
          </button>
          <button
            type="button"
            onClick={() => { setShowImplementSheet(true); setShowMuscleSheet(false); }}
            className={`flex-1 truncate rounded-xl border py-2.5 text-sm font-semibold transition-all ${
              selectedImplement !== ALL_IMPLEMENTS_OPTION
                ? 'border-[rgba(0,201,167,0.4)] bg-[rgba(0,201,167,0.1)] text-[#00C9A7]'
                : 'border-[#203347] bg-[#13263A] text-[#9BAEC1]'
            }`}
          >
            {selectedImplement === ALL_IMPLEMENTS_OPTION
              ? 'Equipamiento'
              : (EQUIPMENT_LABELS_ES[selectedImplement] ?? selectedImplement)}
          </button>
        </div>
      </div>

      {/* Exercise list */}
      <div className="px-5 pb-32">
        {error ? (
          <div className="mb-3 rounded-2xl border border-[rgba(255,125,125,0.22)] bg-[rgba(255,125,125,0.08)] px-4 py-3 text-sm text-[#FFB4B4]">
            {error}. Mostrando selección local de respaldo.
          </div>
        ) : null}

        {isLoading && catalog.length === 0 ? (
          <div className="mb-3 rounded-2xl border border-[#203347] bg-[#13263A] px-4 py-5 text-center text-sm text-[#9BAEC1]">
            Cargando catálogo de ejercicios...
          </div>
        ) : null}

        {mode === 'add' && isAtMax ? (
          <div
            className="mb-3 rounded-xl border border-[rgba(245,185,66,0.22)] bg-[rgba(245,185,66,0.06)] px-4 py-2.5 text-center text-xs text-[#F5B942]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Seleccionaste {selectedSlugs.size} ejercicio{selectedSlugs.size !== 1 ? 's' : ''} — máximo {remainingSlots} disponible{remainingSlots !== 1 ? 's' : ''} para este día.
          </div>
        ) : null}

        {/* Recientes */}
        {!isFiltering && recentExercises.length > 0 ? (
          <div className="mb-4">
            <p
              className="mb-2 text-xs font-bold uppercase tracking-widest text-[#9BAEC1]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Recientes
            </p>
            <div className="flex flex-col gap-2">
              {recentExercises.map((exercise) => (
                <ExerciseRow
                  key={`recent-${exercise.exerciseSlug ?? exercise.name}`}
                  exercise={exercise}
                  mode={mode}
                  isSelected={selectedSlugs.has(exercise.exerciseSlug ?? exercise.name)}
                  isAtMax={isAtMax}
                  isInDay={existingSlugsSet.has(exercise.exerciseSlug ?? '')}
                  onToggle={() => toggleSelection(exercise)}
                  onDetail={() => setSelectedExerciseDetail(exercise)}
                  onReplace={() => handleReplaceSelect(exercise)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Recomendados */}
        {!isFiltering && recommendedExercises.length > 0 ? (
          <div className="mb-4">
            <p
              className="mb-2 text-xs font-bold uppercase tracking-widest text-[#9BAEC1]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Recomendados
            </p>
            <div className="flex flex-col gap-2">
              {recommendedExercises.map((exercise) => (
                <ExerciseRow
                  key={`rec-${exercise.exerciseSlug ?? exercise.name}`}
                  exercise={exercise}
                  mode={mode}
                  isSelected={selectedSlugs.has(exercise.exerciseSlug ?? exercise.name)}
                  isAtMax={isAtMax}
                  isInDay={existingSlugsSet.has(exercise.exerciseSlug ?? '')}
                  onToggle={() => toggleSelection(exercise)}
                  onDetail={() => setSelectedExerciseDetail(exercise)}
                  onReplace={() => handleReplaceSelect(exercise)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* All / filtered exercises */}
        <div className="flex flex-col gap-2">
          {filteredExercises.map((exercise) => (
            <ExerciseRow
              key={exercise.exerciseSlug ?? exercise.name}
              exercise={exercise}
              mode={mode}
              isSelected={selectedSlugs.has(exercise.exerciseSlug ?? exercise.name)}
              isAtMax={isAtMax}
              isInDay={existingSlugsSet.has(exercise.exerciseSlug ?? '')}
              onToggle={() => toggleSelection(exercise)}
              onDetail={() => setSelectedExerciseDetail(exercise)}
              onReplace={() => handleReplaceSelect(exercise)}
            />
          ))}
          {!isLoading && filteredExercises.length === 0 ? (
            <div className="rounded-2xl border border-[#203347] bg-[#13263A] px-4 py-5 text-center text-sm text-[#9BAEC1]">
              No encontramos ejercicios con ese filtro.
            </div>
          ) : null}
        </div>
      </div>

      {/* Floating "Agregar" button — add mode only, stays fixed while scrolling */}
      {mode === 'add' ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 flex justify-center">
          <div className="w-full max-w-[430px] px-4">
          <button
            type="button"
            disabled={selectedSlugs.size === 0}
            onClick={handleConfirmAdd}
            className={`pointer-events-auto flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold transition-all ${
              selectedSlugs.size === 0
                ? 'bg-[#1E3249] text-[#4F6378] shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
                : 'bg-[#00C9A7] text-black shadow-[0_0_20px_rgba(0,201,167,0.35),0_8px_24px_rgba(0,0,0,0.3)]'
            }`}
          >
            <Plus size={18} />
            {selectedSlugs.size === 0
              ? 'Seleccioná ejercicios para agregar'
              : `Agregar ${selectedSlugs.size} ejercicio${selectedSlugs.size !== 1 ? 's' : ''}`}
          </button>
          </div>
        </div>
      ) : null}

      {/* Muscle filter sheet */}
      <FilterSheet open={showMuscleSheet} title="Músculo" onClose={() => setShowMuscleSheet(false)}>
        {muscleOptions.map((muscle) => (
          <button
            key={muscle}
            type="button"
            onClick={() => { setSelectedMuscle(muscle); setShowMuscleSheet(false); }}
            className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              selectedMuscle === muscle
                ? 'bg-[rgba(0,201,167,0.12)] text-[#00C9A7]'
                : 'text-[#9BAEC1] active:bg-[#203347]'
            }`}
          >
            {muscle === ALL_MUSCLES_OPTION ? 'Todos los músculos' : muscle}
            {selectedMuscle === muscle ? <div className="h-2 w-2 rounded-full bg-[#00C9A7]" /> : null}
          </button>
        ))}
      </FilterSheet>
      {false && showMuscleSheet ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMuscleSheet(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 flex max-h-[70vh] flex-col rounded-t-3xl"
            style={{ background: '#1A2D42' }}
          >
            <div className="mx-auto mb-0 mt-4 h-1 w-10 shrink-0 rounded-full bg-[#203347]" />
            <div className="flex shrink-0 items-center justify-between px-5 py-3">
              <h3 className="text-base font-bold text-white">Músculo</h3>
              <button
                type="button"
                onClick={() => setShowMuscleSheet(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#9BAEC1]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-8">
              {muscleOptions.map((muscle) => (
                <button
                  key={muscle}
                  type="button"
                  onClick={() => { setSelectedMuscle(muscle); setShowMuscleSheet(false); }}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    selectedMuscle === muscle
                      ? 'bg-[rgba(0,201,167,0.12)] text-[#00C9A7]'
                      : 'text-[#9BAEC1] active:bg-[#203347]'
                  }`}
                >
                  {muscle === ALL_MUSCLES_OPTION
                    ? 'Todos los músculos'
                    : (MUSCLE_LABELS_ES[muscle] ?? muscle)}
                  {selectedMuscle === muscle ? <div className="h-2 w-2 rounded-full bg-[#00C9A7]" /> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Equipment filter sheet */}
      <FilterSheet open={showImplementSheet} title="Equipamiento" onClose={() => setShowImplementSheet(false)}>
        {implementOptions.map((implement) => (
          <button
            key={implement}
            type="button"
            onClick={() => { setSelectedImplement(implement); setShowImplementSheet(false); }}
            className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              selectedImplement === implement
                ? 'bg-[rgba(0,201,167,0.12)] text-[#00C9A7]'
                : 'text-[#9BAEC1] active:bg-[#203347]'
            }`}
          >
            {implement === ALL_IMPLEMENTS_OPTION ? 'Todo el equipamiento' : implement}
            {selectedImplement === implement ? <div className="h-2 w-2 rounded-full bg-[#00C9A7]" /> : null}
          </button>
        ))}
      </FilterSheet>
      {false && showImplementSheet ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowImplementSheet(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 flex max-h-[70vh] flex-col rounded-t-3xl"
            style={{ background: '#1A2D42' }}
          >
            <div className="mx-auto mb-0 mt-4 h-1 w-10 shrink-0 rounded-full bg-[#203347]" />
            <div className="flex shrink-0 items-center justify-between px-5 py-3">
              <h3 className="text-base font-bold text-white">Equipamiento</h3>
              <button
                type="button"
                onClick={() => setShowImplementSheet(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#9BAEC1]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-8">
              {implementOptions.map((implement) => (
                <button
                  key={implement}
                  type="button"
                  onClick={() => { setSelectedImplement(implement); setShowImplementSheet(false); }}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    selectedImplement === implement
                      ? 'bg-[rgba(0,201,167,0.12)] text-[#00C9A7]'
                      : 'text-[#9BAEC1] active:bg-[#203347]'
                  }`}
                >
                  {implement === ALL_IMPLEMENTS_OPTION
                    ? 'Todo el equipamiento'
                    : (EQUIPMENT_LABELS_ES[implement] ?? implement)}
                  {selectedImplement === implement ? <div className="h-2 w-2 rounded-full bg-[#00C9A7]" /> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <ExerciseDetailSheet
        exercise={selectedExerciseDetail}
        onClose={() => setSelectedExerciseDetail(null)}
        onAdd={
          selectedExerciseDetail
            ? mode === 'replace'
              ? () => handleReplaceSelect(selectedExerciseDetail)
              : () => { toggleSelection(selectedExerciseDetail); setSelectedExerciseDetail(null); }
            : undefined
        }
        addLabel={mode === 'replace' ? 'Seleccionar este ejercicio' : 'Agregar a selección'}
      />
    </div>
  );
}
