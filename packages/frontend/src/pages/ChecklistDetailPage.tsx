import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  Circle,
  Upload,
  Send,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Repeat,
  Calendar,
  User,
  AlertTriangle,
  MessageSquare,
  Pencil,
  Check,
  X,
  Tag,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { UserSelect } from '../components/UserSelect';
import { t } from '../i18n';
import type { ApiResponse, ApiListResponse, Category } from '@checklists-vnext/shared';

interface ChecklistDetail {
  checklistId: string;
  title: string;
  description?: string;
  status: string;
  dueDate?: string;
  startDate?: string;
  endDate?: string;
  assigneeId?: string;
  categoryId?: string;
  recurrence: string;
  createdBy: string;
  items: ChecklistItemDetail[];
  approvals: ApprovalDetail[];
}

interface ChecklistItemDetail {
  itemId: string;
  title: string;
  description?: string;
  status: string;
  sortOrder: number;
  required: boolean;
  hasDeviation?: boolean;
  deviationNote?: string;
  mediaUrl?: string;
  mediaType?: string;
  completedBy?: string;
  completedAt?: string;
  attachments: { attachmentId: string; fileName: string }[];
  SK: string;
}

interface ApprovalDetail {
  approvalId: string;
  approverId: string;
  decision: string;
  comment?: string;
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Utkast', bg: 'bg-gray-100', text: 'text-gray-700' },
  active: { label: 'Aktiv', bg: 'bg-blue-50', text: 'text-blue-700' },
  in_progress: { label: 'Pågående', bg: 'bg-amber-50', text: 'text-amber-700' },
  submitted: { label: 'Inskickad', bg: 'bg-purple-50', text: 'text-purple-700' },
  approved: { label: 'Godkänd', bg: 'bg-green-50', text: 'text-green-700' },
  rejected: { label: 'Avvisad', bg: 'bg-red-50', text: 'text-red-700' },
  completed: { label: 'Slutförd', bg: 'bg-green-50', text: 'text-green-700' },
};

