import { Lightbulb, SquarePlay, Target } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Header } from '@/shared/components/layout/Header';

const helpSections = [
  {
    title: 'Inicio',
    items: [
      'Ves la fecha actual, el resumen del día y si ya entrenaste hoy.',
      'Podés iniciar un entrenamiento desde tu rutina activa o abrir la selección de días disponibles.',
      'El bloque "Próximo entrenamiento" te muestra el día que te toca hoy o el siguiente si ya entrenaste.',
    ],
  },
  {
    title: 'Entrenamientos',
    items: [
      'Elegís tu rutina activa y eso impacta en Inicio, en las sugerencias y en los entrenamientos disponibles.',
      'También podés crear rutinas nuevas, duplicar una existente, editarla o eliminarla.',
      'Si no querés depender de una rutina, podés empezar un entrenamiento libre y cargar los ejercicios manualmente.',
    ],
  },
  {
    title: 'Sesión activa',
    items: [
      'Cada entrenamiento muestra volumen total, series completas, notas de sesión y todos los ejercicios cargados.',
      'Podés editar peso, repeticiones, marcar series como completas, agregar o eliminar series y cambiar su tipo entre calentamiento o serie normal.',
      'El menú de cada ejercicio te deja ver historial, reemplazarlo o eliminarlo de la sesión.',
      'La sesión activa se guarda como borrador para que no pierdas el contexto si salís de la pantalla.',
    ],
  },
  {
    title: 'Entrenamiento libre',
    items: [
      'Arranca vacío y no depende de una rutina predefinida.',
      'Podés sumar ejercicios desde tu base actual o crear uno nuevo manualmente.',
      'Se guarda en el historial igual que cualquier otra sesión, pero se distingue como "Sin rutina".',
    ],
  },
  {
    title: 'Historial',
    items: [
      'Consultás todas tus sesiones por mes y filtro de músculo.',
      'Cada sesión tiene detalle completo de volumen, duración, calorías, RPE y ejercicios realizados.',
      'Los entrenamientos pasados se pueden editar, salvo que tengas una sesión activa en curso.',
    ],
  },
  {
    title: 'Perfil',
    items: [
      'Mostrás tu información personal, nutrición sugerida, progreso por grupos musculares y sesiones recientes.',
      'Podés cambiar objetivo, editar tus datos y entrar rápido a configuración.',
      'El progreso mensual usa los ejercicios directos registrados en tus sesiones reales.',
    ],
  },
  {
    title: 'Configuración',
    items: [
      'Podés cambiar contraseña, elegir unidades, cambiar tema, definir descanso por defecto, activar incremento automático de peso y decidir si querés ver el último peso en el mismo ejercicio.',
      'También podés exportar tu historial a CSV para analizarlo fuera de WOHL.',
      'Desde soporte accedés a este manual, al formulario de contacto y a los términos y condiciones.',
    ],
  },
];

const tips = [
  'Definí una rutina activa para que Inicio y Entrenamientos siempre te propongan el día correcto.',
  'Usá entrenamiento libre para sesiones improvisadas, accesorios extra o pruebas rápidas.',
  'Si querés progresar mejor, dejá activado "Mostrar último peso" y compará siempre con tu referencia anterior.',
  'Exportá tu CSV cada tanto para tener un respaldo externo de tus datos.',
];

export default function HelpCenterPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header showBack title="Centro de ayuda" onBack={() => navigate('/config')} />

      <div className="flex flex-col gap-6 px-4 py-5 pb-7 sm:px-5 sm:py-6">
        <div className="rounded-3xl border border-[rgba(0,201,167,0.14)] bg-[rgba(0,201,167,0.06)] p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(0,201,167,0.12)]">
              <SquarePlay size={20} className="text-[#00C9A7]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-white">Manual de WOHL</h1>
              <p className="mt-2 text-sm leading-6 text-[#C8C8C8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Esta guía resume todas las funciones principales de la app y cómo sacarles más partido en el uso diario.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {helpSections.map((section) => (
            <div key={section.title} className="rounded-3xl bg-[#13263A] p-5">
              <h2 className="text-xl font-bold tracking-tight text-white">{section.title}</h2>
              <div className="mt-4 flex flex-col gap-3">
                {section.items.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#00C9A7]" />
                    <p className="text-sm leading-6 text-[#D4D4D4]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-[rgba(245,185,66,0.18)] bg-[rgba(245,185,66,0.08)] p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(245,185,66,0.15)]">
              <Lightbulb size={20} className="text-[#F5B942]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-white">Consejos para aprovecharla mejor</h2>
              <div className="mt-4 flex flex-col gap-3">
                {tips.map((tip) => (
                  <p key={tip} className="text-sm leading-6 text-[#F2E3BF]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    • {tip}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/workouts')}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 font-bold text-black"
          type="button"
        >
          <Target size={18} />
          Ir a entrenamientos
        </button>
      </div>
    </div>
  );
}
