import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { Bell, Camera, ChevronRight, Flame, LogOut, Pencil, Settings, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { UserAvatar } from '../components/UserAvatar';
import { calculateNutritionTargets, getMuscleProgressInsights, GOAL_OPTIONS } from '../data/profileInsights';
import { useAppData } from '../data/AppDataContext';
import { formatWeightNumber, getWeightUnitLabel } from '../data/unitUtils';
import { getSupabaseClient } from '../lib/supabase';

const AVATAR_EDITOR_SIZE = 280;
const AVATAR_OUTPUT_SIZE = 512;

type PendingAvatarImage = {
  src: string;
  width: number;
  height: number;
};

type AvatarPointer = {
  x: number;
  y: number;
};

type AvatarGesture =
  | {
      type: 'pan';
      pointerId: number;
      startX: number;
      startY: number;
      startOffsetX: number;
      startOffsetY: number;
    }
  | {
      type: 'pinch';
      startDistance: number;
      startCenterX: number;
      startCenterY: number;
      startZoom: number;
      startOffsetX: number;
      startOffsetY: number;
    };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function canvasToAvatarBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (webpBlob) => {
        if (webpBlob) {
          resolve(webpBlob);
          return;
        }

        canvas.toBlob(
          (jpegBlob) => {
            if (jpegBlob) {
              resolve(jpegBlob);
              return;
            }

            reject(new Error('No se pudo exportar el avatar.'));
          },
          'image/jpeg',
          0.9
        );
      },
      'image/webp',
      0.86
    );
  });
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarPointersRef = useRef<Map<number, AvatarPointer>>(new Map());
  const avatarGestureRef = useRef<AvatarGesture | null>(null);
  const avatarZoomRef = useRef(1);
  const avatarOffsetRef = useRef({ x: 0, y: 0 });
  const { appContext, appSettings, historyDays, sessionHistory, updateProfileAvatar, updateUserProfile, userProfile } =
    useAppData();
  const [selectedDate, setSelectedDate] = useState(sessionHistory[0]?.isoDate ?? appContext.todayIso);
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState<PendingAvatarImage | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarOffsetX, setAvatarOffsetX] = useState(0);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  const filteredSessions = sessionHistory.filter((session) => session.isoDate === selectedDate);
  const nutritionTargets = calculateNutritionTargets(userProfile);
  const monthlyMuscleProgress = getMuscleProgressInsights(sessionHistory, appContext.todayIso);
  const weightUnitLabel = getWeightUnitLabel(appSettings.weightUnit);
  const avatarBaseScale = useMemo(() => {
    if (!pendingAvatar) {
      return 1;
    }

    return Math.max(AVATAR_EDITOR_SIZE / pendingAvatar.width, AVATAR_EDITOR_SIZE / pendingAvatar.height);
  }, [pendingAvatar]);
  const avatarScale = avatarBaseScale * avatarZoom;
  const avatarDisplayWidth = pendingAvatar ? pendingAvatar.width * avatarScale : AVATAR_EDITOR_SIZE;
  const avatarDisplayHeight = pendingAvatar ? pendingAvatar.height * avatarScale : AVATAR_EDITOR_SIZE;
  const avatarMaxOffsetX = Math.max(0, (avatarDisplayWidth - AVATAR_EDITOR_SIZE) / 2);
  const avatarMaxOffsetY = Math.max(0, (avatarDisplayHeight - AVATAR_EDITOR_SIZE) / 2);

  useEffect(() => {
    if (!pendingAvatar) {
      return;
    }

    setAvatarOffsetX((previous) => clamp(previous, -avatarMaxOffsetX, avatarMaxOffsetX));
    setAvatarOffsetY((previous) => clamp(previous, -avatarMaxOffsetY, avatarMaxOffsetY));
  }, [avatarMaxOffsetX, avatarMaxOffsetY, pendingAvatar]);

  useEffect(() => {
    avatarZoomRef.current = avatarZoom;
    avatarOffsetRef.current = { x: avatarOffsetX, y: avatarOffsetY };
  }, [avatarOffsetX, avatarOffsetY, avatarZoom]);

  const signOut = async () => {
    await getSupabaseClient().auth.signOut();
  };

  const closeAvatarEditor = () => {
    avatarPointersRef.current.clear();
    avatarGestureRef.current = null;
    avatarZoomRef.current = 1;
    avatarOffsetRef.current = { x: 0, y: 0 };
    setShowAvatarEditor(false);
    setPendingAvatar(null);
    setAvatarZoom(1);
    setAvatarOffsetX(0);
    setAvatarOffsetY(0);
    setAvatarError(null);
    setIsSavingAvatar(false);
  };

  const loadPendingAvatar = (src: string) => {
    const image = new Image();
    image.onload = () => {
      setPendingAvatar({
        src,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      setAvatarZoom(1);
      setAvatarOffsetX(0);
      setAvatarOffsetY(0);
      avatarPointersRef.current.clear();
      avatarGestureRef.current = null;
      avatarZoomRef.current = 1;
      avatarOffsetRef.current = { x: 0, y: 0 };
      setAvatarError(null);
      setShowAvatarEditor(true);
    };
    image.onerror = () => {
      setAvatarError('No pudimos abrir esa imagen. Probá con otra foto.');
    };
    image.src = src;
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setAvatarError('Elegí un archivo de imagen válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        loadPendingAvatar(reader.result);
      }
    };
    reader.onerror = () => {
      setAvatarError('No pudimos leer esa imagen. Probá de nuevo.');
    };
    reader.readAsDataURL(file);
  };

  const getAvatarGestureMetrics = (element: HTMLDivElement) => {
    const pointerValues = Array.from(avatarPointersRef.current.values());
    const [firstPointer, secondPointer] = pointerValues;

    if (!firstPointer || !secondPointer) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    const centerX = (firstPointer.x + secondPointer.x) / 2 - rect.left - rect.width / 2;
    const centerY = (firstPointer.y + secondPointer.y) / 2 - rect.top - rect.height / 2;
    const distance = Math.hypot(secondPointer.x - firstPointer.x, secondPointer.y - firstPointer.y);

    return { centerX, centerY, distance };
  };

  const applyAvatarZoom = (
    nextZoomValue: number,
    focalX: number,
    focalY: number,
    baseZoom = avatarZoomRef.current,
    baseOffsetX = avatarOffsetRef.current.x,
    baseOffsetY = avatarOffsetRef.current.y
  ) => {
    if (!pendingAvatar) {
      return;
    }

    const clampedZoom = clamp(nextZoomValue, 1, 2.5);
    const zoomRatio = clampedZoom / baseZoom;
    const nextScale = avatarBaseScale * clampedZoom;
    const nextDisplayWidth = pendingAvatar.width * nextScale;
    const nextDisplayHeight = pendingAvatar.height * nextScale;
    const nextMaxOffsetX = Math.max(0, (nextDisplayWidth - AVATAR_EDITOR_SIZE) / 2);
    const nextMaxOffsetY = Math.max(0, (nextDisplayHeight - AVATAR_EDITOR_SIZE) / 2);
    const nextOffsetX = clamp(focalX - (focalX - baseOffsetX) * zoomRatio, -nextMaxOffsetX, nextMaxOffsetX);
    const nextOffsetY = clamp(focalY - (focalY - baseOffsetY) * zoomRatio, -nextMaxOffsetY, nextMaxOffsetY);

    avatarZoomRef.current = clampedZoom;
    avatarOffsetRef.current = { x: nextOffsetX, y: nextOffsetY };
    setAvatarZoom(clampedZoom);
    setAvatarOffsetX(nextOffsetX);
    setAvatarOffsetY(nextOffsetY);
  };

  const handleAvatarPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    avatarPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);

    if (avatarPointersRef.current.size === 1) {
      avatarGestureRef.current = {
        type: 'pan',
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffsetX: avatarOffsetRef.current.x,
        startOffsetY: avatarOffsetRef.current.y,
      };
      return;
    }

    if (avatarPointersRef.current.size >= 2) {
      const metrics = getAvatarGestureMetrics(event.currentTarget);

      if (!metrics) {
        return;
      }

      avatarGestureRef.current = {
        type: 'pinch',
        startDistance: metrics.distance,
        startCenterX: metrics.centerX,
        startCenterY: metrics.centerY,
        startZoom: avatarZoomRef.current,
        startOffsetX: avatarOffsetRef.current.x,
        startOffsetY: avatarOffsetRef.current.y,
      };
    }
  };

  const handleAvatarPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!avatarPointersRef.current.has(event.pointerId)) {
      return;
    }

    avatarPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const activeGesture = avatarGestureRef.current;
    if (!activeGesture) {
      return;
    }

    if (activeGesture.type === 'pan' && avatarPointersRef.current.size === 1) {
      const deltaX = event.clientX - activeGesture.startX;
      const deltaY = event.clientY - activeGesture.startY;
      const nextOffsetX = clamp(activeGesture.startOffsetX + deltaX, -avatarMaxOffsetX, avatarMaxOffsetX);
      const nextOffsetY = clamp(activeGesture.startOffsetY + deltaY, -avatarMaxOffsetY, avatarMaxOffsetY);

      avatarOffsetRef.current = { x: nextOffsetX, y: nextOffsetY };
      setAvatarOffsetX(nextOffsetX);
      setAvatarOffsetY(nextOffsetY);
      return;
    }

    if (activeGesture.type === 'pinch' && avatarPointersRef.current.size >= 2) {
      const metrics = getAvatarGestureMetrics(event.currentTarget);

      if (!metrics || activeGesture.startDistance === 0) {
        return;
      }

      const nextZoomValue = clamp(
        activeGesture.startZoom * (metrics.distance / activeGesture.startDistance),
        1,
        2.5
      );
      const zoomRatio = nextZoomValue / activeGesture.startZoom;
      const nextScale = avatarBaseScale * nextZoomValue;
      const nextDisplayWidth = pendingAvatar ? pendingAvatar.width * nextScale : AVATAR_EDITOR_SIZE;
      const nextDisplayHeight = pendingAvatar ? pendingAvatar.height * nextScale : AVATAR_EDITOR_SIZE;
      const nextMaxOffsetX = Math.max(0, (nextDisplayWidth - AVATAR_EDITOR_SIZE) / 2);
      const nextMaxOffsetY = Math.max(0, (nextDisplayHeight - AVATAR_EDITOR_SIZE) / 2);
      const nextOffsetX = clamp(
        metrics.centerX - (activeGesture.startCenterX - activeGesture.startOffsetX) * zoomRatio,
        -nextMaxOffsetX,
        nextMaxOffsetX
      );
      const nextOffsetY = clamp(
        metrics.centerY - (activeGesture.startCenterY - activeGesture.startOffsetY) * zoomRatio,
        -nextMaxOffsetY,
        nextMaxOffsetY
      );

      avatarZoomRef.current = nextZoomValue;
      avatarOffsetRef.current = { x: nextOffsetX, y: nextOffsetY };
      setAvatarZoom(nextZoomValue);
      setAvatarOffsetX(nextOffsetX);
      setAvatarOffsetY(nextOffsetY);
    }
  };

  const handleAvatarPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    avatarPointersRef.current.delete(event.pointerId);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (avatarPointersRef.current.size === 1) {
      const [remainingPointerId, remainingPointer] = Array.from(avatarPointersRef.current.entries())[0];
      avatarGestureRef.current = {
        type: 'pan',
        pointerId: remainingPointerId,
        startX: remainingPointer.x,
        startY: remainingPointer.y,
        startOffsetX: avatarOffsetRef.current.x,
        startOffsetY: avatarOffsetRef.current.y,
      };
      return;
    }

    if (avatarPointersRef.current.size >= 2) {
      const metrics = getAvatarGestureMetrics(event.currentTarget);

      if (!metrics) {
        return;
      }

      avatarGestureRef.current = {
        type: 'pinch',
        startDistance: metrics.distance,
        startCenterX: metrics.centerX,
        startCenterY: metrics.centerY,
        startZoom: avatarZoomRef.current,
        startOffsetX: avatarOffsetRef.current.x,
        startOffsetY: avatarOffsetRef.current.y,
      };
      return;
    }

    avatarGestureRef.current = null;
  };

  const handleAvatarWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const focalX = event.clientX - rect.left - rect.width / 2;
    const focalY = event.clientY - rect.top - rect.height / 2;
    const zoomDelta = Math.exp(-event.deltaY * 0.0025);

    applyAvatarZoom(avatarZoomRef.current * zoomDelta, focalX, focalY);
  };

  const saveAvatar = async () => {
    if (!pendingAvatar) {
      return;
    }

    setIsSavingAvatar(true);
    setAvatarError(null);

    try {
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('No pudimos guardar la imagen. Probá otra vez.'));
        image.src = pendingAvatar.src;
      });

      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_OUTPUT_SIZE;
      canvas.height = AVATAR_OUTPUT_SIZE;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('No pudimos preparar la imagen para guardarla.');
      }

      const sourceWidth = AVATAR_EDITOR_SIZE / avatarScale;
      const sourceHeight = AVATAR_EDITOR_SIZE / avatarScale;
      const sourceX = clamp(
        (avatarDisplayWidth / 2 - AVATAR_EDITOR_SIZE / 2 - avatarOffsetX) / avatarScale,
        0,
        Math.max(0, pendingAvatar.width - sourceWidth)
      );
      const sourceY = clamp(
        (avatarDisplayHeight / 2 - AVATAR_EDITOR_SIZE / 2 - avatarOffsetY) / avatarScale,
        0,
        Math.max(0, pendingAvatar.height - sourceHeight)
      );

      context.clearRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        AVATAR_OUTPUT_SIZE,
        AVATAR_OUTPUT_SIZE
      );

      const avatarBlob = await canvasToAvatarBlob(canvas);
      await updateProfileAvatar(avatarBlob);
      closeAvatarEditor();
    } catch {
      setAvatarError('No pudimos guardar la imagen. Probá otra vez.');
      setIsSavingAvatar(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header
        rightContent={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/config')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,201,167,0.22)] bg-[#13263A] transition-colors hover:bg-white/5"
              aria-label="Ir a ajustes"
            >
              <Settings size={16} className="text-[#00C9A7]" />
            </button>
            <button
              onClick={() => navigate('/profile/edit')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,201,167,0.22)] bg-[#13263A] transition-colors hover:bg-white/5"
              aria-label="Editar perfil"
            >
              <Pencil size={16} className="text-[#00C9A7]" />
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-6 px-5 py-5 pb-4">
        <div className="relative overflow-hidden rounded-2xl">
          <div className="flex items-start justify-between gap-4 pt-4 pb-5">
            <div className="flex min-w-0 flex-1 flex-col gap-1 pr-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#00C9A7]">
                {userProfile.trainingLevel}
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-white">{userProfile.fullName}</h1>
              <p className="text-sm text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Miembro desde {userProfile.memberSince}
              </p>
            </div>
            <div className="flex h-36 w-36 flex-shrink-0 items-start justify-center pt-4">
              <div className="relative h-[104px] w-[104px]">
                <UserAvatar
                  alt={userProfile.fullName}
                  className="h-full w-full overflow-hidden rounded-full border-2 border-[rgba(0,201,167,0.35)] bg-[#1A2D42] shadow-[0_0_28px_rgba(0,201,167,0.18)]"
                  imageClassName="theme-preserve h-full w-full object-cover"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(0,201,167,0.32)] bg-[#0B1F33] shadow-[0_0_12px_rgba(0,201,167,0.18)] transition-colors active:bg-[#1A2D42]"
                  type="button"
                  aria-label="Cambiar foto de perfil"
                >
                  <Camera size={14} className="text-[#00C9A7]" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'PESO',
              value: formatWeightNumber(userProfile.weightKg, appSettings.weightUnit),
              unit: weightUnitLabel,
            },
            { label: 'ALTURA', value: userProfile.heightCm.toString(), unit: 'cm' },
            { label: 'EDAD', value: userProfile.age.toString(), unit: 'años' },
          ].map(({ label, value, unit }) => (
            <div key={label} className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#13263A] p-4">
              <p
                className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#9BAEC1]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {label}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-white">{value}</span>
                <span className="text-sm font-bold text-[#00C9A7]">{unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#203347] p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#9BAEC1]">
              Actividad
            </p>
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-[#00C9A7]" />
              <div>
                <span className="block text-lg font-bold text-white">{userProfile.activityLevel}</span>
                <span className="text-xs text-[#00C9A7]">Factor {userProfile.activityFactor}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowObjectiveModal(true)}
            className="rounded-xl border border-[rgba(0,201,167,0.2)] bg-[#005147] p-4 text-left transition-colors active:bg-[#006257]"
          >
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#00C9A7]">Objetivo</p>
            <span className="text-lg font-extrabold text-white">{userProfile.goal}</span>
          </button>
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[#13263A] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#00C9A7]">
                Calorias recomendadas para {nutritionTargets.goalTitle}
              </p>
              <p className="text-sm leading-6 text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
                Estimado con Harris-Benedict y tu factor de actividad {userProfile.activityFactor}. Tu mantenimiento ronda las {nutritionTargets.maintenanceCalories} kcal.
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(0,201,167,0.18)] bg-[rgba(0,201,167,0.1)] px-4 py-3 text-right">
              <span className="block text-2xl font-extrabold text-white">{nutritionTargets.targetCalories}</span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#00C9A7]">kcal</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Proteinas', value: nutritionTargets.proteinGrams, unit: 'g' },
              { label: 'Carbos', value: nutritionTargets.carbGrams, unit: 'g' },
              { label: 'Grasas', value: nutritionTargets.fatGrams, unit: 'g' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="rounded-xl bg-[#1A2D42] px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#9BAEC1]">{label}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-white">{value}</span>
                  <span className="text-xs font-bold text-[#00C9A7]">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold tracking-tight text-white">Progreso mensual</h2>
          <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[#13263A] p-6">
            <div className="flex flex-col gap-5">
              {monthlyMuscleProgress.map((muscleGroup) => (
                <button
                  key={muscleGroup.id}
                  onClick={() => navigate(`/muscle-progress/${muscleGroup.id}`)}
                  className="flex flex-col gap-2 text-left transition-opacity active:opacity-80"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-semibold uppercase tracking-widest text-[#9BAEC1]"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {muscleGroup.name}
                    </span>
                    <span className="text-base font-bold text-[#00C9A7]">Niv. {muscleGroup.level}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#203347]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${muscleGroup.progressPercent}%`,
                        background: 'linear-gradient(135deg, #00C9A7 0%, #00A894 100%)',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {muscleGroup.monthlyDirectCount} ejercicios directos este mes
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-white">Historial de sesiones</h2>
            <button
              onClick={() => navigate('/history')}
              className="text-[10px] font-bold uppercase tracking-widest text-[#00C9A7]"
            >
              Ver todo
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {historyDays.map(({ day, num, isoDate }) => {
              const hasSession = sessionHistory.some((session) => session.isoDate === isoDate);
              const isSelected = selectedDate === isoDate;

              return (
                <button
                  key={isoDate}
                  onClick={() => setSelectedDate(isoDate)}
                  className={`flex min-w-[3.5rem] flex-1 flex-col items-center gap-1 rounded-xl py-2 transition-all ${
                    isSelected
                      ? 'bg-[#00C9A7]'
                      : hasSession
                      ? 'border border-[rgba(0,201,167,0.3)] bg-[#203347]'
                      : 'border border-[rgba(255,255,255,0.05)] bg-[#13263A]'
                  }`}
                >
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider ${
                      isSelected ? 'text-black' : 'text-[#9BAEC1]'
                    }`}
                  >
                    {day}
                  </span>
                  <span className={`text-base font-extrabold ${isSelected ? 'text-black' : 'text-white'}`}>
                    {num}
                  </span>
                  {hasSession && !isSelected && <div className="h-1 w-1 rounded-full bg-[#00C9A7]" />}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            {filteredSessions.length > 0 ? (
              filteredSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => navigate(`/session-history/${session.id}`)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[#13263A] px-5 py-4 text-left transition-colors active:bg-[#1a1a1a]"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[rgba(0,201,167,0.2)] bg-[rgba(0,201,167,0.1)]">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="#00C9A7">
                      <path d="M3 9h12M9 3v12" stroke="#00C9A7" strokeWidth="2" strokeLinecap="round" fill="none" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{session.name}</p>
                    <p className="mt-0.5 text-xs text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {session.date} - {session.duration} min - {session.muscle}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#00C9A7]">{session.kcal} kcal</span>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[#13263A] p-5">
                <p className="text-center text-sm text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  No hay sesiones registradas para ese día.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 pb-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">Configuracion</h2>
          <div className="overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[#13263A]">
            {[
              { label: 'Ajustes de cuenta', icon: <Settings size={18} className="text-[#00C9A7]" />, path: '/config' },
              { label: 'Notificaciones', icon: <Bell size={18} className="text-[#00C9A7]" />, path: '/config' },
            ].map(({ label, icon, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="flex w-full items-center justify-between border-b border-[rgba(255,255,255,0.05)] px-4 py-4 transition-colors last:border-b-0 hover:bg-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#203347]">
                    {icon}
                  </div>
                  <span className="text-base font-medium text-white">{label}</span>
                </div>
                <ChevronRight size={16} className="text-[#9BAEC1]" />
              </button>
            ))}
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex w-full items-center justify-between px-4 py-4 transition-colors hover:bg-white/5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(229,57,53,0.1)]">
                  <LogOut size={18} className="text-[#E53935]" />
                </div>
                <span className="text-base font-medium text-[#E53935]">Cerrar sesión</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {showObjectiveModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-3 py-6 sm:px-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowObjectiveModal(false)} />
          <div className="relative w-full rounded-3xl p-6" style={{ background: '#1A2D42' }}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Cambiar objetivo</h3>
              <button onClick={() => setShowObjectiveModal(false)}>
                <X size={20} className="text-[#9BAEC1]" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {GOAL_OPTIONS.map((objective) => (
                <button
                  key={objective}
                  onClick={() => {
                    void updateUserProfile({ goal: objective });
                    setShowObjectiveModal(false);
                  }}
                  className={`flex items-center justify-between rounded-2xl px-4 py-4 text-left transition-all ${
                    userProfile.goal === objective
                      ? 'bg-[#00C9A7] text-black'
                      : 'bg-[#203347] text-white hover:bg-[#333]'
                  }`}
                >
                  <span className="text-sm font-bold uppercase tracking-widest">{objective}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-3 py-6 sm:px-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowLogoutModal(false)} />
          <div className="relative w-full rounded-3xl p-6" style={{ background: '#1A2D42' }}>
            <h3 className="mb-2 text-center text-xl font-bold text-white">Cerrar sesión</h3>
            <p className="mb-6 text-center text-sm text-[#9BAEC1]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Vas a salir de tu cuenta de WOHL en este dispositivo.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => void signOut()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E53935] py-4 font-bold text-white"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="w-full rounded-2xl bg-[#203347] py-4 font-semibold text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showAvatarEditor && pendingAvatar && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-3 py-6 sm:px-6">
          <div className="absolute inset-0 bg-[rgba(4,7,18,0.78)] backdrop-blur-[4px]" onClick={closeAvatarEditor} />
          <div className="relative w-full max-w-[640px] rounded-[28px] border border-[rgba(0,201,167,0.18)] bg-[linear-gradient(180deg,rgba(28,32,48,0.98)_0%,rgba(12,15,28,0.98)_100%)] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.42)] sm:p-6">
            <button
              onClick={closeAvatarEditor}
              type="button"
              aria-label="Cerrar editor de foto"
              className="absolute right-4 top-4 rounded-full border border-[rgba(0,201,167,0.16)] bg-[rgba(255,255,255,0.04)] p-2 text-[#C7D2E3] shadow-sm transition hover:bg-[rgba(255,255,255,0.08)]"
            >
              <X size={20} />
            </button>
            <div className="mb-5 text-center text-white">
              <div>
                <h3 className="text-xl font-bold text-white sm:text-2xl">Ajustá tu foto de perfil</h3>
                <p className="mt-2 text-sm text-[#98A2B3] sm:text-[15px]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Elegí el encuadre antes de guardarla.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="mt-5 flex w-full justify-center">
                <div className="relative w-full max-w-[560px] overflow-hidden rounded-[24px] border border-[rgba(0,201,167,0.12)] bg-[#0F1324] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5">
                  <div
                    className="relative mx-auto cursor-move overflow-hidden rounded-[18px] bg-[#1A2034]"
                    style={{
                      width: `${AVATAR_EDITOR_SIZE}px`,
                      height: `${AVATAR_EDITOR_SIZE}px`,
                      touchAction: 'none',
                    }}
                    onWheel={handleAvatarWheel}
                    onPointerDown={handleAvatarPointerDown}
                    onPointerMove={handleAvatarPointerMove}
                    onPointerUp={handleAvatarPointerEnd}
                    onPointerCancel={handleAvatarPointerEnd}
                  >
                    <img
                      src={pendingAvatar.src}
                      alt="Vista previa del avatar"
                      className="pointer-events-none absolute max-w-none select-none"
                      draggable={false}
                      style={{
                        width: `${avatarDisplayWidth}px`,
                        height: `${avatarDisplayHeight}px`,
                        left: '50%',
                        top: '50%',
                        transform: `translate(calc(-50% + ${avatarOffsetX}px), calc(-50% + ${avatarOffsetY}px))`,
                      }}
                    />
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute inset-y-0 left-0 w-[44px] bg-[rgba(7,10,18,0.74)]" />
                      <div className="absolute inset-y-0 right-0 w-[44px] bg-[rgba(7,10,18,0.74)]" />
                      <div className="absolute left-1/2 top-1/2 h-[248px] w-[248px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[rgba(0,201,167,0.95)] shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_0_22px_rgba(0,201,167,0.18)]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 w-full max-w-[560px]">
              <label className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.24em] text-[#00C9A7]">
                  <span>Zoom</span>
                  <span className="text-[#E5E7EB]">{avatarZoom.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.01"
                  value={avatarZoom}
                  onChange={(event) => applyAvatarZoom(Number(event.target.value), 0, 0)}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#1F2937] accent-[#00C9A7]"
                />
              </label>
            </div>

            {avatarError && (
              <div className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B42318]">
                {avatarError}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={closeAvatarEditor}
                className="w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#161A27] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[#1B2133] sm:max-w-[200px]"
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={() => void saveAvatar()}
                disabled={isSavingAvatar}
                className="w-full rounded-2xl bg-[#00C9A7] px-6 py-3.5 text-base font-semibold text-[#041016] shadow-[0_0_24px_rgba(0,201,167,0.18)] transition hover:bg-[#2BF5DB] disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-[200px]"
                type="button"
              >
                {isSavingAvatar ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
