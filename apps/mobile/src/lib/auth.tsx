// Holds the signed-in user. The token lives in the device's secure storage
// (Keychain on iOS) and is restored on launch, then checked with /auth/me.
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, ApiError, setAuthToken, setUnauthorizedHandler } from './api';
import type { User } from './types';

const TOKEN_KEY = 'magam-hankan.session-token';

type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; notice?: string }
  | { status: 'signedIn'; user: User };

interface AuthContextValue {
  state: AuthState;
  logIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const clear = useCallback(async (notice?: string) => {
    setAuthToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setState({ status: 'signedOut', notice });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => clear('로그인이 만료되었어요. 다시 로그인해 주세요'));
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
      if (!token) return setState({ status: 'signedOut' });
      setAuthToken(token);
      try {
        const { user } = await api.me();
        setState({ status: 'signedIn', user });
      } catch (err) {
        // Keep the token if the server is just unreachable; drop it only when rejected.
        if (err instanceof ApiError && err.status === 401) return;
        setState({ status: 'signedOut', notice: err instanceof Error ? err.message : undefined });
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  const accept = useCallback(async (token: string, user: User) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setAuthToken(token);
    setState({ status: 'signedIn', user });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      logIn: async (email, password) => {
        const res = await api.logIn(email, password);
        await accept(res.token, res.user);
      },
      signUp: async (email, password, displayName) => {
        const res = await api.signUp(email, password, displayName);
        await accept(res.token, res.user);
      },
      logOut: async () => {
        await api.logOut().catch(() => {});
        await clear();
      },
    }),
    [state, accept, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
