import { NavLink } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';

const navItems = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: '📊' },
  { to: ROUTES.EXPENSES, label: 'Expenses', icon: '💰' },
  { to: ROUTES.REPORTS, label: 'Reports', icon: '📄' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-primary text-white transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg font-bold">
              EF
            </div>
            <div>
              <p className="font-bold tracking-tight">ExpenseFlow</p>
              <p className="text-xs text-white/60">Personal Finance</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-accent text-white shadow-sm'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-6 py-4 text-xs text-white/50">
          © 2026 ExpenseFlow
        </div>
      </aside>
    </>
  );
}
