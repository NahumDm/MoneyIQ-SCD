import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { authApi } from '../api/authService';
import { TOKEN_KEY, USER_KEY } from '../utils/constants';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(false);

  const persistSession = useCallback((newToken, newUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { data } = await authApi.login({ email, password });
      persistSession(data.token, data.user);
      return data;
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const register = useCallback(async (fields) => {
    setLoading(true);
    try {
      const { data } = await authApi.register(fields);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (email, code) => {
    setLoading(true);
    try {
      const { data } = await authApi.verify({ email, code });
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      verifyEmail,
      logout,
    }),
    [token, user, loading, login, register, verifyEmail, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
