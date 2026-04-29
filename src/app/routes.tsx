import { useEffect } from 'react';
import type { ComponentType } from 'react';
import { createBrowserRouter, isRouteErrorResponse, useRouteError, type RouteObject } from 'react-router';
import Root from './Root';

const CHUNK_RELOAD_KEY = 'wohl.chunk-reload';
const CHUNK_RELOAD_COOLDOWN_MS = 10_000;

function getErrorMessage(error: unknown) {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return '';
}

function isRecoverableChunkError(error: unknown) {
  const message = getErrorMessage(error);
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Loading chunk') ||
    message.includes('ChunkLoadError')
  );
}

function shouldReloadChunkError() {
  const previousAttempt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? '0');
  return !previousAttempt || Date.now() - previousAttempt > CHUNK_RELOAD_COOLDOWN_MS;
}

function markChunkReloadAttempt() {
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
}

function ChunkErrorBoundary() {
  const error = useRouteError();
  const isChunkError = isRecoverableChunkError(error);
  const message = getErrorMessage(error);

  useEffect(() => {
    if (isChunkError && shouldReloadChunkError()) {
      markChunkReloadAttempt();
      window.location.reload();
    }
  }, [isChunkError]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08111C] px-5">
      <div className="w-full max-w-[420px] rounded-[32px] border border-[rgba(0,201,167,0.12)] bg-[#102235] p-6 text-center shadow-[0_32px_80px_rgba(0,0,0,0.45)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#00C9A7]">WOHL</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Necesitamos recargar la app</h1>
        <p className="mt-3 text-sm leading-6 text-[#9BAEC1]">
          {isChunkError
            ? 'La aplicación detectó una versión nueva o un módulo vencido. Recargarla suele resolverlo en un segundo.'
            : 'La app encontró un error inesperado. Podemos recargar y volver a intentar sin perder más tiempo.'}
        </p>

        {!isChunkError && message ? (
          <p className="mt-4 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(7,12,20,0.55)] px-4 py-3 text-left text-xs leading-5 text-[#C8D0DC]">
            {message}
          </p>
        ) : null}

        {isRouteErrorResponse(error) ? (
          <p className="mt-4 text-sm text-[#90A4B8]">
            {error.status} {error.statusText}
          </p>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="flex-1 rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#141A28] py-4 text-sm font-semibold text-white"
          >
            Ir al inicio
          </button>
          <button
            type="button"
            onClick={() => {
              markChunkReloadAttempt();
              window.location.reload();
            }}
            className="flex-1 rounded-2xl border border-[rgba(0,201,167,0.3)] bg-[#00C9A7] py-4 text-sm font-extrabold text-[#041016]"
          >
            Recargar app
          </button>
        </div>
      </div>
    </div>
  );
}

function lazyPage(importPage: () => Promise<{ default: ComponentType }>): RouteObject['lazy'] {
  return async () => {
    try {
      const module = await importPage();
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      return { Component: module.default };
    } catch (error) {
      if (isRecoverableChunkError(error) && shouldReloadChunkError()) {
        markChunkReloadAttempt();
        window.location.reload();
        return { Component: () => null };
      }

      throw error;
    }
  };
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    errorElement: <ChunkErrorBoundary />,
    children: [
      { index: true, lazy: lazyPage(() => import('@/features/home/pages/HomePage')) },
      { path: 'session', lazy: lazyPage(() => import('@/features/session/pages/TrainingSessionPage')) },
      { path: 'post-session', lazy: lazyPage(() => import('@/features/session/pages/PostSessionPage')) },
      { path: 'workouts', lazy: lazyPage(() => import('@/features/routines/pages/WorkoutsPage')) },
      { path: 'profile', lazy: lazyPage(() => import('@/features/profile/pages/ProfilePage')) },
      { path: 'profile/edit', lazy: lazyPage(() => import('@/features/profile/pages/ProfileEditorPage')) },
      { path: 'onboarding', lazy: lazyPage(() => import('@/features/onboarding/pages/OnboardingPage')) },
      { path: 'config', lazy: lazyPage(() => import('@/features/settings/pages/ConfigPage')) },
      { path: 'config/password', lazy: lazyPage(() => import('@/features/auth/pages/ChangePasswordPage')) },
      { path: 'config/help', lazy: lazyPage(() => import('@/features/settings/pages/HelpCenterPage')) },
      { path: 'config/support', lazy: lazyPage(() => import('@/features/settings/pages/SupportContactPage')) },
      { path: 'config/terms', lazy: lazyPage(() => import('@/features/settings/pages/TermsPage')) },
      { path: 'routine/new', lazy: lazyPage(() => import('@/features/routines/pages/RoutineDetailPage')) },
      { path: 'routine/:id/edit', lazy: lazyPage(() => import('@/features/routines/pages/RoutineDetailPage')) },
      { path: 'routine/:id', lazy: lazyPage(() => import('@/features/routines/pages/RoutineDetailPage')) },
{ path: 'session-history/:id', lazy: lazyPage(() => import('@/features/history/pages/SessionHistoryPage')) },
      { path: 'muscle-progress/:id', lazy: lazyPage(() => import('@/features/history/pages/MuscleProgressPage')) },
      { path: 'history', lazy: lazyPage(() => import('@/features/history/pages/HistoryPage')) },
      { path: 'metrics', lazy: lazyPage(() => import('@/features/history/pages/MetricsPage')) },
      { path: 'exercise-catalog', lazy: lazyPage(() => import('@/features/exercises/pages/ExerciseCatalogPage')) },
      { path: 'exercise-explore', lazy: lazyPage(() => import('@/features/exercises/pages/ExerciseExplorePage')) },
      { path: 'program-templates', lazy: lazyPage(() => import('@/features/routines/pages/ProgramTemplatesPage')) },
    ],
  },
]);
