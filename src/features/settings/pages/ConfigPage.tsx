import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bell,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  Mail,
  Moon,
  Timer,
  TrendingUp,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { Header } from '@/shared/components/layout/Header';
import { useAppData } from '@/core/app-data/AppDataContext';
import type { AppSettings, SessionHistory } from '@/shared/types/models';
import { convertWeightFromKg, getWeightUnitLabel } from '@/shared/lib/unitUtils';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { TimeWheelPicker } from '@/features/onboarding/components/WheelPickers';
import { DEFAULT_TIME, WEEK_DAYS, formatTimeLabel, getTimeParts } from '@/features/onboarding/onboardingConfig';

function escapeCsvValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value).replace(/"/g, '""');
  return /[",\n]/.test(stringValue) ? `"${stringValue}"` : stringValue;
}

function buildCsvContent(sessionHistory: SessionHistory[], unit: AppSettings['weightUnit']) {
  const unitLabel = getWeightUnitLabel(unit);
  const header = [
    'Fecha',
    'Sesión',
    'Rutina vinculada',
    'Músculos',
    'Duración (min)',
    'Calorías',
    `Volumen (${unitLabel})`,
    'RPE promedio',
    'Notas',
    'Ejercicio',
    'Implemento',
    'Músculo principal',
    'Serie',
    `Peso (${unitLabel})`,
    'Repeticiones',
    'RPE serie',
  ];

  const rows = sessionHistory.flatMap((session) => {
    if (session.exercises.length === 0) {
      return [
        [
          session.date,
          session.name,
          session.routineId ? 'Sí' : 'No',
          session.muscle,
          session.duration,
          session.kcal,
          convertWeightFromKg(session.volume, unit).toFixed(unit === 'kg' ? 0 : 1),
          session.avgRpe.toFixed(1),
          session.notes ?? '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ],
      ];
    }

    return session.exercises.flatMap((exercise) =>
      exercise.sets.map((set, index) => [
        session.date,
        session.name,
        session.routineId ? 'Sí' : 'No',
        session.muscle,
        session.duration,
        session.kcal,
        convertWeightFromKg(session.volume, unit).toFixed(unit === 'kg' ? 0 : 1),
        session.avgRpe.toFixed(1),
        session.notes ?? '',
        exercise.name,
        exercise.implement ?? '',
        exercise.muscle,
        index + 1,
        convertWeightFromKg(set.kg, unit).toFixed(unit === 'kg' ? 0 : 1),
        set.reps,
        set.rpe ?? '',
      ])
    );
  });

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\n');
}

function SettingToggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      aria-pressed={value}
      type="button"
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border p-[2px] transition-all ${
        disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'
      } ${
        value
          ? 'border-[rgba(0,201,167,0.38)] bg-[linear-gradient(135deg,#00C9A7_0%,#009F86_100%)] shadow-[0_0_18px_rgba(0,201,167,0.18)]'
          : 'border-[rgba(255,255,255,0.08)] bg-[#242833]'
      }`}
    >
      <span
        className={`block h-6 w-6 rounded-full transition-transform ${
          value
            ? 'translate-x-6 bg-[#032F2A] shadow-[0_6px_12px_rgba(0,0,0,0.25)]'
            : 'translate-x-0 bg-[#F5F7FA] shadow-[0_6px_12px_rgba(0,0,0,0.18)]'
        }`}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="px-1">
      <span
        className="text-[10px] font-bold uppercase tracking-[0.26em]"
        style={{ color: 'rgba(140,255,233,0.78)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {children}
      </span>
    </div>
  );
}

function SettingIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.04)] bg-[#203347]">
      {children}
    </div>
  );
}

function SettingRow({
  icon,
  label,
  description,
  right,
  onClick,
  danger,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  right?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full border-b border-[rgba(255,255,255,0.04)] px-4 py-4 text-left last:border-b-0 ${
        disabled ? 'cursor-not-allowed opacity-65' : 'transition-colors hover:bg-white/5'
      }`}
      type="button"
    >
      <div className="flex items-start gap-4">
        <SettingIcon>{icon}</SettingIcon>
        <div className="min-w-0 flex-1">
          <span className={`block text-[1.03rem] font-semibold leading-6 ${danger ? 'text-[#E53935]' : 'text-white'}`}>
            {label}
          </span>
          {description && (
            <p
              className={`mt-1 text-sm leading-5 ${danger ? 'text-[#D6B9B9]' : 'text-[#9BAEC1]'}`}
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {description}
            </p>
          )}
        </div>
        <div className="shrink-0 self-center pt-0.5">{right ?? <ChevronRight size={17} className="text-[#9BAEC1]" />}</div>
      </div>
    </button>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="grid w-full shrink-0 gap-1 rounded-2xl bg-[#203347] p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-[42px] rounded-xl px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide transition-all ${
            value === option.value
              ? 'bg-[#00C9A7] text-[#041016] shadow-[0_10px_24px_rgba(0,201,167,0.18)]'
              : 'text-[#9BAEC1]'
          }`}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SettingPanel({
  icon,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[rgba(0,201,167,0.14)] bg-[linear-gradient(180deg,rgba(0,201,167,0.08),rgba(19,19,19,0.96))] p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(0,201,167,0.12)]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#C8C8C8]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {body}
          </p>
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  );
}

export default function ConfigPage() {
  const navigate = useNavigate();
  const { appSettings, sessionHistory, updateAppSettings, updateUserProfile, userProfile } = useAppData();
  const [showRestTimerModal, setShowRestTimerModal] = useState(false);
  const [draftRestTimer, setDraftRestTimer] = useState(appSettings.restTimerSeconds);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [timePickerTarget, setTimePickerTarget] = useState<string | null>(null);
  const [timeDraft, setTimeDraft] = useState(() => getTimeParts(userProfile.preferredWorkoutTime || DEFAULT_TIME));

  const csvPreviewCount = useMemo(() => sessionHistory.length, [sessionHistory.length]);
  const selectedNotificationDays = useMemo(
    () => WEEK_DAYS.filter((day) => userProfile.preferredTrainingDays.includes(day.value)),
    [userProfile.preferredTrainingDays]
  );

  const signOut = async () => {
    await getSupabaseClient().auth.signOut();
  };

  useEffect(() => {
    if (!timePickerTarget) {
      return;
    }

    const nextValue =
      timePickerTarget === '__main__'
        ? userProfile.preferredWorkoutTime || DEFAULT_TIME
        : userProfile.preferredWorkoutTimeByDay[timePickerTarget] ||
          userProfile.preferredWorkoutTime ||
          DEFAULT_TIME;

    setTimeDraft(getTimeParts(nextValue));
  }, [timePickerTarget, userProfile.preferredWorkoutTime, userProfile.preferredWorkoutTimeByDay]);

  const handleNotificationToggle = async () => {
    const nextValue = !appSettings.notifyGymDays;
    updateAppSettings({ notifyGymDays: nextValue });

    if (!nextValue) {
      setFeedbackMessage('Las notificaciones de entrenamiento quedaron desactivadas.');
      return;
    }

    if (userProfile.preferredTrainingDays.length === 0) {
      const defaultDays = ['Lunes', 'Miércoles', 'Viernes'];
      const defaultTime = userProfile.preferredWorkoutTime || DEFAULT_TIME;
      await updateUserProfile({
        preferredTrainingDays: defaultDays,
        preferredScheduleMode: 'same',
        preferredWorkoutTime: defaultTime,
        preferredWorkoutTimeByDay: Object.fromEntries(defaultDays.map((day) => [day, defaultTime])),
      });
    }

    setFeedbackMessage('Ya podés elegir qué días querés que WOHL te recuerde tu sesión.');
  };

  const toggleNotificationDay = async (day: string) => {
    const exists = userProfile.preferredTrainingDays.includes(day);

    if (!exists && userProfile.preferredTrainingDays.length >= 6) {
      setFeedbackMessage('Podés elegir hasta 6 días para las notificaciones.');
      return;
    }

    const nextDays = exists
      ? userProfile.preferredTrainingDays.filter((item) => item !== day)
      : [...userProfile.preferredTrainingDays, day];

    const fallbackTime = userProfile.preferredWorkoutTime || DEFAULT_TIME;
    const nextTimeByDay = { ...userProfile.preferredWorkoutTimeByDay };

    nextDays.forEach((selectedDay) => {
      if (!nextTimeByDay[selectedDay]) {
        nextTimeByDay[selectedDay] = fallbackTime;
      }
    });

    Object.keys(nextTimeByDay).forEach((mappedDay) => {
      if (!nextDays.includes(mappedDay)) {
        delete nextTimeByDay[mappedDay];
      }
    });

    await updateUserProfile({
      preferredTrainingDays: nextDays,
      preferredWorkoutTimeByDay: nextTimeByDay,
    });
  };

  const updateNotificationScheduleMode = async (mode: 'same' | 'different') => {
    const fallbackTime = userProfile.preferredWorkoutTime || DEFAULT_TIME;
    const nextTimeByDay =
      mode === 'same'
        ? Object.fromEntries(userProfile.preferredTrainingDays.map((day) => [day, fallbackTime]))
        : Object.fromEntries(
            userProfile.preferredTrainingDays.map((day) => [
              day,
              userProfile.preferredWorkoutTimeByDay[day] || fallbackTime,
            ])
          );

    await updateUserProfile({
      preferredScheduleMode: mode,
      preferredWorkoutTimeByDay: nextTimeByDay,
    });
  };

  const openTimePicker = (day?: string) => {
    const value = day
      ? userProfile.preferredWorkoutTimeByDay[day] || userProfile.preferredWorkoutTime || DEFAULT_TIME
      : userProfile.preferredWorkoutTime || DEFAULT_TIME;

    setTimeDraft(getTimeParts(value));
    setTimePickerTarget(day ?? '__main__');
  };

  const confirmTimePicker = async () => {
    if (!timePickerTarget) {
      return;
    }

    const nextTime = `${timeDraft.hour}:${timeDraft.minute}`;

    if (timePickerTarget === '__main__') {
      await updateUserProfile({
        preferredWorkoutTime: nextTime,
        preferredWorkoutTimeByDay:
          userProfile.preferredScheduleMode === 'same'
            ? Object.fromEntries(userProfile.preferredTrainingDays.map((day) => [day, nextTime]))
            : userProfile.preferredWorkoutTimeByDay,
      });
    } else {
      await updateUserProfile({
        preferredWorkoutTimeByDay: {
          ...userProfile.preferredWorkoutTimeByDay,
          [timePickerTarget]: nextTime,
        },
      });
    }

    setTimePickerTarget(null);
  };

  const handleExportCsv = () => {
    if (sessionHistory.length === 0) {
      setFeedbackMessage('Todavía no hay sesiones para exportar.');
      return;
    }

    const csvContent = buildCsvContent(sessionHistory, appSettings.weightUnit);
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `wohl-historial-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(objectUrl);
    setFeedbackMessage('Exportación lista. El archivo CSV ya se descargó.');
  };

  return (
    <div className="relative flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header showBack title="Configuración" onBack={() => navigate('/profile')} />

      <div className="flex flex-col gap-6 px-4 py-5 pb-7 sm:px-5 sm:py-6">
        <SettingPanel
          icon={<Moon size={20} className="text-[#00C9A7]" />}
          title="Tu app, a tu manera"
          body="Desde acá ajustás cómo querés ver tus datos, cómo se comportan los entrenamientos y cómo acceder a la ayuda cuando la necesites."
        />

        {feedbackMessage && (
          <div className="rounded-2xl border border-[rgba(0,201,167,0.18)] bg-[rgba(0,201,167,0.08)] px-4 py-3 text-sm text-white">
            {feedbackMessage}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <SectionLabel>Cuenta</SectionLabel>
          <div className="overflow-hidden rounded-3xl bg-[#13263A]">
            <SettingRow
              icon={<User size={18} className="text-[#00C9A7]" />}
              label="Editar perfil"
              description="Actualizá tu nombre, peso, altura, objetivo y nivel."
              onClick={() => navigate('/profile/edit')}
            />
            <SettingRow
              icon={<Lock size={18} className="text-[#00C9A7]" />}
              label="Cambiar contraseña"
              description="Protegé tu cuenta cambiando tu contraseña actual."
              onClick={() => navigate('/config/password')}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <SectionLabel>App</SectionLabel>
          <div className="overflow-hidden rounded-3xl bg-[#13263A]">
            <div className="border-b border-[rgba(255,255,255,0.04)] px-4 py-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <SettingIcon>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M2 9h14M9 2v14" stroke="#00C9A7" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </SettingIcon>
                  <div className="min-w-0">
                    <span className="block text-[1.03rem] font-semibold text-white">Unidades</span>
                    <p className="mt-1 text-sm leading-5 text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Definí cómo querés ver y cargar el peso en toda la app.
                    </p>
                  </div>
                </div>
                <div className="w-full sm:max-w-[220px]">
                  <SegmentedControl
                    value={appSettings.weightUnit}
                    options={[
                      { value: 'kg', label: 'KG' },
                      { value: 'lb', label: 'LB' },
                    ]}
                    onChange={(value) => updateAppSettings({ weightUnit: value })}
                  />
                </div>
              </div>
            </div>

            <div className="border-b border-[rgba(255,255,255,0.04)] px-4 py-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <SettingIcon>
                    <Moon size={18} className="text-[#00C9A7]" />
                  </SettingIcon>
                  <div className="min-w-0">
                    <span className="block text-[1.03rem] font-semibold text-white">Tema</span>
                    <p className="mt-1 text-sm leading-5 text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Alterná entre la versión oscura y la versión clara.
                    </p>
                  </div>
                </div>
                <div className="w-full sm:max-w-[220px]">
                  <SegmentedControl
                    value={appSettings.theme}
                    options={[
                      { value: 'dark', label: 'Oscuro' },
                      { value: 'light', label: 'Claro' },
                    ]}
                    onChange={(value) => updateAppSettings({ theme: value })}
                  />
                </div>
              </div>
            </div>

            <SettingRow
              icon={<TrendingUp size={18} className="text-[#00C9A7]" />}
              label="Sonidos"
              description="Los sonidos de confirmación y descanso los activaremos en la próxima fase."
              right={<span className="text-xs font-semibold uppercase tracking-widest text-[#9BAEC1]">Próximamente</span>}
              disabled
            />

            <SettingRow
              icon={<TrendingUp size={18} className="text-[#00C9A7]" />}
              label="Vibración"
              description="La vibración háptica también la dejamos para la siguiente iteración."
              right={<span className="text-xs font-semibold uppercase tracking-widest text-[#9BAEC1]">Próximamente</span>}
              disabled
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <SectionLabel>Entrenamientos</SectionLabel>
          <div className="overflow-hidden rounded-3xl bg-[#13263A]">
            <SettingRow
              icon={<Timer size={18} className="text-[#00C9A7]" />}
              label="Temporizador de descanso"
              description="Este valor se usa como descanso por defecto al marcar una serie."
              onClick={() => {
                setDraftRestTimer(appSettings.restTimerSeconds);
                setShowRestTimerModal(true);
              }}
              right={
                <div className="flex flex-col items-end">
                  <span className="text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {appSettings.restTimerSeconds}s por defecto
                  </span>
                  <ChevronRight size={14} className="mt-0.5 text-[#9BAEC1]" />
                </div>
              }
            />

            <div className="border-b border-[rgba(255,255,255,0.04)] px-4 py-4">
              <div className="flex items-start gap-4">
                <SettingIcon>
                  <TrendingUp size={18} className="text-[#00C9A7]" />
                </SettingIcon>
                <div className="min-w-0 flex-1">
                  <span className="block text-[1.03rem] font-semibold text-white">Incrementar peso automático</span>
                  <p className="mt-1 text-sm leading-5 text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Al agregar una serie nueva, propone subir el peso en vez de copiarlo igual.
                  </p>
                </div>
                <div className="shrink-0 self-center pt-0.5">
                  <SettingToggle
                    value={appSettings.autoWeightIncrement}
                    onChange={() =>
                      updateAppSettings({ autoWeightIncrement: !appSettings.autoWeightIncrement })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="border-b border-[rgba(255,255,255,0.04)] px-4 py-4">
              <div className="flex items-start gap-4">
                <SettingIcon>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M4 4.5h10M4 9h10M4 13.5h10M6 3v12M12 3v12"
                      stroke="#00C9A7"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </SettingIcon>
                <div className="min-w-0 flex-1">
                  <span className="block text-[1.03rem] font-semibold text-white">Mostrar último peso</span>
                  <p className="mt-1 text-sm leading-5 text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Si está activo, verás la referencia anterior dentro del mismo campo de peso.
                  </p>
                </div>
                <div className="shrink-0 self-center pt-0.5">
                  <SettingToggle
                    value={appSettings.showPreviousWeight}
                    onChange={() =>
                      updateAppSettings({ showPreviousWeight: !appSettings.showPreviousWeight })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="border-b border-[rgba(255,255,255,0.04)] px-4 py-4">
              <div className="flex items-start gap-4">
                <SettingIcon>
                  <Bell size={18} className="text-[#00C9A7]" />
                </SettingIcon>
                <div className="min-w-0 flex-1">
                  <span className="block text-[1.03rem] font-semibold text-white">Notificar los días que toca ir al gym</span>
                  <p className="mt-1 text-sm leading-5 text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Elegí qué días querés recordar y en qué horario te conviene recibir ese aviso.
                  </p>
                </div>
                <div className="shrink-0 self-center pt-0.5">
                  <SettingToggle value={appSettings.notifyGymDays} onChange={() => void handleNotificationToggle()} />
                </div>
              </div>

              {appSettings.notifyGymDays ? (
                <div className="mt-4 space-y-4 rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[#101521] p-4">
                  <div className="grid grid-cols-2 gap-2 rounded-[20px] bg-[#0C1523] p-1.5">
                    <button
                      type="button"
                      onClick={() => void updateNotificationScheduleMode('same')}
                      className={
                        userProfile.preferredScheduleMode === 'same'
                          ? 'rounded-2xl bg-[#00C9A7] px-4 py-3 text-sm font-bold text-[#041016]'
                          : 'rounded-2xl px-4 py-3 text-sm font-bold text-[#98A2B3]'
                      }
                    >
                      Mismo horario
                    </button>
                    <button
                      type="button"
                      onClick={() => void updateNotificationScheduleMode('different')}
                      className={
                        userProfile.preferredScheduleMode === 'different'
                          ? 'rounded-2xl bg-[#00C9A7] px-4 py-3 text-sm font-bold text-[#041016]'
                          : 'rounded-2xl px-4 py-3 text-sm font-bold text-[#98A2B3]'
                      }
                    >
                      Horarios distintos
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8D98AA]">Días de notificación</p>
                      <p className="mt-1 text-sm text-[#9BAEC1]">Podés elegir entre 1 y 6 días. Si querés desactivar todo, apagá el switch.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {WEEK_DAYS.map((day) => {
                        const selected = userProfile.preferredTrainingDays.includes(day.value);

                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => void toggleNotificationDay(day.value)}
                            className={selected
                              ? 'rounded-2xl border border-[rgba(0,201,167,0.32)] bg-[rgba(0,201,167,0.12)] px-3 py-3 text-left'
                              : 'rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#13263A] px-3 py-3 text-left'}
                          >
                            <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#8D98AA]">{day.short}</span>
                            <span className="mt-1 block text-sm font-semibold text-white">{day.value}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {userProfile.preferredTrainingDays.length > 0 ? (
                    userProfile.preferredScheduleMode === 'same' ? (
                      <button
                        type="button"
                        onClick={() => openTimePicker()}
                        className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-[rgba(255,255,255,0.06)] bg-[#13263A] px-4 py-4 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1A2130] text-[#00C9A7]">
                            <Clock3 size={18} />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8D98AA]">Horario principal</p>
                            <p className="mt-1 text-base font-bold text-white">{formatTimeLabel(userProfile.preferredWorkoutTime || DEFAULT_TIME)}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-[#9BAEC1]" />
                      </button>
                    ) : (
                      <div className="space-y-2">
                        {selectedNotificationDays.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => openTimePicker(day.value)}
                            className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-[rgba(255,255,255,0.06)] bg-[#13263A] px-4 py-4 text-left"
                          >
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8D98AA]">{day.value}</p>
                              <p className="mt-1 text-base font-bold text-white">{formatTimeLabel(userProfile.preferredWorkoutTimeByDay[day.value] || userProfile.preferredWorkoutTime || DEFAULT_TIME)}</p>
                            </div>
                            <ChevronRight size={16} className="text-[#9BAEC1]" />
                          </button>
                        ))}
                      </div>
                    )
                  ) : null}
                </div>
              ) : null}
            </div>

            <SettingRow
              icon={<Download size={18} className="text-[#00C9A7]" />}
              label="Exportar a CSV"
              description={`Descargá ${csvPreviewCount} sesiones de historial en un archivo editable.`}
              onClick={handleExportCsv}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <SectionLabel>Soporte</SectionLabel>
          <div className="overflow-hidden rounded-3xl bg-[#13263A]">
            <SettingRow
              icon={<HelpCircle size={18} className="text-[#00C9A7]" />}
              label="Centro de ayuda"
              description="Manual completo con todas las funciones de WOHL y cómo aprovecharlas."
              onClick={() => navigate('/config/help')}
            />
            <SettingRow
              icon={<Mail size={18} className="text-[#00C9A7]" />}
              label="Contactar soporte"
              description="Completá un formulario para redactar un mail de soporte."
              onClick={() => navigate('/config/support')}
            />
            <SettingRow
              icon={<FileText size={18} className="text-[#00C9A7]" />}
              label="Términos y condiciones"
              description="Condiciones generales de uso de WOHL bajo ley argentina."
              onClick={() => navigate('/config/terms')}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-[#13263A]">
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center justify-center gap-3 px-4 py-4 text-[#E53935] transition-colors hover:bg-[rgba(229,57,53,0.05)]"
            type="button"
          >
            <LogOut size={18} />
            <span className="text-base font-semibold">Cerrar sesión</span>
          </button>
        </div>

        <div className="pb-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#333]" style={{ fontFamily: "'Inter', sans-serif" }}>
            WOHL V2.0 • Configuración optimizada para pantallas móviles
          </p>
        </div>
      </div>

      {showRestTimerModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center px-4 pb-4 sm:items-center sm:px-6">
          <button
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowRestTimerModal(false)}
            type="button"
            aria-label="Cerrar configuración de descanso"
          />
          <div className="relative w-full rounded-[2rem] bg-[#1A2D42] p-6">
      <TimeWheelPicker
        open={Boolean(timePickerTarget)}
        title={timePickerTarget && timePickerTarget !== '__main__' ? `Horario para ${timePickerTarget}` : 'Horario principal'}
        subtitle="Definí la hora en la que querés recibir el recordatorio de esa sesión."
        value={timeDraft}
        onChange={setTimeDraft}
        onClose={() => setTimePickerTarget(null)}
        onConfirm={() => void confirmTimePicker()}
      />

            <h3 className="text-center text-2xl font-bold text-white">Descanso por defecto</h3>
            <p className="mt-2 text-center text-sm text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Definí cuántos segundos querés usar por defecto entre series.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={() => setDraftRestTimer((value) => Math.max(15, value - 15))}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#13263A] text-2xl text-white"
                type="button"
              >
                -
              </button>
              <div className="min-w-[7.5rem] rounded-2xl border border-[rgba(0,201,167,0.16)] bg-[#13263A] px-4 py-4 text-center">
                <span className="text-3xl font-bold text-white">{draftRestTimer}</span>
                <span className="ml-1 text-sm font-semibold uppercase tracking-widest text-[#00C9A7]">seg</span>
              </div>
              <button
                onClick={() => setDraftRestTimer((value) => Math.min(600, value + 15))}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#13263A] text-2xl text-white"
                type="button"
              >
                +
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => {
                  updateAppSettings({ restTimerSeconds: draftRestTimer });
                  setFeedbackMessage(`Nuevo descanso por defecto: ${draftRestTimer} segundos.`);
                  setShowRestTimerModal(false);
                }}
                className="w-full rounded-2xl bg-[#00C9A7] py-4 font-bold text-black"
                type="button"
              >
                Guardar descanso
              </button>
              <button
                onClick={() => setShowRestTimerModal(false)}
                className="w-full rounded-2xl bg-[#13263A] py-4 font-semibold text-white"
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
