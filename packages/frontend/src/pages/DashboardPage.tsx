import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users2,
  ArrowRight,
  CalendarClock,
  Repeat,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { AssignTaskModal } from '../components/AssignTaskModal';
import { t } from '../i18n';
import type { ApiListResponse, Checklist, User } from '@checklists-vnext/shared';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAssign, setShowAssign] = useState(false);
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  const { data: checklistData } = useQuery({
    queryKey: ['checklists'],
    queryFn: () => api.get<ApiListResponse<Checklist>>('/checklists'),
  });

  const { data: userData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<ApiListResponse<User>>('/users'),
    enabled: isManager,
  });

  const allTasks = checklistData?.data ?? [];
  const users = userData?.data ?? [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdue = allTasks.filter(
    (task) => task.dueDate && new Date(task.dueDate) < today && !['completed', 'approved', 'archived'].includes(task.status),
  );
  const dueToday = allTasks.filter(
    (task) => task.dueDate && new Date(task.dueDate).toDateString() === today.toDateString() && !['completed', 'approved', 'archived'].includes(task.status),
  );
  const inProgress = allTasks.filter((task) => ['active', 'in_progress'].includes(task.status));
  const completedRecently = allTasks.filter((task) => ['completed', 'approved'].includes(task.status));
  const recurring = allTasks.filter((task) => task.recurrence && task.recurrence !== 'none');

  const stats = [
    { label: t.overdue, value: overdue.length, icon: AlertTriangle, color: 'text-red-600 bg-red-50', urgent: overdue.length > 0 },
    { label: t.dueToday, value: dueToday.length, icon: Clock, color: 'text-amber-600 bg-amber-50', urgent: false },
    { label: t.inProgress, value: inProgress.length, icon: CalendarClock, color: 'text-blue-600 bg-blue-50', urgent: false },
    { label: t.completed, value: completedRecently.length, icon: CheckCircle2, color: 'text-green-600 bg-green-50', urgent: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.dashboardTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t.dashboardWelcome}, {user?.email?.split('@')[0]}
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowAssign(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            {t.assignTask}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`bg-white rounded-xl border p-5 ${stat.urgent ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{t.needsAttention}</h2>
            <Link to="/my-tasks" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
              {t.viewAll} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {[...overdue, ...dueToday].length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-300" />
              <p className="text-sm">{t.allCaughtUp}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {[...overdue, ...dueToday].slice(0, 8).map((task) => {
                const isTaskOverdue = task.dueDate && new Date(task.dueDate) < today;
                return (
                  <li key={task.checklistId}>
                    <Link
                      to={`/checklists/${task.checklistId}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm truncate">{task.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {task.dueDate && (
                            <span className={isTaskOverdue ? 'text-red-500 font-medium' : ''}>
                              {isTaskOverdue ? `${t.overduePrefix}` : `${t.deadline}: `}
                              {new Date(task.dueDate).toLocaleDateString('sv-SE')}
                            </span>
                          )}
                        </p>
                      </div>
                      {task.recurrence && task.recurrence !== 'none' && (
                        <Repeat className="w-3.5 h-3.5 text-gray-400 ml-2 flex-shrink-0" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {isManager ? (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{t.teamSnapshot}</h2>
              <Link to="/team" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
                {t.viewAll} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {users.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Users2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">{t.addTeamMembers}</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {users.map((u) => {
                  const userTasks = allTasks.filter((task) => task.assigneeId === u.userId);
                  const userActive = userTasks.filter((task) => !['completed', 'approved', 'archived'].includes(task.status));
                  const userOverdue = userTasks.filter(
                    (task) => task.dueDate && new Date(task.dueDate) < today && !['completed', 'approved', 'archived'].includes(task.status),
                  );
                  return (
                    <li key={u.userId} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          {u.displayName?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{u.displayName}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-shrink-0">
                        <span className="text-gray-500">{userActive.length} {t.activeLabel}</span>
                        {userOverdue.length > 0 && (
                          <span className="text-red-600 font-medium">{userOverdue.length} {t.overdueLabel}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{t.recurringTasks}</h2>
            </div>
            {recurring.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Repeat className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">{t.noRecurringTasks}</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recurring.slice(0, 8).map((task) => (
                  <li key={task.checklistId}>
                    <Link
                      to={`/checklists/${task.checklistId}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      <span className="text-xs text-gray-400 capitalize flex items-center gap-1">
                        <Repeat className="w-3 h-3" />
                        {task.recurrence}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {showAssign && (
        <AssignTaskModal
          onClose={() => setShowAssign(false)}
          onCreated={(id) => {
            setShowAssign(false);
            navigate(`/checklists/${id}`);
          }}
        />
      )}
    </div>
  );
}
