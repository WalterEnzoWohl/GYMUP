import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Header } from '../components/Header';

const SUPPORT_EMAIL = 'Walterenzowohl@gmail.com';

export default function SupportContactPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('Completá todos los campos antes de enviar el formulario.');
      return;
    }

    setError(null);

    const body = [
      `Nombre: ${name.trim()}`,
      `Email de respuesta: ${email.trim()}`,
      '',
      'Mensaje:',
      message.trim(),
    ].join('\n');

    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      `[WOHL] ${subject.trim()}`
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header showBack title="Contactar soporte" onBack={() => navigate('/config')} />

      <div className="flex flex-col gap-6 px-4 py-5 pb-7 sm:px-5 sm:py-6">
        <div className="rounded-3xl border border-[rgba(0,201,167,0.14)] bg-[rgba(0,201,167,0.06)] p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(0,201,167,0.12)]">
              <Mail size={20} className="text-[#00C9A7]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-white">Formulario de soporte</h1>
              <p className="mt-2 text-sm leading-6 text-[#C8C8C8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Completá el mensaje y WOHL te va a abrir tu aplicación de correo para enviarlo a {SUPPORT_EMAIL}.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-[#13263A] p-5">
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#00C9A7]" htmlFor="support-name">
                Nombre
              </label>
              <input
                id="support-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Cómo te llamás"
                className="w-full rounded-2xl border border-[rgba(0,201,167,0.16)] bg-[#0F131B] px-4 py-3 text-white outline-none transition-colors focus:border-[rgba(0,201,167,0.4)]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#00C9A7]" htmlFor="support-email">
                Email
              </label>
              <input
                id="support-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Tu email para recibir respuesta"
                className="w-full rounded-2xl border border-[rgba(0,201,167,0.16)] bg-[#0F131B] px-4 py-3 text-white outline-none transition-colors focus:border-[rgba(0,201,167,0.4)]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#00C9A7]" htmlFor="support-subject">
                Asunto
              </label>
              <input
                id="support-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Ej. Problema al guardar una sesión"
                className="w-full rounded-2xl border border-[rgba(0,201,167,0.16)] bg-[#0F131B] px-4 py-3 text-white outline-none transition-colors focus:border-[rgba(0,201,167,0.4)]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#00C9A7]" htmlFor="support-message">
                Mensaje
              </label>
              <textarea
                id="support-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Contá qué pasó, qué esperabas que ocurriera y cómo reproducirlo."
                className="min-h-36 w-full resize-none rounded-2xl border border-[rgba(0,201,167,0.16)] bg-[#0F131B] px-4 py-3 text-white outline-none transition-colors focus:border-[rgba(0,201,167,0.4)]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-[rgba(229,57,53,0.16)] bg-[rgba(229,57,53,0.08)] px-4 py-3 text-sm text-[#FFD4D4]">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 font-bold text-black"
            type="button"
          >
            <Send size={18} />
            Enviar mensaje
          </button>
          <button
            onClick={() => navigate('/config')}
            className="w-full rounded-2xl bg-[#13263A] py-4 font-semibold text-white"
            type="button"
          >
            Volver a configuración
          </button>
        </div>
      </div>
    </div>
  );
}
