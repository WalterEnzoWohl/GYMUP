import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { RouterProvider } from 'react-router';
import { brandLogoWhite } from '@/assets';
import { AppDataProvider } from '@/core/app-data/AppDataContext';
import { router } from './routes';
import { AuthScreen } from '@/features/auth/components/AuthScreen';
import { AppSetupScreen } from '@/shared/components/layout/AppSetupScreen';
import { getSupabaseClient, isSupabaseConfigured } from '@/shared/lib/supabase';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08111C] px-5">
      <div className="w-full max-w-[390px] rounded-[32px] border border-[rgba(0,201,167,0.12)] bg-[#102235] px-8 py-8 text-center text-white shadow-[0_32px_80px_rgba(0,0,0,0.45)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[rgba(0,201,167,0.18)] bg-[#0B1F33]">
          <img src={brandLogoWhite} alt="WOHL" className="h-14 w-14 object-contain" />
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.28em] text-[#00C9A7]">Sistema WOHL</p>
        <h1 className="mt-2 text-3xl font-black tracking-[0.18em]">WOHL</h1>
        <p className="mt-3 text-sm text-[#9BAEC1]">Sincronizando tu sistema de progreso y rendimiento.</p>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const client = getSupabaseClient();

    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (_event === 'SIGNED_IN') {
        void router.navigate('/');
      }
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return <AppSetupScreen />;
  }

  if (!authReady) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <AppDataProvider session={session}>
      <RouterProvider router={router} />
    </AppDataProvider>
  );
}
