import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { ActiveWorkoutDock } from './components/ActiveWorkoutDock';
import { BottomNav } from './components/BottomNav';
import { useAppData } from './data/AppDataContext';
import { hasCompletedOnboarding } from './data/userProfileUtils';

const HIDE_NAV_PATHS = ['/session', '/post-session', '/onboarding'];

export default function Root() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeWorkout, appSettings, error, refreshAppData, routines, status, userProfile } = useAppData();
  const hideNav = HIDE_NAV_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));
  const showActiveWorkoutDock = !hideNav && status === 'ready' && Boolean(activeWorkout);
  const isLightMode = appSettings.theme === 'light';
  const onboardingComplete = hasCompletedOnboarding(userProfile);
  const isOnboardingRoute = location.pathname === '/onboarding';
  const needsOnboarding = status === 'ready' && !onboardingComplete;
  const showEmptyAccountState =
    status === 'ready' && onboardingComplete && location.pathname === '/' && routines.length === 0;

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
          </div>
        ) : needsOnboarding && !isOnboardingRoute ? (
          <Navigate to="/onboarding" replace />
        ) : !needsOnboarding && isOnboardingRoute ? (
          <Navigate to="/" replace />
        ) : showEmptyAccountState ? (
          <div className="flex flex-col gap-6 px-5 py-6 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#00C9A7]">
                Bienvenido
              </span>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Tu cuenta ya esta creada</h1>
              <p className="mt-2 text-sm text-[#90A4B8]">
                Empieza creando tu primera estructura. Desde ahi ya podras registrar sesiones reales y usar WOHL como tu sistema personal de progreso.
              </p>
            </div>

            <div className="rounded-3xl border border-[rgba(127,152,255,0.16)] bg-[rgba(127,152,255,0.07)] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7F98FF]">Siguiente paso</p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-white">Crea tu primer sistema</h2>
              <p className="mt-2 text-sm text-[#C7D2FE]">
                Puedes arrancar con una estructura Upper/Lower, Push Pull Legs o un sistema totalmente personalizado.
              </p>
              <button
                onClick={() => navigate('/routine-editor/new')}
                className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[#7F98FF] py-4 font-extrabold text-[#0B1020] transition-colors active:bg-[#6F89F0]"
              >
                Crear primer sistema
              </button>
            </div>

            <button
              onClick={() => navigate('/session', { state: { mode: 'free' } })}
              className="flex w-full items-center justify-center rounded-2xl border border-[rgba(245,185,66,0.24)] bg-[rgba(245,185,66,0.08)] py-4 font-bold text-[#F5B942] transition-colors active:bg-[rgba(245,185,66,0.14)]"
            >
              Empezar entrenamiento vacio
            </button>
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
