import { AlertTriangle, Play, Square, X } from 'lucide-react';

type ActiveWorkoutEditLockModalProps = {
  activeWorkoutName: string;
  onResume: () => void;
  onFinish: () => void;
  onCancel: () => void;
  eyebrow?: string;
  title?: string;
  description?: string;
  subjectLabel?: string;
  resumeLabel?: string;
  finishLabel?: string;
  cancelLabel?: string;
};

export function ActiveWorkoutEditLockModal({
  activeWorkoutName,
  onResume,
  onFinish,
  onCancel,
  eyebrow = 'Edición bloqueada',
  title = 'No podés editar esta rutina ahora',
  description = 'Tenés un entrenamiento activo en curso. Para cuidar la coherencia de esa sesión y del historial, primero necesitás volver al entrenamiento o cerrarlo.',
  subjectLabel = 'Entrenamiento activo',
  resumeLabel = 'Volver al entrenamiento activo',
  finishLabel = 'Finalizar entrenamiento',
  cancelLabel = 'Cancelar acción',
}: ActiveWorkoutEditLockModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
      <button
        aria-label="Cerrar advertencia"
        className="absolute inset-0 bg-black/75"
        onClick={onCancel}
        type="button"
      />

      <div
        className="relative w-full max-w-[22rem] overflow-hidden rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#1A2D42] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(229,57,53,0.14)]">
            <AlertTriangle size={22} className="text-[#FF8A80]" />
          </div>
          <button
            onClick={onCancel}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#203347] text-[#9BAEC1]"
            type="button"
            aria-label="Cerrar advertencia"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#FF8A80]">{eyebrow}</p>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">{title}</h3>
        <p
          className="mt-3 text-sm leading-6 text-[#D6D6D6]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {description}
        </p>

        <div className="mt-4 rounded-2xl border border-[rgba(0,201,167,0.12)] bg-[rgba(0,201,167,0.06)] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#00C9A7]">{subjectLabel}</p>
          <p className="mt-1 text-sm font-semibold text-white">{activeWorkoutName}</p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={onResume}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 font-bold text-black"
            type="button"
          >
            <Play size={16} className="text-black" />
            {resumeLabel}
          </button>

          <button
            onClick={onFinish}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#13263A] py-4 font-semibold text-white"
            type="button"
          >
            <Square size={16} className="text-[#00C9A7]" />
            {finishLabel}
          </button>

          <button
            onClick={onCancel}
            className="w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] py-4 font-medium text-[#9BAEC1]"
            type="button"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
