import { useCallback, useLayoutEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface CatalogExerciseItem {
  exerciseSlug?: string;
  name: string;
  titleEn?: string;
  searchText?: string;
  muscle: string;
  implement?: string;
  secondaryMuscles?: string[];
  coverImageUrl?: string;
  animationMediaUrl?: string;
  animationMediaType?: string;
  instructions?: string[];
  overview?: string;
}

interface Props {
  exercise: CatalogExerciseItem | null;
  onClose: () => void;
  onAdd?: () => void;
  addLabel?: string;
}

interface ShellBounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function ExerciseDetailSheet({ exercise, onClose, onAdd, addLabel = 'Agregar a este dia' }: Props) {
  const [shellBounds, setShellBounds] = useState<ShellBounds | null>(null);

  const syncShellBounds = useCallback(() => {
    if (typeof window === 'undefined') return;

    const shell = document.querySelector<HTMLElement>('.wohl-shell');
    if (shell) {
      const rect = shell.getBoundingClientRect();
      setShellBounds({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      return;
    }

    setShellBounds({
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!exercise || typeof window === 'undefined') return;

    syncShellBounds();

    const viewport = window.visualViewport;
    window.addEventListener('resize', syncShellBounds);
    viewport?.addEventListener('resize', syncShellBounds);
    viewport?.addEventListener('scroll', syncShellBounds);

    return () => {
      window.removeEventListener('resize', syncShellBounds);
      viewport?.removeEventListener('resize', syncShellBounds);
      viewport?.removeEventListener('scroll', syncShellBounds);
    };
  }, [exercise, syncShellBounds]);

  if (!exercise) return null;

  const modal = (
    <div
      className="fixed z-[60] flex items-center justify-center px-5 py-6"
      style={
        shellBounds
          ? {
              top: shellBounds.top,
              left: shellBounds.left,
              width: shellBounds.width,
              height: shellBounds.height,
            }
          : {
              inset: 0,
            }
      }
    >
      <button
        type="button"
        aria-label="Cerrar instructivo"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      <div
        className="relative z-10 flex w-full max-h-[calc(100%-3rem)] flex-col overflow-hidden rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.42)]"
        style={{ background: '#1A2D42' }}
      >
        <div className="mx-auto mb-3 mt-4 h-1 w-10 shrink-0 rounded-full bg-[#203347]" />

        <div className="overflow-y-auto">
          {exercise.animationMediaUrl ? (
            <video
              key={exercise.animationMediaUrl}
              src={exercise.animationMediaUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full"
              style={{ maxHeight: '260px', objectFit: 'cover' }}
            />
          ) : null}

          <div className="px-5 pb-8 pt-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-bold leading-tight text-white">{exercise.name}</h2>
                {exercise.titleEn ? (
                  <p className="mt-0.5 text-sm text-[#6F859A]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {exercise.titleEn}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#203347] text-[#9BAEC1]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[rgba(0,201,167,0.12)] px-3 py-1 text-xs font-semibold text-[#00C9A7]">
                {exercise.muscle}
              </span>
              {exercise.secondaryMuscles?.map((m) => (
                <span
                  key={m}
                  className="rounded-full bg-[rgba(155,174,193,0.1)] px-3 py-1 text-xs font-medium text-[#9BAEC1]"
                >
                  {m}
                </span>
              ))}
              {exercise.implement ? (
                <span className="rounded-full bg-[rgba(127,152,255,0.12)] px-3 py-1 text-xs font-semibold text-[#7F98FF]">
                  {exercise.implement}
                </span>
              ) : null}
            </div>

            {exercise.overview ? (
              <p className="mb-5 text-sm leading-relaxed text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {exercise.overview}
              </p>
            ) : null}

            {exercise.instructions && exercise.instructions.length > 0 ? (
              <div className="mb-5">
                <p
                  className="mb-2.5 text-xs font-bold uppercase tracking-widest text-[#9BAEC1]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Instrucciones
                </p>
                <ol className="flex flex-col gap-2.5">
                  {exercise.instructions.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(0,201,167,0.15)] text-[10px] font-bold text-[#00C9A7]">
                        {index + 1}
                      </span>
                      <p
                        className="text-sm leading-relaxed text-white"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {onAdd ? (
              <button
                type="button"
                onClick={onAdd}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 font-bold text-black"
              >
                <Plus size={16} />
                {addLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}
