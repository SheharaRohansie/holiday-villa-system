import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthContextType, AuthResponse } from '../types';
import SessionTimeoutManager from '../components/SessionTimeoutManager';
import { refreshTokenApi } from '../api/authApi';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = (data: AuthResponse) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const forceLogout = (redirectToLogin: boolean) => {
    logout();
    if (redirectToLogin) {
      navigate('/login', { replace: true });
    }
  };

  // Keep React auth state in sync with global 401 handlers and multi-tab storage changes.
  useEffect(() => {
    const onForceLogout = () => {
      forceLogout(true);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token' && !e.newValue) {
        forceLogout(false);
      }
    };

    window.addEventListener('auth:force-logout', onForceLogout as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('auth:force-logout', onForceLogout as EventListener);
      window.removeEventListener('storage', onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onContinueOptional = useMemo(() => {
    return async () => {
      try {
        const refreshed = await refreshTokenApi();
        if (refreshed?.token) {
          localStorage.setItem('token', refreshed.token);
        }
      } catch {
        // optional endpoint; ignore failures
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      <SessionTimeoutManager
        enabled={!!user}
        onTimeout={() => forceLogout(true)}
        onContinueOptional={onContinueOptional}
      />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
