import { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, Check, GripVertical, MoreVertical, Plus, TimerReset, Trash2 } from 'lucide-react';
import { useDrag, useDrop } from 'react-dnd';
import type { ActiveWorkoutExercise } from '@/shared/types/models';
import { formatWeightInputValue } from '@/shared/lib/unitUtils';

const EXERCISE_ITEM_TYPE = 'session-exercise';

type SessionExerciseCardProps = {
  htmlId: string;
  exercise: ActiveWorkoutExercise;
  exerciseIdx: number;
  totalExercises: number;
  currentExerciseIndex: number;
  weightUnit: 'kg' | 'lb';
  weightUnitLabel: string;
  showPreviousWeight: boolean;
  coverImageUrl?: string;
  onThumbnailClick?: () => void;
  onMoveExercise: (fromIndex: number, toIndex: number) => void;
  onExerciseFocus: (exerciseIdx: number) => void;
  onExerciseMenu: (exerciseIdx: number, anchorRect: DOMRect) => void;
  onSetMenu: (exerciseIdx: number, setIdx: number, anchorRect: DOMRect) => void;
  onSetValueChange: (exerciseIdx: number, setIdx: number, field: 'kg' | 'reps', value: string) => void;
  onSetToggleComplete: (exerciseIdx: number, setIdx: number) => void;
  onExerciseNotesChange: (exerciseIdx: number, notes: string) => void;
  onAddSet: (exerciseIdx: number) => void;
  onRemoveLastSet: (exerciseIdx: number) => void;
  onOpenRestTimer: (exerciseIdx: number) => void;
  onReorderClick: () => void;
};

function isBodyweightExercise(exercise: Pick<ActiveWorkoutExercise, 'implement'>) {
  const implement = exercise.implement?.trim().toLowerCase() ?? '';
  return implement.includes('peso corporal') || implement.includes('bodyweight');
}

