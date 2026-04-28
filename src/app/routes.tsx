import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import Root from './Root';

const CHUNK_RELOAD_KEY = 'wohl.chunk-reload';

function lazyPage(importPage: () => Promise<{ default: ComponentType }>): RouteObject['lazy'] {
  return async () => {
    try {
      const module = await importPage();
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      return { Component: module.default };
    } catch (error) {
      const isStaleChunk =
        error instanceof TypeError &&
        (error.message.includes('Failed to fetch dynamically imported module') ||
          error.message.includes('Importing a module script failed'));

      if (isStaleChunk && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
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
