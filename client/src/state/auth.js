import React, { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const LS_TOKEN = 'gc_token';
const LS_USER = 'gc_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(LS_TOKEN) || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(LS_USER);
    return raw ? JSON.parse(raw) : null;
  });

  const value = useMemo(() => {
    return {
      token,
      user,
      setSession: (nextToken, nextUser) => {
        setToken(nextToken);
        setUser(nextUser);
        localStorage.setItem(LS_TOKEN, nextToken);
        localStorage.setItem(LS_USER, JSON.stringify(nextUser));
      },
      clearSession: () => {
        setToken('');
        setUser(null);
        localStorage.removeItem(LS_TOKEN);
        localStorage.removeItem(LS_USER);
      }
    };
  }, [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