export function TrainingExerciseCard({
  htmlId,
  exercise,
  exerciseIdx,
  totalExercises,
  currentExerciseIndex,
  weightUnit,
  weightUnitLabel,
  showPreviousWeight,
  coverImageUrl,
  onThumbnailClick,
  onMoveExercise,
  onExerciseFocus,
  onExerciseMenu,
  onSetMenu,
  onSetValueChange,
  onSetToggleComplete,
  onExerciseNotesChange,
  onAddSet,
  onRemoveLastSet,
  onOpenRestTimer,
  onReorderClick,
}: SessionExerciseCardProps) {
  const bodyweightExercise = isBodyweightExercise(exercise);
  const [weightDrafts, setWeightDrafts] = useState<Record<number, string>>({});
  const [isPressing, setIsPressing] = useState(false);
  const pressTimerRef = useRef<number | null>(null);
  const longPressActivatedRef = useRef(false);

  useEffect(() => {
    setWeightDrafts({});
  }, [exercise.id, weightUnit]);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: EXERCISE_ITEM_TYPE,
      item: { index: exerciseIdx },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [exerciseIdx]
  );

  const [, drop] = useDrop(
    () => ({
      accept: EXERCISE_ITEM_TYPE,
      hover: (item: { index: number }, monitor) => {
        if (item.index === exerciseIdx) {
          return;
        }

        const clientOffset = monitor.getClientOffset();
        const container = document.getElementById(htmlId);
        if (!clientOffset || !container) {
          return;
        }

        const rect = container.getBoundingClientRect();
        const middleY = (rect.bottom - rect.top) / 2;
        const hoverY = clientOffset.y - rect.top;

        if (item.index < exerciseIdx && hoverY < middleY) {
          return;
        }

        if (item.index > exerciseIdx && hoverY > middleY) {
          return;
        }

        onMoveExercise(item.index, exerciseIdx);
        item.index = exerciseIdx;
      },
    }),
    [exerciseIdx, htmlId, onMoveExercise]
  );

  const setContainerRef = (element: HTMLDivElement | null) => {
    if (!element) {
      return;
    }

    drop(element);
  };

  useEffect(() => {
    if (isDragging) {
      setIsPressing(false);
      if (pressTimerRef.current !== null) {
        window.clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
    }
  }, [isDragging]);

  const compactForReorder = isDragging;

  return (
    <div
      id={htmlId}
      ref={setContainerRef}
      className={`overflow-hidden rounded-2xl border border-[#203347] bg-[#141720] transition-all ${
        isDragging ? 'opacity-55 ring-2 ring-[rgba(0,201,167,0.3)]' : ''
      }`}
    >
      <div className={`flex justify-between gap-3 px-4 ${compactForReorder ? 'items-center py-3' : 'items-start py-4'}`}>
        <div className={`flex min-w-0 gap-3 ${compactForReorder ? 'items-center' : 'items-start'}`}>
          {coverImageUrl ? (
            <button
              ref={drag}
              type="button"
              onPointerDown={() => {
                onExerciseFocus(exerciseIdx);
                pressTimerRef.current = window.setTimeout(() => {
                  setIsPressing(true);
                  longPressActivatedRef.current = true;
                  onReorderClick();
                }, 400);
              }}
              onPointerUp={() => {
                if (pressTimerRef.current) {
                  window.clearTimeout(pressTimerRef.current);
                  pressTimerRef.current = null;
                }
                setIsPressing(false);
              }}
              onPointerCancel={() => {
                if (pressTimerRef.current) {
                  window.clearTimeout(pressTimerRef.current);
                  pressTimerRef.current = null;
                }
                setIsPressing(false);
                longPressActivatedRef.current = false;
              }}
              onClick={() => {
                if (longPressActivatedRef.current) {
                  longPressActivatedRef.current = false;
                  return;
                }
                if (!isDragging) onThumbnailClick?.();
              }}
              className={`shrink-0 overflow-hidden rounded-xl transition-all duration-150 ${
                compactForReorder ? 'h-10 w-10' : 'mt-0.5 h-11 w-11'
              } ${isPressing ? 'scale-[0.91] ring-2 ring-[rgba(0,201,167,0.8)] shadow-[0_0_16px_rgba(0,201,167,0.5)]' : ''}`}
              aria-label={`Ver detalles de ${exercise.name}`}
            >
              <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
            </button>
          ) : (
            <button
              ref={drag}
              onPointerDown={() => onExerciseFocus(exerciseIdx)}
              className={`flex shrink-0 items-center justify-center rounded-xl bg-[rgba(0,81,71,0.2)] active:scale-[0.98] ${
                compactForReorder ? 'h-10 w-10' : 'mt-0.5 h-12 w-12'
              }`}
              type="button"
              aria-label={`Reordenar ${exercise.name}`}
            >
              <GripVertical size={18} className="text-[#00C9A7]" />
            </button>
          )}

          <div className="min-w-0">
            <h2 className={`font-bold italic uppercase leading-tight tracking-tight text-white ${compactForReorder ? 'text-base' : 'text-xl'}`}>
              {exercise.name}
            </h2>
            {!compactForReorder && (
              <p className="mt-0.5 text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Ejercicio {exerciseIdx + 1} de {totalExercises} - {exercise.muscle}
                {exercise.implement ? ` - ${exercise.implement}` : ''}
              </p>
            )}
          </div>
        </div>

        {!compactForReorder && (
          <div className="flex items-center gap-1">
            <button
              onClick={onReorderClick}
              className="rounded-lg p-2 transition-colors bg-[#1A2D42]"
              type="button"
              aria-label="Reordenar ejercicios"
            >
              <ArrowUpDown size={16} className="text-[#9BAEC1]" />
            </button>
            <button
              onClick={(event) => {
                onExerciseFocus(exerciseIdx);
                onExerciseMenu(exerciseIdx, event.currentTarget.getBoundingClientRect());
              }}
              className={`rounded-lg p-2 transition-colors ${
                currentExerciseIndex === exerciseIdx ? 'bg-[#203347]' : 'bg-[#1A2D42]'
              }`}
              type="button"
              aria-label={`Abrir acciones de ${exercise.name}`}
            >
              <MoreVertical size={16} className="text-white" />
            </button>
          </div>
        )}
      </div>

      {!compactForReorder && (
        <>
      <div className="px-4 pb-4">
        <label
          htmlFor={`${htmlId}-notes`}
          className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-[#00C9A7]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Notas
        </label>
        <input
          id={`${htmlId}-notes`}
          type="text"
          value={exercise.notes ?? ''}
          onChange={(event) => {
            onExerciseFocus(exerciseIdx);
            onExerciseNotesChange(exerciseIdx, event.target.value);
          }}
          placeholder="Tecnica, molestias o sensacion de la serie."
          className="h-12 w-full rounded-2xl border border-[rgba(0,201,167,0.14)] bg-[#13263A] px-4 text-sm text-white outline-none transition-colors focus:border-[rgba(0,201,167,0.4)] placeholder:text-[#6F859A]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
      </div>

      <div className="border-b border-[rgba(73,72,71,0.1)] bg-[rgba(32,31,31,0.5)] px-4 py-3">
        <div className="grid grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)_52px] gap-2 text-center">
          <span
            className="text-[10px] font-semibold tracking-widest text-[#9BAEC1]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            SET
          </span>
          <span
            className="text-[10px] font-semibold tracking-widest text-[#00C9A7]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {weightUnitLabel.toUpperCase()}
          </span>
          <span
            className="text-[10px] font-semibold tracking-widest text-[#00C9A7]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            REPS
          </span>
          <span className="flex items-center justify-center text-[#00C9A7]">
            <Check size={14} strokeWidth={3} />
          </span>
        </div>
      </div>

      <div>
        {exercise.sets.map((set, setIdx) => {
          const weightDraft = weightDrafts[set.id];
          const suggestedWeight = set.suggestedKg ?? (showPreviousWeight ? set.prevKg : 0);
          const suggestedReps = set.suggestedReps ?? (showPreviousWeight ? set.prevReps : 0);
          const weightPlaceholder =
            !bodyweightExercise && suggestedWeight > 0 ? formatWeightInputValue(suggestedWeight, weightUnit) : '';
          const repsPlaceholder = suggestedReps > 0 ? String(suggestedReps) : '';
          const showWarmupLabel = set.kind === 'warmup';
          const normalSetNumber = exercise.sets.slice(0, setIdx).filter((s) => s.kind !== 'warmup').length + 1;

          return (
            <div
              key={`${htmlId}-set-${set.id}`}
              className={`border-b border-[rgba(73,72,71,0.1)] px-4 py-4 last:border-b-0 ${
                set.completed ? 'bg-[rgba(0,201,167,0.04)]' : ''
              }`}
            >
              <div className="grid grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)_52px] items-center gap-2">
                <div className="text-center">
                  <button
                    onClick={(event) => {
                      onExerciseFocus(exerciseIdx);
                      onSetMenu(exerciseIdx, setIdx, event.currentTarget.getBoundingClientRect());
                    }}
                    className="flex w-full flex-col items-center rounded-lg px-1 py-1 hover:bg-white/5"
                    type="button"
                  >
                    <span
                      className={`font-bold italic ${
                        showWarmupLabel ? 'text-base text-[#F5B942]' : 'text-lg text-white'
                      }`}
                    >
                      {showWarmupLabel ? 'W' : normalSetNumber}
                    </span>
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-widest ${
                        showWarmupLabel ? 'text-[#F5B942]' : 'text-[#5D6474]'
                      }`}
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {showWarmupLabel ? 'Warm' : 'Set'}
                    </span>
                  </button>
                </div>

                <div>
                  {bodyweightExercise ? (
                    <div className="rounded-xl border border-[rgba(245,185,66,0.16)] bg-[rgba(245,185,66,0.12)] px-3 py-3 text-center">
                      <span
                        className="block text-sm font-semibold uppercase tracking-widest text-[#F5B942]"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        PC
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`rounded-xl border px-3 py-2.5 transition-colors ${
                        set.completed
                          ? 'border-[rgba(0,201,167,0.26)] bg-[rgba(0,201,167,0.08)]'
                          : 'border-[rgba(153,181,215,0.12)] bg-[#1A2231]'
                      }`}
                    >
                      <input
                        type="text"
                        inputMode="decimal"
                        value={weightDraft ?? (set.kg > 0 ? formatWeightInputValue(set.kg, weightUnit) : '')}
                        onFocus={() => onExerciseFocus(exerciseIdx)}
                        onChange={(event) => {
                          const nextValue = event.target.value.replace(',', '.');
                          if (!/^(?:0|[1-9]\d{0,2}(?:\.\d{0,2})?)?$/.test(nextValue)) {
                            return;
                          }

                          setWeightDrafts((previous) => ({
                            ...previous,
                            [set.id]: nextValue,
                          }));
                          onSetValueChange(exerciseIdx, setIdx, 'kg', nextValue);
                        }}
                        onBlur={() => {
                          setWeightDrafts((previous) => {
                            const next = { ...previous };
                            if (next[set.id] === '0') {
                              return next;
                            }

                            delete next[set.id];
                            return next;
                          });
                        }}
                        placeholder={weightPlaceholder}
                        className="w-full bg-transparent text-center text-base font-semibold text-white outline-none placeholder:text-white/35"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div
                    className={`rounded-xl border px-3 py-2.5 transition-colors ${
                      set.completed
                        ? 'border-[rgba(0,201,167,0.26)] bg-[rgba(0,201,167,0.08)]'
                        : 'border-[rgba(153,181,215,0.12)] bg-[#1A2231]'
                    }`}
                  >
                    <input
                      type="text"
                      inputMode="numeric"
                      value={set.reps > 0 ? String(set.reps) : ''}
                      onFocus={() => onExerciseFocus(exerciseIdx)}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        if (!/^\d{0,2}$/.test(nextValue)) {
                          return;
                        }

                        const parsedValue = Number.parseInt(nextValue || '0', 10);
                        if (nextValue && parsedValue > 99) {
                          return;
                        }

                        onSetValueChange(exerciseIdx, setIdx, 'reps', nextValue);
                      }}
                      placeholder={repsPlaceholder}
                      className="w-full bg-transparent text-center text-base font-semibold text-white outline-none placeholder:text-white/35"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    />
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => onSetToggleComplete(exerciseIdx, setIdx)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                      set.completed
                        ? 'bg-[#00C9A7]'
                        : 'border border-[rgba(0,201,167,0.22)] bg-[rgba(0,201,167,0.12)]'
                    }`}
                    type="button"
                    aria-label={set.completed ? 'Marcar serie como pendiente' : 'Marcar serie como realizada'}
                  >
                    <Check
                      size={15}
                      className={set.completed ? 'text-[#003830]' : 'text-[#00C9A7]'}
                      strokeWidth={3}
                    />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-[rgba(73,72,71,0.1)] px-4 py-4">
        <button
          onClick={() => onAddSet(exerciseIdx)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#203347] bg-[#1A2D42] py-3 transition-colors active:bg-[#203347]"
          type="button"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#00C9A7]">
            <Plus size={12} className="text-[#00C9A7]" />
          </div>
          <span className="text-[10px] font-semibold text-white">Añadir serie</span>
        </button>

        <button
          onClick={() => {
            onExerciseFocus(exerciseIdx);
            onOpenRestTimer(exerciseIdx);
          }}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-[rgba(0,201,167,0.22)] bg-[rgba(0,201,167,0.08)] py-3 transition-colors active:bg-[rgba(0,201,167,0.14)]"
          type="button"
          aria-label="Editar descanso"
        >
          <TimerReset size={16} className="text-[#00C9A7]" />
          <span className="text-[10px] font-semibold text-[#00C9A7]">Editar Descanso</span>
        </button>

        <button
          onClick={() => onRemoveLastSet(exerciseIdx)}
          disabled={exercise.sets.length <= 1}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-[rgba(229,57,53,0.18)] bg-[rgba(229,57,53,0.08)] py-3 text-[#FF7D7D] transition-colors active:bg-[rgba(229,57,53,0.14)] disabled:opacity-45"
          type="button"
        >
          <Trash2 size={16} />
          <span className="text-[10px] font-semibold">Eliminar serie</span>
        </button>
      </div>
        </>
      )}
    </div>
  );
}
