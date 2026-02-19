import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileText, Repeat, Pencil, Check, X } from 'lucide-react';
import { api } from '../api/client';
import { t } from '../i18n';
import type { ApiListResponse, ApiResponse, ChecklistTemplate, Checklist, CreateTemplateRequest } from '@checklists-vnext/shared';

interface EditState {
  title: string;
  description: string;
  recurrence: string;
  items: { title: string; required: boolean }[];
}

export function TemplatesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState([{ title: '', required: false }]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get<ApiListResponse<ChecklistTemplate>>('/templates'),
  });

  const createMutation = useMutation({
    mutationFn: (body: CreateTemplateRequest) => api.post('/templates', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setShowModal(false);
      setItems([{ title: '', required: false }]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch(`/templates/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setEditingId(null);
      setEdit(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  const createFromTemplate = useMutation({
    mutationFn: (template: ChecklistTemplate) =>
      api.post<ApiResponse<Checklist>>('/checklists', {
        templateId: template.templateId,
        title: template.title,
        description: template.description,
        recurrence: template.recurrence,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      const checklistId = res.data.checklistId;
      navigate(`/checklists/${checklistId}`);
    },
  });

  const templates = data?.data ?? [];

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const validItems = items.filter((i) => i.title.trim());
    if (validItems.length === 0) return;

    createMutation.mutate({
      title: form.get('title') as string,
      description: form.get('description') as string || undefined,
      recurrence: form.get('recurrence') as any,
      items: validItems,
    });
  };

  const startEdit = (tmpl: ChecklistTemplate) => {
    setEditingId(tmpl.templateId);
    setEdit({
      title: tmpl.title,
      description: tmpl.description || '',
      recurrence: tmpl.recurrence || 'none',
      items: (tmpl.items || []).map((i: any) => ({ title: i.title, required: i.required })),
    });
  };

  const saveEdit = (id: string) => {
    if (!edit || !edit.title.trim()) return;
    const validItems = edit.items.filter((i) => i.title.trim());
    if (validItems.length === 0) return;
    updateMutation.mutate({
      id,
      body: {
        title: edit.title.trim(),
        description: edit.description.trim() || undefined,
        recurrence: edit.recurrence,
        items: validItems,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t.templatesTitle}</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.newTemplate}
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium mb-1">{t.noTemplates}</p>
          <p className="text-sm">{t.createTemplateDesc}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <div
              key={tmpl.templateId}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              {editingId === tmpl.templateId && edit ? (
                <div className="space-y-3">
                  <input
                    value={edit.title}
                    onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                  <textarea
                    value={edit.description}
                    onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                    rows={2}
                    placeholder={t.description}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                  <select
                    value={edit.recurrence}
                    onChange={(e) => setEdit({ ...edit, recurrence: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                  >
                    <option value="none">{t.recurrenceNone}</option>
                    <option value="daily">{t.recurrenceDaily}</option>
                    <option value="weekly">{t.recurrenceWeekly}</option>
                    <option value="biweekly">{t.recurrenceBiweekly}</option>
                    <option value="monthly">{t.recurrenceMonthly}</option>
                  </select>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{t.templateItems}</label>
                    <div className="space-y-2">
                      {edit.items.map((item, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input
                            value={item.title}
                            onChange={(e) => {
                              const newItems = [...edit.items];
                              newItems[i] = { ...newItems[i], title: e.target.value };
                              setEdit({ ...edit, items: newItems });
                            }}
                            placeholder={`${t.stepPlaceholder} ${i + 1}`}
                            className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                          />
                          <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={item.required}
                              onChange={(e) => {
                                const newItems = [...edit.items];
                                newItems[i] = { ...newItems[i], required: e.target.checked };
                                setEdit({ ...edit, items: newItems });
                              }}
                              className="rounded"
                            />
                            {t.required}
                          </label>
                          {edit.items.length > 1 && (
                            <button
                              onClick={() => setEdit({ ...edit, items: edit.items.filter((_, j) => j !== i) })}
                              className="p-0.5 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setEdit({ ...edit, items: [...edit.items, { title: '', required: false }] })}
                      className="mt-1.5 text-xs text-brand-600 hover:text-brand-700"
                    >
                      {t.addTemplateItem}
                    </button>
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={() => { setEditingId(null); setEdit(null); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <X className="w-3 h-3" />
                      {t.cancel}
                    </button>
                    <button
                      onClick={() => saveEdit(tmpl.templateId)}
                      disabled={!edit.title.trim() || edit.items.filter((i) => i.title.trim()).length === 0 || updateMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
                      {t.save}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{tmpl.title}</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(tmpl)}
                        className="p-1 text-gray-400 hover:text-brand-600 rounded"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`${t.delete}?`))
                            deleteMutation.mutate(tmpl.templateId);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {tmpl.description && (
                    <p className="text-sm text-gray-500 mb-3">{tmpl.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                    <span>{tmpl.items?.length ?? 0} {t.items}</span>
                    {tmpl.recurrence !== 'none' && (
                      <span className="flex items-center gap-1">
                        <Repeat className="w-3 h-3" />
                        {tmpl.recurrence}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => createFromTemplate.mutate(tmpl)}
                    disabled={createFromTemplate.isPending}
                    className="w-full py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors disabled:opacity-50"
                  >
                    {createFromTemplate.isPending ? t.creating : t.createFromTemplate}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{t.newTemplate}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.templateTitle}</label>
                <input name="title" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.description}</label>
                <textarea name="description" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.recurrence}</label>
                <select name="recurrence" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                  <option value="none">{t.recurrenceNone}</option>
                  <option value="daily">{t.recurrenceDaily}</option>
                  <option value="weekly">{t.recurrenceWeekly}</option>
                  <option value="biweekly">{t.recurrenceBiweekly}</option>
                  <option value="monthly">{t.recurrenceMonthly}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.templateItems}</label>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        value={item.title}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[i] = { ...newItems[i], title: e.target.value };
                          setItems(newItems);
                        }}
                        placeholder={`${t.stepPlaceholder} ${i + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                      <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={item.required}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[i] = { ...newItems[i], required: e.target.checked };
                            setItems(newItems);
                          }}
                          className="rounded"
                        />
                        {t.required}
                      </label>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setItems(items.filter((_, j) => j !== i))}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setItems([...items, { title: '', required: false }])}
                  className="mt-2 text-sm text-brand-600 hover:text-brand-700"
                >
                  {t.addTemplateItem}
                </button>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => { setShowModal(false); setItems([{ title: '', required: false }]); }} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">{t.cancel}</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                  {createMutation.isPending ? t.creating : t.createTemplate}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
