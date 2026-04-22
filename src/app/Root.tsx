import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { ActiveWorkoutDock } from '@/shared/components/layout/ActiveWorkoutDock';
import { BottomNav } from '@/shared/components/layout/BottomNav';
import { useAppData } from '@/core/app-data/AppDataContext';
import { hasCompletedOnboarding } from '@/shared/lib/userProfileUtils';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { ProgramSelectionScreen } from '@/features/routines/components/ProgramSelectionScreen';

const BASE_HIDE_NAV_PATHS = ['/session', '/post-session', '/onboarding', '/exercise-catalog', '/exercise-explore'];

function isRoutineEditorPath(pathname: string) {
  return pathname === '/routine/new' || /^\/routine\/[^/]+\/edit$/.test(pathname);
}

export default function Root() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeWorkout, appSettings, error, refreshAppData, routines, status, userProfile } = useAppData();
  const hideNav =
    BASE_HIDE_NAV_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(p + '/')) ||
    isRoutineEditorPath(location.pathname);
  const showActiveWorkoutDock = !hideNav && status === 'ready' && Boolean(activeWorkout);
  const isLightMode = appSettings.theme === 'light';
  const onboardingComplete = hasCompletedOnboarding(userProfile);
  const isOnboardingRoute = location.pathname === '/onboarding';
  const needsOnboarding = status === 'ready' && !onboardingComplete;
  const showEmptyAccountState =
    status === 'ready' && onboardingComplete && location.pathname === '/' && routines.length === 0;

  const sessionInitRedirectRef = useRef(false);

  useEffect(() => {
    if (status === 'ready') {
      sessionInitRedirectRef.current = true;
    }
  }, [status]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', appSettings.theme === 'dark');
  }, [appSettings.theme]);

  return (
    <div
      className={`wohl-stage flex min-h-[100dvh] items-stretch justify-center md:items-center ${isLightMode ? 'wohl-light-stage' : ''}`}
    >
      <div
        className={`wohl-shell relative flex flex-col ${isLightMode ? 'wohl-light-mode' : ''}`}
        style={{
          width: '100%',
          maxWidth: '430px',
          height: '100dvh',
          maxHeight: '100dvh',
          overflow: 'hidden',
        }}
      >
        {status === 'loading' ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-[#9BAEC1]">
            Cargando tus datos reales...
          </div>
        ) : status === 'error' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-sm text-[#9BAEC1]">{error ?? 'No se pudo cargar la app.'}</p>
            <button
              onClick={() => void refreshAppData()}
              className="rounded-2xl bg-[#00C9A7] px-5 py-3 text-sm font-bold text-black"
            >
              Reintentar
            </button>
            <button
              onClick={() => void getSupabaseClient().auth.signOut()}
              className="rounded-2xl border border-[rgba(153,181,215,0.18)] bg-[rgba(16,35,58,0.8)] px-5 py-3 text-sm font-semibold text-white"
            >
              Volver al acceso
            </button>
          </div>
        ) : needsOnboarding && !isOnboardingRoute ? (
          <Navigate to="/onboarding" replace />
        ) : !needsOnboarding && isOnboardingRoute ? (
          <Navigate to="/" replace />
        ) : status === 'ready' && !sessionInitRedirectRef.current && Boolean(activeWorkout) && location.pathname === '/' ? (
          <Navigate to="/session" replace />
        ) : showEmptyAccountState ? (
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            <ProgramSelectionScreen includeCreateCustomButton />
          </div>
        ) : (
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
            style={{ paddingBottom: showActiveWorkoutDock ? '7.25rem' : undefined }}
          >
            <Outlet />
          </div>
        )}

        {showActiveWorkoutDock && <ActiveWorkoutDock />}
        {!hideNav && status === 'ready' && !showEmptyAccountState && <BottomNav />}
      </div>
    </div>
  );
}
