import { useAppData } from '@/core/app-data/AppDataContext';

type UserAvatarProps = {
  alt?: string;
  className?: string;
  imageClassName?: string;
};

export function UserAvatar({
  alt,
  className = 'h-10 w-10 overflow-hidden rounded-full border border-[rgba(0,201,167,0.2)] bg-[#203347]',
  imageClassName = 'theme-preserve h-full w-full object-cover',
}: UserAvatarProps) {
  const { userProfile } = useAppData();
  const resolvedAlt = alt ?? userProfile.fullName ?? 'Profile';
  const resolvedSrc = userProfile.avatarUrl?.trim();
  const initials =
    `${userProfile.firstName.trim().charAt(0)}${userProfile.lastName.trim().charAt(0)}`.trim() ||
    userProfile.fullName.trim().slice(0, 2).toUpperCase() ||
    'WH';

  return (
    <div className={className}>
      {resolvedSrc ? (
        <img src={resolvedSrc} alt={resolvedAlt} className={imageClassName} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(0,201,167,0.28),rgba(0,201,167,0.08)_45%,rgba(19,19,19,0.96)_100%)]">
          <span className="text-sm font-extrabold uppercase tracking-[0.16em] text-white">{initials}</span>
        </div>
      )}
    </div>
  );
}
