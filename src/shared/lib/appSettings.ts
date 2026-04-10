import type { AppSettings } from '@/shared/types/models';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  weightUnit: 'kg',
  theme: 'dark',
  soundsEnabled: true,
  vibrationEnabled: true,
  restTimerSeconds: 90,
  autoWeightIncrement: false,
  showPreviousWeight: true,
};

export function mergeAppSettings(value: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    ...value,
  };
}
