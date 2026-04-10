import { useNavigate, useLocation } from 'react-router';
import { Home, Dumbbell, User } from 'lucide-react';

const navItems = [
  { path: '/', label: 'INICIO', icon: Home },
  { path: '/workouts', label: 'ENTRENAR', icon: Dumbbell },
  { path: '/profile', label: 'PERFIL', icon: User },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div
      className="shrink-0 flex items-center justify-around px-4 pb-6 pt-3 border-t border-[#203347]"
      style={{ background: 'rgba(11,31,51,0.92)', backdropFilter: 'blur(12px)' }}
    >
      {navItems.map(({ path, label, icon: Icon }) => {
        const active = isActive(path);
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
              active
                ? 'bg-[rgba(0,201,167,0.1)] shadow-[0_0_15px_rgba(0,201,167,0.2)]'
                : ''
            }`}
          >
            <Icon
              size={20}
              className={active ? 'text-[#00C9A7]' : 'text-[#90A4B8]'}
              strokeWidth={active ? 2.5 : 1.8}
            />
            <span
              className={`text-[10px] font-bold tracking-widest uppercase ${
                active ? 'text-[#00C9A7]' : 'text-[#90A4B8]'
              }`}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
