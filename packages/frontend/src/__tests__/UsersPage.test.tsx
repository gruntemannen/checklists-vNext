// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UsersPage } from '../pages/admin/UsersPage';
import { t } from '../i18n';

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { email: 'admin@test.com', userId: 'u1', orgId: 'org1', role: 'admin' },
    token: 'test-token',
    login: vi.fn(),
    logout: vi.fn(),
    completeNewPassword: vi.fn(),
    needsNewPassword: false,
  }),
}));

const mockUsers = [
  { userId: 'u1', displayName: 'Alice Admin', email: 'alice@example.com', role: 'admin', status: 'active' },
  { userId: 'u2', displayName: 'Bob User', email: 'bob@example.com', role: 'user', status: 'pending' },
];

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ data: mockUsers }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
});

afterEach(() => {
  cleanup();
});

describe('UsersPage', () => {
  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText(t.usersTitle)).toBeInTheDocument();
  });

  it('renders the add user button', () => {
    renderPage();
    expect(screen.getByText(t.addUser)).toBeInTheDocument();
  });

  it('renders the search input', () => {
    renderPage();
    expect(screen.getByPlaceholderText(t.searchUsers)).toBeInTheDocument();
  });

  it('fetches and displays users', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });
    expect(screen.getByText('Bob User')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('displays correct status badges', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('active')).toBeInTheDocument();
    });
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('shows table headers', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    const headerTexts = headers.map((th) => th.textContent);
    expect(headerTexts).toContain(t.name);
    expect(headerTexts).toContain(t.email);
    expect(headerTexts).toContain(t.role);
    expect(headerTexts).toContain(t.status);
  });
});
