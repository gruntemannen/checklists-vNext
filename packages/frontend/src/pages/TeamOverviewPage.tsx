import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users2,
  PlusCircle,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Repeat,
  Calendar,
} from 'lucide-react';
import { api } from '../api/client';
import { AssignTaskModal } from '../components/AssignTaskModal';
import { t } from '../i18n';
import type { ApiListResponse, User, Checklist } from '@checklists-vnext/shared';

export function TeamOverviewPage() {
  const navigate = useNavigate();
  const [showAssign, setShowAssign] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState<Record<string, boolean>>({});

  const { data: userData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<ApiListResponse<User>>('/users'),
  });

  const { data: checklistData, isLoading: tasksLoading } = useQuery({
    queryKey: ['checklists'],
    queryFn: () => api.get<ApiListResponse<Checklist>>('/checklists'),
  });

  const users = userData?.data ?? [];
  const allTasks = checklistData?.data ?? [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const isLoading = usersLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.teamTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} {users.length !== 1 ? t.members : t.member}</p>
        </div>
        <button
          onClick={() => setShowAssign(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
        >
          <PlusCircle className="w-5 h-5" />
          {t.assignTask}
        </button>
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">{t.noTeamMembers}</p>
          <p className="text-sm text-gray-400 mt-1">
            {t.addUsersVia} <Link to="/admin/users" className="text-brand-600 hover:underline">{t.adminUsers}</Link>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const userTasks = allTasks.filter((task) => task.assigneeId === u.userId);
            const active = userTasks.filter(
              (task) => !['completed', 'approved', 'archived'].includes(task.status),
            );
            const completed = userTasks.filter((task) =>
              ['completed', 'approved'].includes(task.status),
            );
            const overdue = active.filter(
              (task) => task.dueDate && new Date(task.dueDate) < today,
            );
            const totalDone = completed.length;
            const totalAll = userTasks.length;
            const pct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;
            const isExpanded = expandedUser === u.userId;

            return (
              <div key={u.userId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : u.userId)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {u.displayName?.charAt(0).toUpperCase() || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{u.displayName}</p>
                      <span className="text-xs text-gray-400">{u.email}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-[200px]">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{totalDone}/{totalAll} {t.done}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {overdue.length > 0 && (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> {overdue.length} {t.overdueLabel}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" /> {active.length} {t.activeLabel}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <div className="flex gap-1 px-5 pt-3 pb-1">
                      <button
                        onClick={() => setShowCompleted({ ...showCompleted, [u.userId]: false })}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          !showCompleted[u.userId]
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {t.activeLabel} ({active.length})
                      </button>
                      <button
                        onClick={() => setShowCompleted({ ...showCompleted, [u.userId]: true })}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          showCompleted[u.userId]
                            ? 'bg-green-50 text-green-700'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {t.completedLabel} ({completed.length})
                      </button>
                    </div>

                    {(() => {
                      const visibleTasks = showCompleted[u.userId] ? completed : active;
                      if (visibleTasks.length === 0) {
                        return (
                          <div className="px-5 py-6 text-center text-sm text-gray-400">
                            <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-green-300" />
                            {showCompleted[u.userId] ? t.noCompletedTasks : t.noActiveTasks}
                          </div>
                        );
                      }
                      return (
                        <ul className="divide-y divide-gray-50">
                          {visibleTasks.map((task) => {
                            const isOverdue = task.dueDate && new Date(task.dueDate) < today;
                            const isDone = ['completed', 'approved'].includes(task.status);
                            const statusStyle = isDone
                              ? 'bg-green-50 text-green-600'
                              : task.status === 'submitted' ? 'bg-purple-50 text-purple-600'
                              : task.status === 'in_progress' ? 'bg-amber-50 text-amber-600'
                              : 'bg-gray-100 text-gray-500';
                            const statusLabel = task.status === 'completed' ? t.completedLabel
                              : task.status === 'approved' ? 'Godkänd'
                              : task.status.replace('_', ' ');
                            return (
                              <li key={task.checklistId}>
                                <Link
                                  to={`/checklists/${task.checklistId}`}
                                  className="flex items-center justify-between px-5 py-2.5 pl-20 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="min-w-0">
                                    <p className={`text-sm ${isDone ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{task.title}</p>
                                    <div className="flex items-center gap-3 mt-0.5">
                                      {task.dueDate && (
                                        <span className={`flex items-center gap-1 text-xs ${isOverdue && !isDone ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                          <Calendar className="w-3 h-3" />
                                          {new Date(task.dueDate).toLocaleDateString('sv-SE')}
                                        </span>
                                      )}
                                      {task.recurrence && task.recurrence !== 'none' && (
                                        <span className="flex items-center gap-1 text-xs text-brand-500">
                                          <Repeat className="w-3 h-3" /> {task.recurrence}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle}`}>
                                    {statusLabel}
                                  </span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
