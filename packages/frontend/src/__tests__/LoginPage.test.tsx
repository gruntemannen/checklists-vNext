// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { t } from '../i18n';

const mockLogin = vi.fn();
const mockCompleteNewPassword = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({
    login: mockLogin,
    completeNewPassword: mockCompleteNewPassword,
    needsNewPassword: false,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText(t.emailLabel)).toBeInTheDocument();
    expect(screen.getByLabelText(t.passwordLabel)).toBeInTheDocument();
  });

  it('renders the sign in button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: t.signIn })).toBeInTheDocument();
  });

  it('renders the title', () => {
    renderLogin();
    expect(screen.getByText(t.loginTitle)).toBeInTheDocument();
  });

  it('calls login with email and password on submit', async () => {
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(t.emailLabel), 'user@test.com');
    await user.type(screen.getByLabelText(t.passwordLabel), 'password123');
    await user.click(screen.getByRole('button', { name: t.signIn }));

    expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'password123');
  });

  it('navigates to / on successful login', async () => {
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(t.emailLabel), 'user@test.com');
    await user.type(screen.getByLabelText(t.passwordLabel), 'pass');
    await user.click(screen.getByRole('button', { name: t.signIn }));

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows error message on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Bad credentials'));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(t.emailLabel), 'user@test.com');
    await user.type(screen.getByLabelText(t.passwordLabel), 'wrong');
    await user.click(screen.getByRole('button', { name: t.signIn }));

    expect(await screen.findByText('Bad credentials')).toBeInTheDocument();
  });
});
