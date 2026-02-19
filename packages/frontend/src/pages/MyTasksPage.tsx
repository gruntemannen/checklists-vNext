import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Repeat,
  ChevronRight,
  Inbox,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { t } from '../i18n';
import type { ApiListResponse, Checklist } from '@checklists-vnext/shared';

type Filter = 'active' | 'completed' | 'all';
type Scope = 'mine' | 'org';

const filterLabels: Record<Filter, string> = {
  active: t.filterActive,
  completed: t.filterCompleted,
  all: t.filterAll,
};

export function MyTasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('active');
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const [scope, setScope] = useState<Scope>('mine');

  const { data, isLoading } = useQuery({
    queryKey: ['checklists', 'all'],
    queryFn: () => api.get<ApiListResponse<Checklist>>('/checklists?limit=200'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/checklists/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['checklists'] }),
  });

  const allOrgTasks = data?.data ?? [];
  const tasks = scope === 'mine'
    ? allOrgTasks.filter((task) => task.assigneeId === user?.userId || task.createdBy === user?.userId)
    : allOrgTasks;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const activeTasks = tasks.filter(
    (task) => !['completed', 'approved', 'archived'].includes(task.status),
  );
  const completedTasks = tasks.filter((task) =>
    ['completed', 'approved'].includes(task.status),
  );

  const filtered = filter === 'completed' ? completedTasks : filter === 'active' ? activeTasks : tasks;

  const overdue = filtered.filter(
    (task) =>
      task.dueDate &&
      new Date(task.dueDate) < today &&
      !['completed', 'approved', 'archived'].includes(task.status),
  );
  const dueToday = filtered.filter(
    (task) =>
      task.dueDate &&
      new Date(task.dueDate).toDateString() === today.toDateString() &&
      !['completed', 'approved', 'archived'].includes(task.status),
  );
  const thisWeek = filtered.filter((task) => {
    if (!task.dueDate || ['completed', 'approved', 'archived'].includes(task.status)) return false;
    const d = new Date(task.dueDate);
    return d > today && d <= weekEnd;
  });
  const later = filtered.filter((task) => {
    if (['completed', 'approved', 'archived'].includes(task.status)) return false;
    if (!task.dueDate) return true;
    return new Date(task.dueDate) > weekEnd;
  });

  const groups =
    filter === 'completed'
      ? [{ label: t.filterCompleted, tasks: completedTasks, color: 'text-green-600' }]
      : [
          ...(overdue.length > 0 ? [{ label: t.groupOverdue, tasks: overdue, color: 'text-red-600' }] : []),
          ...(dueToday.length > 0 ? [{ label: t.groupToday, tasks: dueToday, color: 'text-amber-600' }] : []),
          ...(thisWeek.length > 0 ? [{ label: t.groupThisWeek, tasks: thisWeek, color: 'text-blue-600' }] : []),
          ...(later.length > 0 ? [{ label: t.groupLater, tasks: later, color: 'text-gray-500' }] : []),
        ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{t.myTasksTitle}</h1>
          {isManager && (
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setScope('mine')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${scope === 'mine' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.myTasks}
              </button>
              <button
                onClick={() => setScope('org')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${scope === 'org' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.allChecklists}
              </button>
            </div>
          )}
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(['active', 'completed', 'all'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {filterLabels[f]} {f === 'active' ? `(${activeTasks.length})` : f === 'completed' ? `(${completedTasks.length})` : `(${tasks.length})`}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Inbox className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">
            {filter === 'completed' ? t.noCompletedTasks : t.noTasksAssigned}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {filter === 'active' && t.askManager}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className={`text-xs font-bold uppercase tracking-wider mb-2 ${group.color}`}>
                {group.label}
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {group.tasks.map((task) => {
                  const isDone = ['completed', 'approved'].includes(task.status);
                  const statusBadge = isDone
                    ? { label: t.filterCompleted, cls: 'bg-green-50 text-green-700' }
                    : task.status === 'draft'
                      ? { label: 'Utkast', cls: 'bg-gray-100 text-gray-600' }
                      : { label: t.filterActive, cls: 'bg-blue-50 text-blue-700' };

                  return (
                    <Link
                      key={task.checklistId}
                      to={`/checklists/${task.checklistId}`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${isDone ? 'text-gray-400' : 'text-gray-900'}`}>
                            {task.title}
                          </p>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusBadge.cls}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {task.dueDate && (
                            <span className={`flex items-center gap-1 text-xs ${
                              !isDone && new Date(task.dueDate) < today ? 'text-red-500 font-medium' : 'text-gray-400'
                            }`}>
                              <Calendar className="w-3 h-3" />
                              {t.deadline}: {new Date(task.dueDate).toLocaleDateString('sv-SE')}
                            </span>
                          )}
                          {task.recurrence && task.recurrence !== 'none' && (
                            <span className="flex items-center gap-1 text-xs text-brand-500">
                              <Repeat className="w-3 h-3" />
                              {task.recurrence}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm(t.deleteTask))
                            deleteMutation.mutate(task.checklistId);
                        }}
                        className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        title={t.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
