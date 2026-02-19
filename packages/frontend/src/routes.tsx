import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { api } from './api/client';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { TeamOverviewPage } from './pages/TeamOverviewPage';
import { ChecklistDetailPage } from './pages/ChecklistDetailPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { InvitationsPage } from './pages/admin/InvitationsPage';
import { TeamsPage } from './pages/admin/TeamsPage';
import { CategoriesPage } from './pages/admin/CategoriesPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  const { token } = useAuth();

  api.setToken(token);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="my-tasks" element={<MyTasksPage />} />
        <Route path="team" element={<TeamOverviewPage />} />
        <Route path="checklists/:id" element={<ChecklistDetailPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="admin/users" element={<UsersPage />} />
        <Route path="admin/invitations" element={<InvitationsPage />} />
        <Route path="admin/teams" element={<TeamsPage />} />
        <Route path="admin/categories" element={<CategoriesPage />} />
        <Route path="checklists" element={<Navigate to="/my-tasks" replace />} />
      </Route>
    </Routes>
  );
}
