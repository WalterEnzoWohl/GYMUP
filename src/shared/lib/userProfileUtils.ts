import type { UserProfile } from '@/shared/types/models';

export function hasCompletedOnboarding(profile: UserProfile) {
  return Boolean(profile.onboardingCompletedAt);
}

export function isUserProfileComplete(profile: UserProfile) {
  return (
    hasCompletedOnboarding(profile) ||
    (
    profile.firstName.trim().length > 0 &&
    profile.lastName.trim().length > 0 &&
    profile.age > 0 &&
    profile.heightCm > 0 &&
    profile.weightKg > 0
    )
  );
}

export function getUserFirstName(profile: UserProfile) {
  return profile.firstName.trim() || 'atleta';
}

export function getUserFullName(profile: UserProfile) {
  return profile.fullName.trim() || 'Tu perfil';
}
