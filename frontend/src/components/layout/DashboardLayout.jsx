import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const titles = {
  '/dashboard': 'Dashboard',
  '/expenses': 'Expenses',
  '/reports': 'PDF Reports',
};

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const title = titles[pathname] || 'ExpenseFlow';

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:pl-64">
        <TopBar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="page-enter p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
