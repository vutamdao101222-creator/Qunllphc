import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ApiUser, clearTokens, login as loginApi, me } from '../lib/api';

export type UserRole = 'admin' | 'teacher' | 'parent';

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  username?: string;
  parentClassIds?: string[];
  parentStudentIds?: string[];
}

interface AuthContextType {
  user: AppUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isRole: (role: UserRole) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapApiUser(apiUser: ApiUser): AppUser {
  return {
    id: apiUser.maTaiKhoan,
    name: apiUser.hoTen,
    role: apiUser.role,
    email: apiUser.email,
    username: apiUser.tenDangNhap,
    // demo defaults for parent page if backend has no relation table yet
    parentClassIds: apiUser.role === 'parent' ? ['c1', 'c4'] : undefined,
    parentStudentIds: apiUser.role === 'parent' ? ['st1', 'st2'] : undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    const stored = localStorage.getItem('edu_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        if (!localStorage.getItem('edu_access_token')) {
          setLoading(false);
          return;
        }
        const data = await me();
        const nextUser = mapApiUser(data);
        setUser(nextUser);
        localStorage.setItem('edu_user', JSON.stringify(nextUser));
      } catch {
        clearTokens();
        setUser(null);
        localStorage.removeItem('edu_user');
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const apiUser = await loginApi(username, password);
      const nextUser = mapApiUser(apiUser);
      setUser(nextUser);
      localStorage.setItem('edu_user', JSON.stringify(nextUser));
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    localStorage.removeItem('edu_user');
  };

  const isRole = (role: UserRole): boolean => user?.role === role;

  return (
    <AuthContext.Provider value={{ user, login, logout, isRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