export function ChecklistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newItemTitle, setNewItemTitle] = useState('');
  const [showApproverInput, setShowApproverInput] = useState(false);
  const [approverId, setApproverId] = useState('');
  const [deviationItemId, setDeviationItemId] = useState<string | null>(null);
  const [deviationNote, setDeviationNote] = useState('');

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const { data, isLoading } = useQuery({
    queryKey: ['checklist', id],
    queryFn: () => api.get<ApiResponse<ChecklistDetail>>(`/checklists/${id}`),
    enabled: !!id,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<ApiListResponse<Category>>('/categories'),
  });

  const categories = categoriesData?.data ?? [];
  const categoryMap = new Map(categories.map((c: any) => [c.categoryId, c.name]));

  const toggleItemMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) =>
      api.patch(`/checklists/${id}/items/${itemId}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklist', id] }),
  });

  const deviationMutation = useMutation({
    mutationFn: ({ itemId, note }: { itemId: string; note: string }) =>
      api.patch(`/checklists/${id}/items/${itemId}`, {
        hasDeviation: true,
        deviationNote: note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', id] });
      setDeviationItemId(null);
      setDeviationNote('');
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (title: string) =>
      api.post(`/checklists/${id}/items`, { title, required: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', id] });
      setNewItemTitle('');
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => api.post(`/checklists/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklist', id] }),
  });

  const submitMutation = useMutation({
    mutationFn: (approverIds: string[]) =>
      api.post(`/checklists/${id}/submit`, { approverIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', id] });
      setShowApproverInput(false);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (decision: string) =>
      api.post(`/checklists/${id}/approve`, { decision }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklist', id] }),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.patch(`/checklists/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', id] });
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/checklists/${id}`),
    onSuccess: () => navigate('/my-tasks'),
  });

  const attachMutation = useMutation({
    mutationFn: async (file: File) => {
      const res = await api.post<ApiResponse<{ uploadUrl: string }>>(`/checklists/${id}/attachments`, {
        fileName: file.name,
        mimeType: file.type,
      });
      await fetch(res.data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      return res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklist', id] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const cl = data?.data;
  if (!cl) return <div className="p-8 text-center text-gray-500">{t.taskNotFound}</div>;

  const completedCount = cl.items.filter((i) => i.status === 'completed').length;
  const deviationCount = cl.items.filter((i) => i.hasDeviation).length;
  const handledCount = cl.items.filter((i) => i.status === 'completed' || i.hasDeviation || i.status === 'deviation').length;
  const totalCount = cl.items.length;
  const progress = totalCount > 0 ? Math.round((handledCount / totalCount) * 100) : 0;
  const allHandled = totalCount > 0 && handledCount === totalCount;
  const isApprover = cl.approvals.some((a) => a.approverId === user?.userId && a.decision === 'pending');
  const isOverdue = cl.dueDate && new Date(cl.dueDate) < new Date() && !['completed', 'approved', 'archived'].includes(cl.status);
  const sc = statusConfig[cl.status] || statusConfig.draft;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.checklistTitle || 'Titel'}</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.description}</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.dueDate}</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.category}</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                  >
                    <option value="">{t.noCategory}</option>
                    {categories.map((cat: any) => (
                      <option key={cat.categoryId} value={cat.categoryId}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X className="w-3.5 h-3.5" />
                {t.cancel}
              </button>
              <button
                onClick={() => {
                  const body: Record<string, unknown> = { title: editTitle.trim() };
                  body.description = editDesc.trim() || null;
                  body.dueDate = editDueDate ? new Date(editDueDate).toISOString() : null;
                  body.categoryId = editCategoryId || null;
                  updateMutation.mutate(body);
                }}
                disabled={!editTitle.trim() || updateMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                {t.save}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900">{cl.title}</h1>
                {cl.description && (
                  <p className="text-sm text-gray-500 mt-1">{cl.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                  {sc.label}
                </span>
                <button
                  onClick={() => {
                    setEditTitle(cl.title);
                    setEditDesc(cl.description || '');
                    setEditDueDate(cl.dueDate ? cl.dueDate.slice(0, 10) : '');
                    setEditCategoryId(cl.categoryId || '');
                    setEditing(true);
                  }}
                  className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-gray-100"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { if (confirm(t.deleteTask)) deleteMutation.mutate(); }}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
              {cl.categoryId && categoryMap.has(cl.categoryId) && (
                <span className="flex items-center gap-1 text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full font-medium">
                  <Tag className="w-3 h-3" />
                  {categoryMap.get(cl.categoryId)}
                </span>
              )}
              {cl.startDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {t.startDate}: {new Date(cl.startDate).toLocaleDateString('sv-SE')}
                </span>
              )}
              {cl.dueDate && (
                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                  <Calendar className="w-3.5 h-3.5" />
                  {isOverdue ? t.overduePrefix : `${t.deadline}: `}
                  {new Date(cl.dueDate).toLocaleDateString('sv-SE')}
                </span>
              )}
              {cl.recurrence && cl.recurrence !== 'none' && (
                <span className="flex items-center gap-1 text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full font-medium">
                  <Repeat className="w-3.5 h-3.5" />
                  {cl.recurrence}
                </span>
              )}
              {cl.assigneeId && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {t.assigned}
                </span>
              )}
            </div>

            {totalCount > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>
                    {completedCount} {t.markCompleted}
                    {deviationCount > 0 && ` · ${deviationCount} ${t.deviation.toLowerCase()}`}
                    {' '}{t.itemsOf} {totalCount}
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-brand-600'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{t.checklistItems}</h2>
          <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <Upload className="w-3.5 h-3.5" />
            {t.attachFile}
            <input type="file" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) attachMutation.mutate(file);
            }} />
          </label>
        </div>

        <ul className="divide-y divide-gray-100">
          {cl.items
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => {
              const isDeviation = item.hasDeviation || item.status === 'deviation';
              const isCompleted = item.status === 'completed';

              return (
                <li key={item.itemId} className="px-5 py-3">
                  <div className="flex items-start gap-3 group">
                    <button
                      onClick={() =>
                        toggleItemMutation.mutate({
                          itemId: item.itemId,
                          status: isCompleted ? 'pending' : 'completed',
                        })
                      }
                      className="flex-shrink-0 mt-0.5"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      ) : isDeviation ? (
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-300 group-hover:text-brand-400 transition-colors" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${isCompleted ? 'line-through text-gray-400' : isDeviation ? 'text-amber-700' : 'text-gray-900'}`}>
                        {item.title}
                        {item.required && <span className="text-red-400 ml-1">*</span>}
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                      )}
                      {isDeviation && item.deviationNote && (
                        <div className="mt-1.5 flex items-start gap-1.5 p-2 bg-amber-50 rounded-lg border border-amber-100">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-700">{item.deviationNote}</p>
                        </div>
                      )}
                      {item.mediaUrl && (
                        <div className="mt-1.5">
                          {item.mediaType?.startsWith('image/') ? (
                            <img src={item.mediaUrl} alt="" className="max-h-32 rounded-lg border" />
                          ) : (
                            <a href={item.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline">
                              {t.attachFile}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    {!isCompleted && !isDeviation && cl.status !== 'completed' && (
                      <button
                        onClick={() => {
                          setDeviationItemId(item.itemId);
                          setDeviationNote('');
                        }}
                        className="flex-shrink-0 px-2 py-1 text-xs text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50"
                      >
                        {t.reportDeviation}
                      </button>
                    )}
                  </div>

                  {deviationItemId === item.itemId && (
                    <div className="mt-2 ml-9 space-y-2">
                      <textarea
                        value={deviationNote}
                        onChange={(e) => setDeviationNote(e.target.value)}
                        placeholder={t.deviationNote}
                        rows={2}
                        className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => deviationMutation.mutate({ itemId: item.itemId, note: deviationNote })}
                          disabled={!deviationNote.trim() || deviationMutation.isPending}
                          className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                        >
                          {t.saveDeviation}
                        </button>
                        <button
                          onClick={() => setDeviationItemId(null)}
                          className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          {t.cancel}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
        </ul>

        {cl.status !== 'completed' && (
          <div className="px-5 py-3 border-t border-gray-100">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newItemTitle.trim()) addItemMutation.mutate(newItemTitle.trim());
              }}
              className="flex gap-2"
            >
              <input
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder={t.addItem}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
              <button
                type="submit"
                disabled={!newItemTitle.trim() || addItemMutation.isPending}
                className="px-3 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Complete Checklist Button */}
      {allHandled && cl.status !== 'completed' && cl.status !== 'approved' && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-5 text-center">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm text-green-700 mb-3">
            {t.checklistCompleted}
          </p>
          <button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {completeMutation.isPending ? t.completingChecklist : t.completeChecklist}
          </button>
        </div>
      )}

      {/* Approval section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">{t.approval}</h2>

        {cl.approvals.length > 0 && (
          <ul className="space-y-2">
            {cl.approvals.map((a) => (
              <li key={a.approvalId} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t.approver}: {a.approverId.slice(0, 8)}...</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  a.decision === 'approved' ? 'bg-green-50 text-green-700'
                    : a.decision === 'rejected' ? 'bg-red-50 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                }`}>
                  {a.decision === 'approved' ? 'Godkänd' : a.decision === 'rejected' ? 'Avvisad' : 'Väntande'}
                </span>
              </li>
            ))}
          </ul>
        )}

        {isApprover && (
          <div className="flex gap-2">
            <button
              onClick={() => approveMutation.mutate('approved')}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
            >
              <ThumbsUp className="w-4 h-4" /> {t.approve}
            </button>
            <button
              onClick={() => approveMutation.mutate('rejected')}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
            >
              <ThumbsDown className="w-4 h-4" /> {t.reject}
            </button>
          </div>
        )}

        {cl.status === 'draft' || cl.status === 'active' || cl.status === 'in_progress' ? (
          showApproverInput ? (
            <div className="flex gap-2">
              <div className="flex-1">
                <UserSelect
                  value={approverId}
                  onChange={setApproverId}
                  placeholder={t.approver + '...'}
                />
              </div>
              <button
                onClick={() => {
                  if (approverId.trim()) submitMutation.mutate([approverId.trim()]);
                }}
                disabled={!approverId || submitMutation.isPending}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {t.submit}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowApproverInput(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
            >
              <Send className="w-4 h-4" /> {t.submitForApproval}
            </button>
          )
        ) : null}
      </div>

      {/* Admin deviation overview */}
      {isAdmin && deviationCount > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-5 space-y-3">
          <h2 className="font-semibold text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {t.deviation} ({deviationCount})
          </h2>
          <ul className="space-y-2">
            {cl.items.filter((i) => i.hasDeviation || i.status === 'deviation').map((item) => (
              <li key={item.itemId} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-sm font-medium text-amber-800">{item.title}</p>
                {item.deviationNote && (
                  <p className="text-xs text-amber-600 mt-1">{item.deviationNote}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
