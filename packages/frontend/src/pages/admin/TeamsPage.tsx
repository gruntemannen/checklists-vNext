import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Users, X, Pencil, UserMinus, UserPlus2 } from 'lucide-react';
import { api } from '../../api/client';
import { UserSelect } from '../../components/UserSelect';
import { t } from '../../i18n';
import type { ApiListResponse, Team, User, CreateTeamRequest } from '@checklists-vnext/shared';

export function TeamsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [addMemberId, setAddMemberId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get<ApiListResponse<Team>>('/teams'),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<ApiListResponse<User>>('/users'),
    staleTime: 60_000,
  });

  const users = usersData?.data ?? [];
  const getUserName = (id: string) => {
    const u = users.find((user) => user.userId === id);
    return u ? `${u.displayName} (${u.email})` : id.slice(0, 8) + '...';
  };

  const createMutation = useMutation({
    mutationFn: (body: CreateTeamRequest) => api.post('/teams', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowCreateModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch(`/teams/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setEditingTeam(null);
    },
  });

  const teams = data?.data ?? [];

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      name: form.get('name') as string,
      description: form.get('description') as string,
      visibility: form.get('visibility') as any,
      managerId: form.get('managerId') as string,
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTeam) return;
    const form = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingTeam.teamId,
      body: {
        name: form.get('name') as string,
        description: form.get('description') as string,
        visibility: form.get('visibility') as string,
        managerId: form.get('managerId') as string,
      },
    }, {
      onSuccess: () => {
        const updated = {
          ...editingTeam,
          name: form.get('name') as string,
          description: form.get('description') as string,
          visibility: form.get('visibility') as any,
          managerId: form.get('managerId') as string,
        };
        setEditingTeam(updated);
      },
    });
  };

  const handleAddMember = () => {
    if (!editingTeam || !addMemberId) return;
    const currentMembers = editingTeam.memberIds || [];
    if (currentMembers.includes(addMemberId)) return;
    const newMembers = [...currentMembers, addMemberId];
    updateMutation.mutate({
      id: editingTeam.teamId,
      body: { memberIds: newMembers },
    }, {
      onSuccess: () => {
        setEditingTeam({ ...editingTeam, memberIds: newMembers });
        setAddMemberId('');
      },
    });
  };

  const handleRemoveMember = (memberId: string) => {
    if (!editingTeam) return;
    const newMembers = (editingTeam.memberIds || []).filter((id) => id !== memberId);
    updateMutation.mutate({
      id: editingTeam.teamId,
      body: { memberIds: newMembers },
    }, {
      onSuccess: () => {
        setEditingTeam({ ...editingTeam, memberIds: newMembers });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t.adminTeamsTitle}</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.createTeam}
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p>{t.noTeamsCreated}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div
              key={team.teamId}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-300 transition-colors cursor-pointer"
              onClick={() => setEditingTeam(team)}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900">{team.name}</h3>
                  {team.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{team.description}</p>
                  )}
                </div>
                <Pencil className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                <span className="capitalize px-2 py-0.5 bg-gray-100 rounded-full">
                  {team.visibility === 'public' ? t.visibilityPublic : t.visibilityPrivate}
                </span>
                <span>{team.memberIds?.length ?? 0} {t.members}</span>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                {t.manager}: {getUserName(team.managerId)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{t.createTeam}</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.teamName}</label>
                <input name="name" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.description}</label>
                <textarea name="description" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.visibility}</label>
                <select name="visibility" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                  <option value="public">{t.visibilityPublic}</option>
                  <option value="private">{t.visibilityPrivate}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.manager}</label>
                <UserSelect name="managerId" required placeholder={t.selectManager} />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">{t.cancel}</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                  {createMutation.isPending ? t.creating : t.createTeam}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{t.editTeam}</h2>
              <button onClick={() => setEditingTeam(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Team details form */}
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.teamName}</label>
                  <input name="name" defaultValue={editingTeam.name} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.description}</label>
                  <textarea name="description" defaultValue={editingTeam.description || ''} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.visibility}</label>
                    <select name="visibility" defaultValue={editingTeam.visibility} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                      <option value="public">{t.visibilityPublic}</option>
                      <option value="private">{t.visibilityPrivate}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.manager}</label>
                    <UserSelect name="managerId" value={editingTeam.managerId} onChange={(id) => setEditingTeam({ ...editingTeam, managerId: id })} placeholder={t.selectManager} />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? t.saving : t.saveChanges}
                </button>
              </form>

              {/* Members section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {t.teamMembers} ({editingTeam.memberIds?.length ?? 0})
                </h3>

                {(editingTeam.memberIds?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-400 mb-3">{t.noMembers}</p>
                ) : (
                  <ul className="space-y-2 mb-3">
                    {editingTeam.memberIds?.map((memberId) => {
                      const memberUser = users.find((u) => u.userId === memberId);
                      return (
                        <li key={memberId} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {memberUser?.displayName?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{memberUser?.displayName || memberId.slice(0, 8)}</p>
                              {memberUser?.email && <p className="text-xs text-gray-400 truncate">{memberUser.email}</p>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(memberId)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded flex-shrink-0"
                            title={t.removeFromTeam}
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="flex gap-2">
                  <div className="flex-1">
                    <UserSelect
                      value={addMemberId}
                      onChange={setAddMemberId}
                      placeholder={t.selectMember}
                    />
                  </div>
                  <button
                    onClick={handleAddMember}
                    disabled={!addMemberId || updateMutation.isPending}
                    className="px-3 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <UserPlus2 className="w-4 h-4" />
                    {t.addMember}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer with delete */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => {
                  if (confirm(t.deleteTeam)) deleteMutation.mutate(editingTeam.teamId);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t.delete}
              </button>
              <button
                onClick={() => setEditingTeam(null)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
