import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { ApiListResponse, User } from '@checklists-vnext/shared';

interface UserSelectProps {
  name?: string;
  value?: string;
  onChange?: (userId: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function UserSelect({
  name,
  value,
  onChange,
  required,
  placeholder = 'Select a user...',
  className = '',
}: UserSelectProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<ApiListResponse<User>>('/users'),
    staleTime: 60_000,
  });

  const users = data?.data ?? [];

  const controlledProps = value !== undefined
    ? { value, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange?.(e.target.value) }
    : { defaultValue: '', onChange: onChange ? (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value) : undefined };

  return (
    <select
      name={name}
      {...controlledProps}
      required={required}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none ${className}`}
    >
      <option value="">
        {isLoading ? 'Loading users...' : placeholder}
      </option>
      {users.map((u) => (
        <option key={u.userId} value={u.userId}>
          {u.displayName} ({u.email})
        </option>
      ))}
    </select>
  );
}
