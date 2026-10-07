import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role?: 'admin' | 'member') => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'catchup_auth_token';
const USER_KEY = 'catchup_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY) || null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Verify session on mount with /api/auth/me
  useEffect(() => {
    async function verifySession() {
      const activeToken = localStorage.getItem(TOKEN_KEY);
      if (!activeToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          }
        } else {
          // Token expired or invalid
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.warn('Auth verification check offline/failed:', err);
      } finally {
        setIsLoading(false);
      }
    }

    verifySession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed.' };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      localStorage.setItem('catchup_user_name', data.user.name);
      setToken(data.token);
      setUser(data.user);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login.' };
    }
  };

  const register = async (name: string, email: string, password: string, role: 'admin' | 'member' = 'member') => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed.' };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      localStorage.setItem('catchup_user_name', data.user.name);
      setToken(data.token);
      setUser(data.user);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration.' };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isAdmin: user?.role === 'admin',
        isLoading,
        login,
        register,
        logout,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
