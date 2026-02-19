import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { email: string; userId: string; orgId: string; role: string } | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  completeNewPassword: (newPassword: string) => Promise<void>;
  needsNewPassword: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';

const userPool = new CognitoUserPool({
  UserPoolId: POOL_ID,
  ClientId: CLIENT_ID,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,
  });
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [cognitoUser, setCognitoUser] = useState<CognitoUser | null>(null);

  const extractUser = useCallback((session: CognitoUserSession) => {
    const idToken = session.getIdToken();
    const payload = idToken.decodePayload();
    return {
      email: payload.email,
      userId: payload.sub,
      orgId: payload['custom:orgId'] || '',
      role: payload['custom:role'] || 'user',
    };
  }, []);

  useEffect(() => {
    const currentUser = userPool.getCurrentUser();
    if (!currentUser) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) {
        setState((s) => ({ ...s, isLoading: false }));
        return;
      }

      setState({
        isAuthenticated: true,
        isLoading: false,
        user: extractUser(session),
        token: session.getIdToken().getJwtToken(),
      });
    });
  }, [extractUser]);

  const login = useCallback(async (email: string, password: string) => {
    return new Promise<void>((resolve, reject) => {
      const user = new CognitoUser({ Username: email, Pool: userPool });
      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      user.authenticateUser(authDetails, {
        onSuccess: (session) => {
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: extractUser(session),
            token: session.getIdToken().getJwtToken(),
          });
          resolve();
        },
        onFailure: (err) => reject(err),
        newPasswordRequired: () => {
          setCognitoUser(user);
          setNeedsNewPassword(true);
          resolve();
        },
      });
    });
  }, [extractUser]);

  const completeNewPassword = useCallback(
    async (newPassword: string) => {
      if (!cognitoUser) throw new Error('No pending password challenge');

      return new Promise<void>((resolve, reject) => {
        cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
          onSuccess: (session) => {
            setNeedsNewPassword(false);
            setCognitoUser(null);
            setState({
              isAuthenticated: true,
              isLoading: false,
              user: extractUser(session),
              token: session.getIdToken().getJwtToken(),
            });
            resolve();
          },
          onFailure: (err) => reject(err),
        });
      });
    },
    [cognitoUser, extractUser],
  );

  const logout = useCallback(() => {
    const currentUser = userPool.getCurrentUser();
    currentUser?.signOut();
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, completeNewPassword, needsNewPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
