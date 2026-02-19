import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Users2,
  FileText,
  Users,
  UserPlus,
  UsersRound,
  LogOut,
  Menu,
  X,
  ClipboardCheck,
  BarChart3,
  Tag,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { t } from '../i18n';
import clsx from 'clsx';

const navItems = [
  { to: '/', label: t.navDashboard, icon: LayoutDashboard },
  { to: '/my-tasks', label: t.navMyTasks, icon: CheckSquare },
  { to: '/team', label: t.navTeam, icon: Users2 },
  { to: '/templates', label: t.navTemplates, icon: FileText },
  { to: '/analytics', label: t.navAnalytics, icon: BarChart3 },
];

const adminItems = [
  { to: '/admin/users', label: t.navUsers, icon: Users },
  { to: '/admin/invitations', label: t.navInvitations, icon: UserPlus },
  { to: '/admin/teams', label: t.navTeams, icon: UsersRound },
  { to: '/admin/categories', label: t.navCategories, icon: Tag },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
      isActive
        ? 'bg-brand-50 text-brand-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
    );

  const sidebar = (
    <nav className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-brand-600" />
          {t.appName}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={linkClass}
            onClick={() => setSidebarOpen(false)}
            end={item.to === '/'}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t.navAdmin}
              </p>
            </div>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={linkClass}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </div>

      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.email}
            </p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title={t.navSignOut}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-white border-r border-gray-200">
        {sidebar}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-gray-600/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50">
            <button
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 lg:px-6 flex items-center gap-4">
          <button
            className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700 rounded-md"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
