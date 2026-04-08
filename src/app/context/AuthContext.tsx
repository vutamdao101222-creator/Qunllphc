import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, USERS, UserRole } from '../data/mockData';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('edu_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (username: string, password: string): boolean => {
    const found = USERS.find(
      u => (u.username === username || u.email === username) && u.password === password
    );
    if (found) {
      setUser(found);
      localStorage.setItem('edu_user', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('edu_user');
  };

  const isRole = (role: UserRole): boolean => user?.role === role;

  return (
    <AuthContext.Provider value={{ user, login, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
