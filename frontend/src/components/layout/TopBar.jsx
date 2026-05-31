import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

export default function TopBar({ onMenuClick, title }) {
  const { user, logout } = useAuth();
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-primary hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          ☰
        </button>
        <h1 className="text-lg font-bold text-primary lg:text-xl">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
          <p className="text-xs text-neutral">{user?.email}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          {initials}
        </div>
        <Button variant="secondary" className="!px-3 !py-2 text-xs" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
