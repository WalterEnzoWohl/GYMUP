import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Info, Search } from 'lucide-react';
import { Header } from '@/shared/components/layout/Header';
import { ExerciseDetailSheet } from '@/features/exercises/components/ExerciseDetailSheet';
import { FilterSheet } from '@/features/exercises/components/FilterSheet';
import type { CatalogExerciseItem } from '@/features/exercises/components/ExerciseDetailSheet';
import { useExerciseCatalog } from '@/features/exercises/hooks/useExerciseCatalog';
import { useAppData } from '@/core/app-data/AppDataContext';
import { normalizeSearchValue } from '@/features/exercises/lib/exerciseCatalog';

const ALL_MUSCLES = 'Todos';
const ALL_IMPLEMENTS = 'Todos';

export default function ExerciseExplorePage() {
  const navigate = useNavigate();
  const { sessionHistory } = useAppData();
  const { catalog, error: catalogError, isLoading: isCatalogLoading } = useExerciseCatalog();

  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState(ALL_MUSCLES);
  const [implement, setImplement] = useState(ALL_IMPLEMENTS);
  const [showMuscleSheet, setShowMuscleSheet] = useState(false);
  const [showImplementSheet, setShowImplementSheet] = useState(false);
  const [detail, setDetail] = useState<CatalogExerciseItem | null>(null);

  const library = useMemo<CatalogExerciseItem[]>(
    () =>
      catalog
        .filter((e) => Boolean(e.coverImageUrl))
        .map((e) => ({
          exerciseSlug: e.slug,
          name: e.title,
          titleEn: e.titleEn,
          muscle: e.muscle,
          implement: e.implement,
          secondaryMuscles: e.secondaryMuscles,
          coverImageUrl: e.coverImageUrl,
          animationMediaUrl: e.animationMediaUrl,
          animationMediaType: e.animationMediaType,
          instructions: e.instructions,
          overview: e.overview,
          searchText: e.searchText,
        })),
    [catalog]
  );

  const muscleOptions = useMemo(
    () => [ALL_MUSCLES, ...Array.from(new Set(library.map((e) => e.muscle))).sort((a, b) => a.localeCompare(b, 'es'))],
    [library]
  );

  const implementOptions = useMemo(
    () => [
      ALL_IMPLEMENTS,
      ...Array.from(new Set(library.map((e) => e.implement).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b, 'es')
      ),
    ],
    [library]
  );

  const filtered = useMemo(() => {
    const q = normalizeSearchValue(search);
    return library.filter((e) => {
      const matchMuscle = muscle === ALL_MUSCLES || e.muscle === muscle;
      const matchImplement = implement === ALL_IMPLEMENTS || e.implement === implement;
      return matchMuscle && matchImplement && (!q || (e.searchText ?? '').includes(q));
    });
  }, [library, search, muscle, implement]);

  const recent = useMemo(() => {
    const bySlug = new Map(library.map((e) => [e.exerciseSlug ?? '', e]));
    const seen = new Set<string>();
    const result: CatalogExerciseItem[] = [];
    for (const session of [...sessionHistory].sort((a, b) => b.isoDate.localeCompare(a.isoDate))) {
      for (const ex of session.exercises) {
        if (!ex.exerciseSlug || seen.has(ex.exerciseSlug)) continue;
        const entry = bySlug.get(ex.exerciseSlug);
        if (!entry) continue;
        seen.add(ex.exerciseSlug);
        result.push(entry);
        if (result.length >= 6) return result;
      }
    }
    return result;
  }, [sessionHistory, library]);

  return (
    <div className="relative flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header showBack title="Explorar ejercicios" onBack={() => navigate(-1)} />

      {/* Search + filters */}
      <div className="px-5 pt-4 pb-3">
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BAEC1]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, músculo o implemento"
            className="w-full rounded-xl border border-[#333] bg-[#203347] py-3 pl-9 pr-4 text-sm text-white outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setShowMuscleSheet(true); setShowImplementSheet(false); }}
            className={`flex-1 truncate rounded-xl border py-2.5 text-sm font-semibold transition-all ${
              muscle !== ALL_MUSCLES
                ? 'border-[rgba(0,201,167,0.4)] bg-[rgba(0,201,167,0.1)] text-[#00C9A7]'
                : 'border-[#333] bg-[#203347] text-[#9BAEC1]'
            }`}
          >
            {muscle === ALL_MUSCLES ? 'Todos Músculos' : muscle}
          </button>
          <button
            type="button"
            onClick={() => { setShowImplementSheet(true); setShowMuscleSheet(false); }}
            className={`flex-1 truncate rounded-xl border py-2.5 text-sm font-semibold transition-all ${
              implement !== ALL_IMPLEMENTS
                ? 'border-[rgba(0,201,167,0.4)] bg-[rgba(0,201,167,0.1)] text-[#00C9A7]'
                : 'border-[#333] bg-[#203347] text-[#9BAEC1]'
            }`}
          >
            {implement === ALL_IMPLEMENTS ? 'Todo Equipamiento' : implement}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="px-5 pb-6">
        {catalogError ? (
          <div className="mb-3 rounded-2xl border border-[rgba(255,125,125,0.22)] bg-[rgba(255,125,125,0.08)] px-4 py-3 text-sm text-[#FFB4B4]">
            {catalogError}
          </div>
        ) : null}

        {isCatalogLoading && catalog.length === 0 ? (
          <div className="mb-3 rounded-2xl border border-[#203347] bg-[#13263A] px-4 py-5 text-center text-sm text-[#9BAEC1]">
            Cargando catálogo de ejercicios...
          </div>
        ) : null}

        {!search.trim() && recent.length > 0 ? (
          <div className="mb-4">
            <p
              className="mb-2 text-xs font-bold uppercase tracking-widest text-[#9BAEC1]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Vistos recientemente
            </p>
            <div className="flex flex-col gap-2">
              {recent.map((exercise) => (
                <button
                  key={`recent-${exercise.exerciseSlug ?? exercise.name}`}
                  type="button"
                  onClick={() => setDetail(exercise)}
                  className="flex items-center gap-3 rounded-xl bg-[#203347] px-3 py-2.5 text-left"
                >
                  {exercise.coverImageUrl ? (
                    <img
                      src={exercise.coverImageUrl}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{exercise.name}</p>
                    <p className="truncate text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {[exercise.muscle, exercise.implement].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <Info size={16} className="shrink-0 text-[#9BAEC1]" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          {filtered.map((exercise) => (
            <button
              key={exercise.exerciseSlug ?? exercise.name}
              type="button"
              onClick={() => setDetail(exercise)}
              className="flex items-center gap-3 rounded-xl bg-[#203347] px-3 py-2.5 text-left"
            >
              {exercise.coverImageUrl ? (
                <img
                  src={exercise.coverImageUrl}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-lg object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{exercise.name}</p>
                <p className="truncate text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {[exercise.muscle, exercise.implement].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Info size={16} className="shrink-0 text-[#9BAEC1]" />
            </button>
          ))}

          {!isCatalogLoading && filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#203347] bg-[#13263A] px-4 py-5 text-center text-sm text-[#9BAEC1]">
              No encontramos ejercicios con ese filtro.
            </div>
          ) : null}
        </div>
      </div>

      {/* Muscle filter sheet */}
      <FilterSheet open={showMuscleSheet} title="Músculo" onClose={() => setShowMuscleSheet(false)}>
        <div className="flex flex-col gap-1">
          {muscleOptions.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMuscle(m); setShowMuscleSheet(false); }}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                muscle === m ? 'bg-[rgba(0,201,167,0.12)] text-[#00C9A7]' : 'text-[#9BAEC1] active:bg-[#203347]'
              }`}
            >
              {m}
              {muscle === m ? <div className="h-2 w-2 rounded-full bg-[#00C9A7]" /> : null}
            </button>
          ))}
        </div>
      </FilterSheet>
      {false && showMuscleSheet ? (
        <div className="absolute inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMuscleSheet(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[70%] overflow-y-auto rounded-t-3xl"
            style={{ background: '#1A2D42' }}
          >
            <div className="mx-auto mb-3 mt-4 h-1 w-10 rounded-full bg-[#203347]" />
            <div className="px-5 pb-8">
              <h3 className="mb-3 text-base font-bold text-white">Músculo</h3>
              <div className="flex flex-col gap-1">
                {muscleOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMuscle(m); setShowMuscleSheet(false); }}
                    className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                      muscle === m ? 'bg-[rgba(0,201,167,0.12)] text-[#00C9A7]' : 'text-[#9BAEC1] active:bg-[#203347]'
                    }`}
                  >
                    {m}
                    {muscle === m ? <div className="h-2 w-2 rounded-full bg-[#00C9A7]" /> : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Implement filter sheet */}
      <FilterSheet open={showImplementSheet} title="Equipamiento" onClose={() => setShowImplementSheet(false)}>
        <div className="flex flex-col gap-1">
          {implementOptions.map((impl) => (
            <button
              key={impl}
              type="button"
              onClick={() => { setImplement(impl); setShowImplementSheet(false); }}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                implement === impl ? 'bg-[rgba(0,201,167,0.12)] text-[#00C9A7]' : 'text-[#9BAEC1] active:bg-[#203347]'
              }`}
            >
              {impl}
              {implement === impl ? <div className="h-2 w-2 rounded-full bg-[#00C9A7]" /> : null}
            </button>
          ))}
        </div>
      </FilterSheet>
      {false && showImplementSheet ? (
        <div className="absolute inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowImplementSheet(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[70%] overflow-y-auto rounded-t-3xl"
            style={{ background: '#1A2D42' }}
          >
            <div className="mx-auto mb-3 mt-4 h-1 w-10 rounded-full bg-[#203347]" />
            <div className="px-5 pb-8">
              <h3 className="mb-3 text-base font-bold text-white">Equipamiento</h3>
              <div className="flex flex-col gap-1">
                {implementOptions.map((impl) => (
                  <button
                    key={impl}
                    type="button"
                    onClick={() => { setImplement(impl); setShowImplementSheet(false); }}
                    className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                      implement === impl ? 'bg-[rgba(0,201,167,0.12)] text-[#00C9A7]' : 'text-[#9BAEC1] active:bg-[#203347]'
                    }`}
                  >
                    {impl}
                    {implement === impl ? <div className="h-2 w-2 rounded-full bg-[#00C9A7]" /> : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ExerciseDetailSheet exercise={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
