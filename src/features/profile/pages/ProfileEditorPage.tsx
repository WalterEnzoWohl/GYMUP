import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Header } from '@/shared/components/layout/Header';
import { ACTIVITY_LEVEL_OPTIONS, TRAINING_LEVEL_OPTIONS } from '@/shared/constants';
import { GOAL_OPTIONS } from '@/core/domain/profileInsights';
import { useAppData } from '@/core/app-data/AppDataContext';

type ProfileFormState = {
  firstName: string;
  lastName: string;
  age: number;
  heightCm: number;
  weightKg: number;
  goal: string;
  activityLevel: string;
  trainingLevel: string;
  memberSince: string;
};

function Field({
  label,
  value,
  onChange,
  type = 'text',
  suffix,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span
        className="text-[10px] font-bold uppercase tracking-widest text-[#9BAEC1]"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {label}
      </span>
      <div className="flex items-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#13263A] px-4 py-3">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent text-base font-medium text-white outline-none"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        />
        {suffix && <span className="text-sm font-bold text-[#00C9A7]">{suffix}</span>}
      </div>
    </label>
  );
}

export default function ProfileEditorPage() {
  const navigate = useNavigate();
  const { updateUserProfile, userProfile } = useAppData();
  const [formData, setFormData] = useState<ProfileFormState>({
    firstName: userProfile.firstName,
    lastName: userProfile.lastName,
    age: userProfile.age,
    heightCm: userProfile.heightCm,
    weightKg: userProfile.weightKg,
    goal: userProfile.goal,
    activityLevel: userProfile.activityLevel,
    trainingLevel: userProfile.trainingLevel,
    memberSince: userProfile.memberSince,
  });

  useEffect(() => {
    setFormData({
      firstName: userProfile.firstName,
      lastName: userProfile.lastName,
      age: userProfile.age,
      heightCm: userProfile.heightCm,
      weightKg: userProfile.weightKg,
      goal: userProfile.goal,
      activityLevel: userProfile.activityLevel,
      trainingLevel: userProfile.trainingLevel,
      memberSince: userProfile.memberSince,
    });
  }, [userProfile]);

  const setField = <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const saveProfile = async () => {
    await updateUserProfile({
      firstName: formData.firstName,
      lastName: formData.lastName,
      age: formData.age,
      heightCm: formData.heightCm,
      weightKg: formData.weightKg,
      goal: formData.goal,
      activityLevel: formData.activityLevel,
      trainingLevel: formData.trainingLevel,
      memberSince: formData.memberSince,
    });
    navigate('/profile');
  };

  return (
    <div className="flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header showBack title="Editar perfil" onBack={() => navigate('/profile')} />

      <div className="flex flex-col gap-6 px-5 py-5 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Datos personales</h1>
          <p className="mt-1 text-sm text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Actualizá tu perfil para que WOHL use tus datos reales en cálculos y progreso.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre" value={formData.firstName} onChange={(value) => setField('firstName', value)} />
          <Field label="Apellido" value={formData.lastName} onChange={(value) => setField('lastName', value)} />
          <Field label="Edad" type="number" value={formData.age} onChange={(value) => setField('age', Number(value) || 0)} suffix="años" />
          <Field label="Miembro desde" value={formData.memberSince} onChange={(value) => setField('memberSince', value)} />
          <Field label="Altura" type="number" value={formData.heightCm} onChange={(value) => setField('heightCm', Number(value) || 0)} suffix="cm" />
          <Field label="Peso" type="number" value={formData.weightKg} onChange={(value) => setField('weightKg', Number(value) || 0)} suffix="kg" />
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[#13263A] p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#00C9A7]">Objetivo</p>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((objective) => (
              <button
                key={objective}
                onClick={() => setField('goal', objective)}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                  formData.goal === objective
                    ? 'bg-[#00C9A7] text-black'
                    : 'border border-[rgba(255,255,255,0.08)] bg-[#1A2D42] text-[#9BAEC1]'
                }`}
              >
                {objective}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[#13263A] p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#00C9A7]">
            Nivel de entrenamiento
          </p>
          <div className="flex flex-wrap gap-2">
            {TRAINING_LEVEL_OPTIONS.map((level) => (
              <button
                key={level}
                onClick={() => setField('trainingLevel', level)}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                  formData.trainingLevel === level
                    ? 'bg-[#00C9A7] text-black'
                    : 'border border-[rgba(255,255,255,0.08)] bg-[#1A2D42] text-[#9BAEC1]'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[#13263A] p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#00C9A7]">
            Nivel de actividad
          </p>
          <div className="flex flex-col gap-2">
            {ACTIVITY_LEVEL_OPTIONS.map((option) => (
              <button
                key={option.label}
                onClick={() => setField('activityLevel', option.label)}
                className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                  formData.activityLevel === option.label
                    ? 'border-[rgba(0,201,167,0.35)] bg-[rgba(0,201,167,0.12)]'
                    : 'border-[rgba(255,255,255,0.06)] bg-[#1A2D42]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-white">{option.label}</span>
                  <span className="text-xs font-bold text-[#00C9A7]">Factor {option.factor}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => void saveProfile()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00C9A7] py-4 shadow-[0_0_15px_rgba(0,201,167,0.18)]"
        >
          <Save size={18} className="text-black" />
          <span className="text-base font-extrabold text-black">Guardar cambios</span>
        </button>
      </div>
    </div>
  );
}
