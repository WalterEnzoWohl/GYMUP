import { useState } from 'react';
import { LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { brandLogoWhite } from '@/assets';
import { getAuthRedirectUrl, getSupabaseClient } from '@/shared/lib/supabase';

export function AuthScreen() {
  const [mode, setMode] = useState<'choice' | 'signin' | 'signup'>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isSignIn = mode === 'signin';
  const showForm = mode !== 'choice';

  const submit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const client = getSupabaseClient();
      const emailRedirectTo = getAuthRedirectUrl();
      const response = isSignIn
        ? await client.auth.signInWithPassword({ email: email.trim(), password })
        : await client.auth.signUp({
            email: email.trim(),
            password,
            options: emailRedirectTo
              ? {
                  emailRedirectTo,
                }
              : undefined,
          });

      if (response.error) {
        throw response.error;
      }

      if (!isSignIn && !response.data.session) {
        setMessage('Revisa tu correo para confirmar la cuenta antes de entrar.');
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo iniciar sesion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08111C] px-4 py-5 sm:px-6 sm:py-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-6%] h-[22rem] w-[22rem] rounded-full bg-[rgba(0,201,167,0.06)] blur-[120px]" />
        <div className="absolute right-[-8%] top-[18%] h-[18rem] w-[18rem] rounded-full bg-[rgba(93,130,255,0.08)] blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.03),transparent_34%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[600px] items-center justify-center">
        <div className="w-full rounded-[32px] border border-[rgba(153,181,215,0.14)] bg-[linear-gradient(180deg,rgba(17,37,62,0.96)_0%,rgba(12,27,46,0.98)_100%)] px-6 py-6 shadow-[0_28px_80px_rgba(0,0,0,0.42)] sm:px-9 sm:py-7">
          <div className="mx-auto max-w-[32rem] text-center">
            <div className="mx-auto flex h-[74px] w-[74px] items-center justify-center rounded-full border border-[rgba(0,201,167,0.22)] bg-[rgba(11,31,51,0.78)] shadow-[0_0_0_1px_rgba(0,201,167,0.06),0_0_34px_rgba(0,201,167,0.08)]">
              <img src={brandLogoWhite} alt="WOHL" className="h-[46px] w-[46px] object-contain" />
            </div>

            <h1
              className="mt-4 text-[2.7rem] font-black uppercase leading-none tracking-[0.16em] text-white sm:text-[3rem]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              WOHL
            </h1>

            <p
              className="mt-3 text-[0.86rem] font-medium uppercase tracking-[0.34em] text-[#8D9CB0]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {showForm ? (isSignIn ? 'Optimiza tu rendimiento' : 'Activa tu sistema personal') : 'Elegi como queres continuar'}
            </p>

            <p
              className="mx-auto mt-5 max-w-[28rem] text-[0.98rem] leading-7 text-[#9BAEC1]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {showForm
                ? isSignIn
                  ? 'Ingresa a tu cuenta para guardar tu progreso y optimizar tu rendimiento personal.'
                  : 'Crea tu cuenta para empezar a registrar progreso, sesiones reales y control de rendimiento.'
                : 'Elegí si queres entrar con una cuenta existente o crear una nueva para empezar en WOHL.'}
            </p>
          </div>

          <div className="mx-auto mt-7 flex max-w-[32rem] flex-col gap-3.5">
            {!showForm ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                    setMessage(null);
                  }}
                  className="flex min-h-[4.1rem] w-full items-center justify-center rounded-[24px] border border-[rgba(0,201,167,0.22)] bg-[rgba(0,201,167,0.08)] text-[1rem] font-black text-[#EAFBF8] transition-all duration-200 hover:border-[rgba(0,201,167,0.34)] hover:bg-[rgba(0,201,167,0.12)] active:scale-[0.99]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Iniciar sesion
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setMessage(null);
                  }}
                  className="flex min-h-[4.1rem] w-full items-center justify-center rounded-[24px] bg-[linear-gradient(90deg,#11D7B8_0%,#20C8AF_100%)] text-[1rem] font-black text-[#08111C] shadow-[0_22px_40px_rgba(0,201,167,0.22)] transition-all duration-200 active:scale-[0.99]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Crear cuenta nueva
                </button>
              </>
            ) : (
              <>
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8EA2B8]">Email</span>
                  <div className="group flex items-center gap-4 rounded-[22px] border border-[rgba(153,181,215,0.14)] bg-[rgba(16,35,58,0.92)] px-5 py-[0.9rem] transition-all duration-200 focus-within:border-[rgba(0,201,167,0.34)] focus-within:shadow-[0_0_0_4px_rgba(0,201,167,0.08)]">
                    <Mail size={18} className="shrink-0 text-[#00C9A7]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      spellCheck={false}
                      className="wohl-auth-input w-full border-0 bg-transparent text-[1rem] text-white outline-none placeholder:text-[#65758A]"
                      placeholder="tu@email.com"
                    />
                  </div>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8EA2B8]">Contrasena</span>
                  <div className="group flex items-center gap-4 rounded-[22px] border border-[rgba(153,181,215,0.14)] bg-[rgba(16,35,58,0.92)] px-5 py-[0.9rem] transition-all duration-200 focus-within:border-[rgba(0,201,167,0.34)] focus-within:shadow-[0_0_0_4px_rgba(0,201,167,0.08)]">
                    <LockKeyhole size={18} className="shrink-0 text-[#00C9A7]" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={isSignIn ? 'current-password' : 'new-password'}
                      className="wohl-auth-input w-full border-0 bg-transparent text-[1rem] text-white outline-none placeholder:text-[#65758A]"
                      placeholder="********"
                    />
                  </div>
                </label>

                {error && (
                  <div className="rounded-[22px] border border-[rgba(229,57,53,0.22)] bg-[rgba(229,57,53,0.10)] px-4 py-3 text-sm text-[#FFB4B2]">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="rounded-[22px] border border-[rgba(0,201,167,0.22)] bg-[rgba(0,201,167,0.10)] px-4 py-3 text-sm text-[#AAF6EA]">
                    {message}
                  </div>
                )}

                <button
                  onClick={submit}
                  disabled={loading || !email.trim() || !password.trim()}
                  className="mt-3 flex min-h-[4.1rem] w-full items-center justify-center gap-2 rounded-[24px] bg-[linear-gradient(90deg,#11D7B8_0%,#20C8AF_100%)] text-[1rem] font-black text-[#08111C] shadow-[0_22px_40px_rgba(0,201,167,0.22)] transition-all duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {loading ? <LoaderCircle size={18} className="animate-spin" /> : null}
                  {isSignIn ? 'Entrar' : 'Crear cuenta'}
                </button>

                <div className="mt-2 flex items-center gap-4">
                  <div className="h-px flex-1 bg-[rgba(153,181,215,0.16)]" />
                  <button
                    type="button"
                    onClick={() => {
                      setMode(isSignIn ? 'signup' : 'signin');
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-[1rem] font-medium text-[#9BAEC1] transition-colors hover:text-white"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {isSignIn ? 'Crear cuenta' : 'Ya tengo cuenta'}
                  </button>
                  <div className="h-px flex-1 bg-[rgba(153,181,215,0.16)]" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMode('choice');
                    setError(null);
                    setMessage(null);
                  }}
                  className="text-sm font-medium text-[#7F93A8] transition-colors hover:text-white"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Volver
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
