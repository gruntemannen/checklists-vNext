import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, XCircle } from 'lucide-react';
import { api } from '../../api/client';
import { t } from '../../i18n';
import type { ApiListResponse, Invitation, CreateInvitationRequest } from '@checklists-vnext/shared';

export function InvitationsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => api.get<ApiListResponse<Invitation>>('/invitations'),
  });

  const createMutation = useMutation({
    mutationFn: (body: CreateInvitationRequest) =>
      api.post('/invitations', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      setShowModal(false);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/invitations/${id}?action=revoke`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/invitations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations'] }),
  });

  const invitations = data?.data ?? [];

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      email: form.get('email') as string,
      role: form.get('role') as any,
    });
  };

  const statusLabels: Record<string, string> = {
    pending: 'Väntande',
    accepted: 'Accepterad',
    revoked: 'Återkallad',
    expired: 'Utgången',
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-700';
      case 'accepted': return 'bg-green-50 text-green-700';
      case 'revoked': return 'bg-red-50 text-red-700';
      case 'expired': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t.invitationsTitle}</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.sendInvitation}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">{t.noInvitations}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">{t.email}</th>
                <th className="px-5 py-3 font-medium">{t.role}</th>
                <th className="px-5 py-3 font-medium">{t.status}</th>
                <th className="px-5 py-3 font-medium">{t.created}</th>
                <th className="px-5 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invitations.map((inv) => (
                <tr key={inv.invitationId} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{inv.email}</td>
                  <td className="px-5 py-3 capitalize text-gray-600">{inv.role}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(inv.status)}`}>
                      {statusLabels[inv.status] || inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(inv.createdAt).toLocaleDateString('sv-SE')}
                  </td>
                  <td className="px-5 py-3 flex gap-1">
                    {inv.status === 'pending' && (
                      <button
                        onClick={() => revokeMutation.mutate(inv.invitationId)}
                        className="p-1 text-amber-500 hover:text-amber-700 rounded"
                        title={t.revoke}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(t.deleteInvitation))
                          deleteMutation.mutate(inv.invitationId);
                      }}
                      className="p-1 text-red-400 hover:text-red-600 rounded"
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{t.sendInvitation}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
                <input name="email" type="email" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.role}</label>
                <select name="role" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                  <option value="user">{t.roleUser}</option>
                  <option value="manager">{t.roleManager}</option>
                  <option value="admin">{t.roleAdmin}</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">{t.cancel}</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                  {createMutation.isPending ? t.sending : t.sendInvitation}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
