import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar, User, Tag } from 'lucide-react';
import { api } from '../api/client';
import { t } from '../i18n';
import type { ApiListResponse, Checklist, CreateChecklistRequest, Category } from '@checklists-vnext/shared';

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  submitted: 'bg-purple-50 text-purple-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  completed: 'bg-green-50 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
};

const statusLabel: Record<string, string> = {
  draft: 'Utkast',
  active: 'Aktiv',
  in_progress: 'Pågående',
  submitted: 'Inskickad',
  approved: 'Godkänd',
  rejected: 'Avvisad',
  completed: 'Slutförd',
  archived: 'Arkiverad',
};

export function ChecklistsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['checklists'],
    queryFn: () => api.get<ApiListResponse<Checklist>>('/checklists'),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<ApiListResponse<Category>>('/categories'),
  });

  const createMutation = useMutation({
    mutationFn: (body: CreateChecklistRequest) =>
      api.post('/checklists', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      setShowModal(false);
    },
  });

  const categories = categoriesData?.data ?? [];
  const categoryMap = new Map(categories.map((c: any) => [c.categoryId, c.name]));

  const checklists = (data?.data ?? [])
    .filter((c) => c.title?.toLowerCase().includes(search.toLowerCase()))
    .filter((c: any) => !categoryFilter || c.categoryId === categoryFilter);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body: CreateChecklistRequest = {
      title: form.get('title') as string,
      description: form.get('description') as string || undefined,
      dueDate: form.get('dueDate') ? new Date(form.get('dueDate') as string).toISOString() : undefined,
      categoryId: (form.get('categoryId') as string) || undefined,
    };
    createMutation.mutate(body);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t.allChecklists}</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.newChecklist}
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t.searchChecklists}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
        </div>
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
          >
            <option value="">{t.allCategories}</option>
            {categories.map((cat: any) => (
              <option key={cat.categoryId} value={cat.categoryId}>
                {cat.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : checklists.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          <p className="text-lg font-medium mb-1">{t.noChecklistsYet}</p>
          <p className="text-sm">{t.noChecklistsDesc}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {checklists.map((cl: any) => (
            <Link
              key={cl.checklistId}
              to={`/checklists/${cl.checklistId}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                  {cl.title}
                </h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusColor[cl.status] || statusColor.draft}`}>
                  {statusLabel[cl.status] || cl.status}
                </span>
              </div>
              {cl.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                  {cl.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                {cl.categoryId && categoryMap.has(cl.categoryId) && (
                  <span className="flex items-center gap-1 text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full font-medium">
                    <Tag className="w-3 h-3" />
                    {categoryMap.get(cl.categoryId)}
                  </span>
                )}
                {cl.dueDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(cl.dueDate).toLocaleDateString('sv-SE')}
                  </span>
                )}
                {cl.assigneeId && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {t.assigned}
                  </span>
                )}
                {cl.recurrence && cl.recurrence !== 'none' && (
                  <span className="capitalize">{cl.recurrence}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{t.newChecklist}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.checklistTitle}</label>
                <input name="title" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.description}</label>
                <textarea name="description" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.category}</label>
                  <select name="categoryId" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white">
                    <option value="">{t.noCategory}</option>
                    {categories.map((cat: any) => (
                      <option key={cat.categoryId} value={cat.categoryId}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.dueDate}</label>
                <input name="dueDate" type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">{t.cancel}</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                  {createMutation.isPending ? t.creating : t.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
