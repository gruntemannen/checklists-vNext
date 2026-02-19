import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
} from 'lucide-react';
import { api } from '../api/client';
import { t } from '../i18n';
import type { ApiListResponse, User, Team } from '@checklists-vnext/shared';

interface OverviewData {
  period: string;
  total: number;
  completionRate: number;
  byStatus: Record<string, number>;
  perUser: Record<string, { total: number; completed: number }>;
  perTeam: Record<string, { total: number; completed: number }>;
}

interface PerformanceData {
  period: string;
  topUsers: { userId: string; completed: number; total: number; rate: number }[];
  topTeams: { teamId: string; completed: number; total: number; rate: number }[];
  totalDeviations: number;
}

const statusLabels: Record<string, string> = {
  draft: 'Utkast',
  active: 'Aktiv',
  in_progress: 'Pågående',
  submitted: 'Inskickad',
  approved: 'Godkänd',
  rejected: 'Avvisad',
  completed: 'Slutförd',
  archived: 'Arkiverad',
};

const statusColors: Record<string, string> = {
  draft: 'bg-slate-300',
  active: 'bg-sky-400',
  in_progress: 'bg-amber-400',
  submitted: 'bg-violet-400',
  approved: 'bg-emerald-500',
  rejected: 'bg-rose-400',
  completed: 'bg-teal-400',
  archived: 'bg-zinc-400',
};

export function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const [userId, setUserId] = useState('');
  const [teamId, setTeamId] = useState('');

  const params = new URLSearchParams({ period });
  if (userId) params.set('userId', userId);
  if (teamId) params.set('teamId', teamId);

  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview', period, userId, teamId],
    queryFn: () => api.get<{ data: OverviewData }>(`/analytics/overview?${params}`),
  });

  const { data: perfData, isLoading: perfLoading } = useQuery({
    queryKey: ['analytics', 'performance', period],
    queryFn: () => api.get<{ data: PerformanceData }>(`/analytics/performance?period=${period}`),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<ApiListResponse<User>>('/users'),
    staleTime: 60_000,
  });

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get<ApiListResponse<Team>>('/teams'),
    staleTime: 60_000,
  });

  const overview = overviewData?.data;
  const perf = perfData?.data;
  const users = usersData?.data ?? [];
  const teams = teamsData?.data ?? [];
  const isLoading = overviewLoading || perfLoading;

  const getUserName = (id: string) => users.find((u) => u.userId === id)?.displayName || id.slice(0, 8);
  const getTeamName = (id: string) => teams.find((tm) => tm.teamId === id)?.name || id.slice(0, 8);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{t.analyticsTitle}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          >
            <option value="7d">{t.analytics7d}</option>
            <option value="30d">{t.analytics30d}</option>
            <option value="90d">{t.analytics90d}</option>
          </select>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          >
            <option value="">{t.allUsers}</option>
            {users.map((u) => (
              <option key={u.userId} value={u.userId}>{u.displayName}</option>
            ))}
          </select>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          >
            <option value="">{t.allTeams}</option>
            {teams.map((tm) => (
              <option key={tm.teamId} value={tm.teamId}>{tm.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!overview || overview.total === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">{t.noData}</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg text-blue-600 bg-blue-50">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{overview.total}</p>
                  <p className="text-sm text-gray-500">{t.totalChecklists}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg text-green-600 bg-green-50">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{overview.completionRate}%</p>
                  <p className="text-sm text-gray-500">{t.completionRate}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg text-green-600 bg-green-50">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{overview.byStatus['completed'] || 0}</p>
                  <p className="text-sm text-gray-500">{t.completedLabel}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg text-amber-600 bg-amber-50">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{perf?.totalDeviations ?? 0}</p>
                  <p className="text-sm text-gray-500">{t.totalDeviations}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">{t.statusDistribution}</h2>
            <div className="flex gap-1 h-8 rounded-lg overflow-hidden mb-3">
              {Object.entries(overview.byStatus).map(([status, count]) => {
                const pct = overview.total > 0 ? (count / overview.total) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={status}
                    className={`${statusColors[status] || 'bg-gray-300'} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${statusLabels[status] || status}: ${count}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4">
              {Object.entries(overview.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 text-sm">
                  <div className={`w-3 h-3 rounded-full ${statusColors[status] || 'bg-gray-300'}`} />
                  <span className="text-gray-600">{statusLabels[status] || status}: {count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Users */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-600" />
                  {t.topUsers}
                </h2>
              </div>
              {perf?.topUsers && perf.topUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-left">
                      <tr>
                        <th className="px-5 py-2.5 font-medium">{t.user}</th>
                        <th className="px-5 py-2.5 font-medium text-right">{t.completedLabel}</th>
                        <th className="px-5 py-2.5 font-medium text-right">{t.totalLabel}</th>
                        <th className="px-5 py-2.5 font-medium text-right">{t.rate}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {perf.topUsers.map((u) => (
                        <tr key={u.userId} className="hover:bg-gray-50">
                          <td className="px-5 py-2.5 text-gray-900">{getUserName(u.userId)}</td>
                          <td className="px-5 py-2.5 text-right text-green-600 font-medium">{u.completed}</td>
                          <td className="px-5 py-2.5 text-right text-gray-500">{u.total}</td>
                          <td className="px-5 py-2.5 text-right">
                            <span className={`font-medium ${u.rate >= 80 ? 'text-green-600' : u.rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {u.rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <Clock className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-sm">{t.noData}</p>
                </div>
              )}
            </div>

            {/* Top Teams */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-600" />
                  {t.topTeams}
                </h2>
              </div>
              {perf?.topTeams && perf.topTeams.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-left">
                      <tr>
                        <th className="px-5 py-2.5 font-medium">{t.team}</th>
                        <th className="px-5 py-2.5 font-medium text-right">{t.completedLabel}</th>
                        <th className="px-5 py-2.5 font-medium text-right">{t.totalLabel}</th>
                        <th className="px-5 py-2.5 font-medium text-right">{t.rate}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {perf.topTeams.map((tm) => (
                        <tr key={tm.teamId} className="hover:bg-gray-50">
                          <td className="px-5 py-2.5 text-gray-900">{getTeamName(tm.teamId)}</td>
                          <td className="px-5 py-2.5 text-right text-green-600 font-medium">{tm.completed}</td>
                          <td className="px-5 py-2.5 text-right text-gray-500">{tm.total}</td>
                          <td className="px-5 py-2.5 text-right">
                            <span className={`font-medium ${tm.rate >= 80 ? 'text-green-600' : tm.rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {tm.rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <Clock className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-sm">{t.noData}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
