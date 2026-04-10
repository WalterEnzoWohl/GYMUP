import { brandLogoWhite } from '@/assets';

export function AppSetupScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08111C] px-5">
      <div className="w-full max-w-[460px] rounded-[32px] border border-[rgba(0,201,167,0.12)] bg-[#102235] p-6 text-center shadow-[0_32px_80px_rgba(0,0,0,0.45)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[rgba(0,201,167,0.18)] bg-[#0B1F33]">
          <img src={brandLogoWhite} alt="WOHL" className="h-14 w-14 object-contain" />
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.28em] text-[#00C9A7]">Configuración requerida</p>
        <h1 className="mt-2 text-3xl font-black tracking-[0.12em] text-white">WOHL necesita Supabase</h1>
        <p className="mt-3 text-sm leading-6 text-[#9BAEC1]">
          Configura <code className="text-white">VITE_SUPABASE_URL</code> y{' '}
          <code className="text-white">VITE_SUPABASE_ANON_KEY</code> en{' '}
          <code className="text-white">.env.local</code> para activar el sistema real.
        </p>
      </div>
    </div>
  );
}
