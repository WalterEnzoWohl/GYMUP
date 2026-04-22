import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, ChevronUp, Download, Dumbbell, Loader2, Plus } from 'lucide-react';
import { Header } from '@/shared/components/layout/Header';
import { useAppData } from '@/core/app-data/AppDataContext';
import { useExerciseCatalog } from '@/features/exercises/hooks/useExerciseCatalog';
import { useProgramTemplates } from '@/features/routines/hooks/useProgramTemplates';
import {
  getDifficultyColor,
  getDifficultyLabel,
  programToRoutine,
  type ProgramTemplate,
} from '@/features/routines/lib/programTemplates';

const ROUTINE_COLORS = ['#00C9A7', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#10B981'];

const SPLIT_LABELS: Record<string, string> = {
  upper_lower: 'Upper / Lower',
  ppl: 'Push / Pull / Legs',
  full_body: 'Full Body',
  upper_lower_ppl: 'Upper Lower + PPL',
};

function ProgramCard({
  program,
  onUse,
  isSaving,
}: {
  program: ProgramTemplate;
  onUse: (program: ProgramTemplate) => void;
  isSaving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const difficultyColor = getDifficultyColor(program.difficulty);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#203347] bg-[#13263A]">
      <div className="relative pl-4">
        <div
          className="absolute bottom-0 left-0 top-0 w-1 rounded-l-2xl"
          style={{ background: difficultyColor }}
        />
        <div className="flex flex-col gap-3 p-4 pl-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold leading-tight text-white">{program.i18n.es.title}</h3>
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                  style={{
                    color: difficultyColor,
                    background: `${difficultyColor}18`,
                    border: `1px solid ${difficultyColor}40`,
                  }}
                >
                  {getDifficultyLabel(program.difficulty)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {program.i18n.es.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg bg-[#1A3A52] px-2.5 py-1 text-[10px] font-semibold text-[#9BAEC1]">
              {program.days_per_week} días / semana
            </span>
            <span className="rounded-lg bg-[#1A3A52] px-2.5 py-1 text-[10px] font-semibold text-[#9BAEC1]">
              {SPLIT_LABELS[program.split_type] ?? program.split_type}
            </span>
            <span className="rounded-lg bg-[#1A3A52] px-2.5 py-1 text-[10px] font-semibold text-[#9BAEC1]">
              {program.sessions.length} sesiones
            </span>
          </div>

          {expanded && (
            <div className="flex flex-col gap-2 pt-1">
              {program.sessions
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((session) => (
                  <div key={session.id} className="rounded-xl bg-[#0F1F2E] p-3">
                    <p className="mb-2 text-xs font-bold text-white">{session.i18n.es.title}</p>
                    <div className="flex flex-col gap-1">
                      {session.exercises
                        .slice()
                        .sort((a, b) => a.order - b.order)
                        .map((ex) => (
                          <div key={ex.order} className="flex items-center justify-between gap-2">
                            <span
                              className="truncate text-[11px] text-[#9BAEC1]"
                              style={{ fontFamily: "'Inter', sans-serif" }}
                            >
                              {ex.exercise_slug.replace(/-/g, ' ')}
                            </span>
                            <span className="shrink-0 text-[10px] font-semibold text-[#777575]">
                              {ex.sets} × {ex.reps_min === ex.reps_max ? ex.reps_max : `${ex.reps_min}–${ex.reps_max}`}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#9BAEC1]"
              type="button"
            >
              {expanded ? (
                <>
                  <ChevronUp size={13} /> Ocultar detalle
                </>
              ) : (
                <>
                  <ChevronDown size={13} /> Ver sesiones
                </>
              )}
            </button>
            <button
              onClick={() => onUse(program)}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-full bg-[#00C9A7] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-black transition-colors active:bg-[#009F86] disabled:opacity-60"
              type="button"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              {isSaving ? 'Guardando...' : 'Usar programa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type ProgramSelectionScreenProps = {
  leftContent?: ReactNode;
  includeCreateCustomButton?: boolean;
};

export function ProgramSelectionScreen({
  leftContent,
  includeCreateCustomButton = false,
}: ProgramSelectionScreenProps) {
  const navigate = useNavigate();
  const { saveRoutine, setActiveRoutine } = useAppData();
  const { catalog, isLoading: catalogLoading } = useExerciseCatalog();
  const { templates, isLoading: templatesLoading, error } = useProgramTemplates();
  const [savingId, setSavingId] = useState<string | null>(null);

  const isLoading = catalogLoading || templatesLoading;

  const handleUse = async (program: ProgramTemplate) => {
    if (savingId) return;
    setSavingId(program.id);
    try {
      const colorIndex = Math.floor(Math.random() * ROUTINE_COLORS.length);
      const routine = programToRoutine(program, catalog, ROUTINE_COLORS[colorIndex]);
      const saved = await saveRoutine(routine);
      if (saved) {
        await setActiveRoutine(saved.id);
      }
      navigate('/workouts');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header leftContent={leftContent} />

      <div className="flex flex-col gap-6 px-5 py-6 pb-24">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Dumbbell size={20} className="text-[#00C9A7]" />
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Programas</h1>
          </div>
          <p className="text-sm text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Elegí un programa prearmado y empezá a entrenar de inmediato. Podés editarlo después.
          </p>
        </div>

        {includeCreateCustomButton && (
          <button
            onClick={() => navigate('/routine/new')}
            className="group relative overflow-hidden rounded-2xl border border-[rgba(0,201,167,0.18)] bg-[linear-gradient(180deg,#163146_0%,#102235_100%)] px-5 py-5 text-left transition-all active:scale-[0.99]"
            type="button"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,201,167,0.18),transparent_32%)]" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#00C9A7]">Personalizado</p>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-white">Crear mi propio programa</h2>
                <p className="mt-1 text-sm text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Arrancá desde cero y armalo exactamente a tu manera.
                </p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[rgba(0,201,167,0.18)] bg-[rgba(0,201,167,0.08)] text-[#00C9A7]">
                <Plus size={22} />
              </div>
            </div>
          </button>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 size={28} className="animate-spin text-[#00C9A7]" />
            <p className="text-sm text-[#9BAEC1]">Cargando programas...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-2xl border border-[rgba(229,57,53,0.18)] bg-[rgba(229,57,53,0.08)] p-5 text-sm text-[#FF8A80]">
            {error}
          </div>
        )}

        {!isLoading && !error && (
          <div className="flex flex-col gap-4">
            {templates.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                onUse={(selectedProgram) => void handleUse(selectedProgram)}
                isSaving={savingId === program.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
