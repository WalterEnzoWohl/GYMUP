import { useCallback, useLayoutEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ShellBounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface FilterSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function FilterSheet({ open, title, onClose, children }: FilterSheetProps) {
  const [shellBounds, setShellBounds] = useState<ShellBounds | null>(null);

  const syncShellBounds = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

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
    if (!open || typeof window === 'undefined') {
      return;
    }

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
  }, [open, syncShellBounds]);

  if (!open) {
    return null;
  }

  const sheet = (
    <div
      className="fixed z-50"
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
        aria-label={`Cerrar selector de ${title}`}
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      <div
        className="absolute bottom-0 left-0 right-0 flex max-h-[70%] flex-col rounded-t-3xl"
        style={{ background: '#1A2D42' }}
      >
        <div className="mx-auto mb-0 mt-4 h-1 w-10 shrink-0 rounded-full bg-[#203347]" />
        <div className="flex shrink-0 items-center justify-between px-5 py-3">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#9BAEC1]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          {children}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(sheet, document.body) : sheet;
}
