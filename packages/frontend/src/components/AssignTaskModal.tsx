import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { UserSelect } from './UserSelect';
import { t } from '../i18n';
import type {
  ApiListResponse,
  ApiResponse,
  ChecklistTemplate,
  Checklist,
  Category,
  Team,
} from '@checklists-vnext/shared';

interface Props {
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function AssignTaskModal({ onClose, onCreated }: Props) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'setup' | 'items'>('setup');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurrence, setRecurrence] = useState('none');
  const [templateId, setTemplateId] = useState('');
  const [items, setItems] = useState<{ title: string; required: boolean }[]>([
    { title: '', required: false },
  ]);

  const { data: templateData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get<ApiListResponse<ChecklistTemplate>>('/templates'),
    staleTime: 60_000,
  });

  const { data: categoryData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<ApiListResponse<Category>>('/categories'),
    staleTime: 60_000,
  });

  const { data: teamData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get<ApiListResponse<Team>>('/teams'),
    staleTime: 60_000,
  });

  const templates = templateData?.data ?? [];
  const categories = categoryData?.data ?? [];
  const teams = teamData?.data ?? [];

  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    const tmpl = templates.find((tp) => tp.templateId === id);
    if (tmpl) {
      setTitle(tmpl.title);
      setDescription(tmpl.description || '');
      setRecurrence(tmpl.recurrence || 'none');
      if (tmpl.items?.length) {
        setItems(tmpl.items.map((i: any) => ({ title: i.title, required: i.required ?? false })));
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<Checklist>>('/checklists', {
        title,
        description: description || undefined,
        assigneeId: assigneeId || undefined,
        categoryId: categoryId || undefined,
        teamId: teamId || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        recurrence,
        templateId: templateId || undefined,
      });
      const checklistId = res.data.checklistId;

      const validItems = items.filter((i) => i.title.trim());
      if (!templateId && validItems.length > 0) {
        for (const item of validItems) {
          await api.post(`/checklists/${checklistId}/items`, {
            title: item.title,
            required: item.required,
          });
        }
      }

      return checklistId;
    },
    onSuccess: (checklistId) => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      onCreated(checklistId);
    },
  });

  const canProceed = title.trim() && assigneeId;
  const validItems = items.filter((i) => i.title.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {step === 'setup' ? t.assignTaskTitle : t.taskItems}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'setup' ? (
            <div className="space-y-4">
              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.startFromTemplate}
                    <span className="text-gray-400 font-normal"> ({t.optional})</span>
                  </label>
                  <select
                    value={templateId}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="">{t.blankTask}</option>
                    {templates.map((tp) => (
                      <option key={tp.templateId} value={tp.templateId}>
                        {tp.title} ({tp.items?.length ?? 0} {t.items})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.taskTitle} *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.taskTitlePlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.description}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder={t.descriptionPlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.category}</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="">{t.noCategory}</option>
                    {categories.map((cat) => (
                      <option key={(cat as any).categoryId} value={(cat as any).categoryId}>
                        {(cat as any).name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.assignTo} *</label>
                <UserSelect
                  value={assigneeId}
                  onChange={setAssigneeId}
                  placeholder={t.selectEmployee}
                />
              </div>

              {teams.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.teamAssignment}</label>
                  <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="">{t.noTeam}</option>
                    {teams.map((tm) => (
                      <option key={tm.teamId} value={tm.teamId}>
                        {tm.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.startDate}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.endDate}</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.dueDate}</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.recurrence}</label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="none">{t.recurrenceNone}</option>
                    <option value="daily">{t.recurrenceDaily}</option>
                    <option value="weekly">{t.recurrenceWeekly}</option>
                    <option value="biweekly">{t.recurrenceBiweekly}</option>
                    <option value="monthly">{t.recurrenceMonthly}</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                {t.addSteps}
              </p>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{i + 1}.</span>
                    <input
                      value={item.title}
                      onChange={(e) => {
                        const copy = [...items];
                        copy[i] = { ...copy[i], title: e.target.value };
                        setItems(copy);
                      }}
                      placeholder={`${t.stepPlaceholder} ${i + 1}...`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={item.required}
                        onChange={(e) => {
                          const copy = [...items];
                          copy[i] = { ...copy[i], required: e.target.checked };
                          setItems(copy);
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
                className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
              >
                <Plus className="w-3.5 h-3.5" /> {t.addStep}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          {step === 'items' ? (
            <>
              <button
                onClick={() => setStep('setup')}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.back}
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="px-5 py-2 text-sm bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {createMutation.isPending ? t.assigning : `${t.assignTask}${validItems.length > 0 ? ` (${validItems.length} ${t.items})` : ''}`}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => setStep('items')}
                disabled={!canProceed}
                className="px-5 py-2 text-sm bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {t.nextAddItems}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
