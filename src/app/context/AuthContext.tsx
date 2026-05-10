import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ApiUser, clearTokens, login as loginApi, me } from '../lib/api';

export type UserRole = 'admin' | 'teacher' | 'parent';

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  username?: string;
  chiDoc?: boolean;
  maGiaoVien?: string | null;
  parentClassIds?: string[];
  parentStudentIds?: string[];
}

export type LoginResult = { ok: true } | { ok: false; message: string };

interface AuthContextType {
  user: AppUser | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  isRole: (role: UserRole) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Học sinh / lớp mẫu để trang Phụ huynh không trống khi admin/teacher xem hoặc chưa có liên kết DB. */
const DEMO_PARENT_STUDENT_IDS = ['st1', 'st2', 'st3'];
const DEMO_PARENT_CLASS_IDS = ['c1', 'c2', 'c4'];

function mapApiUser(apiUser: ApiUser): AppUser {
  const role = apiUser.role;
  return {
    id: apiUser.maTaiKhoan,
    name: apiUser.hoTen?.trim() || apiUser.tenDangNhap || '',
    role,
    email: apiUser.email,
    username: apiUser.tenDangNhap,
    chiDoc: Boolean(apiUser.chiDoc),
    maGiaoVien: apiUser.maGiaoVien ?? null,
    parentClassIds:
      role === 'parent' ? ['c1', 'c4'] : role === 'admin' ? DEMO_PARENT_CLASS_IDS : undefined,
    parentStudentIds:
      role === 'parent' ? ['st1', 'st2'] : role === 'admin' ? DEMO_PARENT_STUDENT_IDS : undefined,
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

  const login = async (username: string, password: string): Promise<LoginResult> => {
    const u = username.trim();
    if (!u) {
      return { ok: false, message: 'Vui lòng nhập tên đăng nhập.' };
    }
    try {
      const apiUser = await loginApi(u, password);
      const nextUser = mapApiUser(apiUser);
      setUser(nextUser);
      localStorage.setItem('edu_user', JSON.stringify(nextUser));
      return { ok: true };
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      if (
        raw === 'Failed to fetch' ||
        raw.includes('NetworkError') ||
        raw.toLowerCase().includes('network')
      ) {
        return {
          ok: false,
          message:
            'Không kết nối được máy chủ API. Hãy chạy backend (ví dụ npm run api) và kiểm tra cổng 4000.',
        };
      }
      return { ok: false, message: raw || 'Đăng nhập thất bại.' };
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
