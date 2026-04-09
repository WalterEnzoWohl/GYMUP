import { useAppData } from '../data/AppDataContext';

type UserAvatarProps = {
  alt?: string;
  className?: string;
  imageClassName?: string;
};

export function UserAvatar({
  alt,
  className = 'h-10 w-10 overflow-hidden rounded-full border border-[rgba(18,239,211,0.2)] bg-[#262626]',
  imageClassName = 'theme-preserve h-full w-full object-cover',
}: UserAvatarProps) {
  const { userProfile } = useAppData();
  const resolvedAlt = alt ?? userProfile.fullName ?? 'Profile';
  const resolvedSrc = userProfile.avatarUrl?.trim();
  const initials =
    `${userProfile.firstName.trim().charAt(0)}${userProfile.lastName.trim().charAt(0)}`.trim() ||
    userProfile.fullName.trim().slice(0, 2).toUpperCase() ||
    'GU';

  return (
    <div className={className}>
      {resolvedSrc ? (
        <img src={resolvedSrc} alt={resolvedAlt} className={imageClassName} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(18,239,211,0.28),rgba(18,239,211,0.08)_45%,rgba(19,19,19,0.96)_100%)]">
          <span className="text-sm font-extrabold uppercase tracking-[0.16em] text-white">{initials}</span>
        </div>
      )}
    </div>
  );
}
