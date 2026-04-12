export type ExerciseCatalogLocale = 'es' | 'en';

export type ExerciseCatalogMediaType = 'video' | 'gif' | 'image';

export interface ExerciseCatalogLocalizedContent {
  title: string;
  description: string;
  overview: string;
  instructions: string[];
  tips: string[];
  common_mistakes: string[];
  benefits: string[];
}

export interface ExerciseCatalogMedia {
  cover_image?: string;
  animation_media?: string;
  animation_media_type?: ExerciseCatalogMediaType;
}

export interface ExerciseCatalogEntry {
  id: string;
  slug: string;
  primary_group: string;
  secondary_groups: string[];
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string[];
  station_or_machine?: string | null;
  grip_or_stance?: string | null;
  movement_pattern?: string | null;
  mechanic_type?: string | null;
  difficulty?: string | null;
  bodyweight: boolean;
  unilateral: boolean;
  media: ExerciseCatalogMedia;
  i18n: Partial<Record<ExerciseCatalogLocale, ExerciseCatalogLocalizedContent>>;
  source?: {
    original_title?: string;
  };
  is_active: boolean;
}

export interface ExerciseCatalogSummary {
  id: number;
  externalId: string;
  slug: string;
  title: string;
  description: string;
  overview: string;
  instructions: string[];
  tips: string[];
  commonMistakes: string[];
  benefits: string[];
  muscle: string;
  secondaryMuscles: string[];
  implement: string;
  primaryGroup: string;
  primaryMuscles: string[];
  equipment: string[];
  stationOrMachine?: string;
  gripOrStance?: string;
  movementPattern?: string;
  mechanicType?: string;
  difficulty?: string;
  bodyweight: boolean;
  unilateral: boolean;
  coverImageUrl?: string;
  animationMediaUrl?: string;
  animationMediaType?: ExerciseCatalogMediaType;
  searchText: string;
}
