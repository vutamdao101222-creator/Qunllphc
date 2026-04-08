import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, MonitorPlay, BookOpen, BarChart3,
  Settings, Users, CalendarDays, Bell, LogOut, Menu, X,
  ChevronRight, GraduationCap, Home
} from 'lucide-react';
import { NOTIFICATIONS } from '../data/mockData';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Tổng quan', roles: ['admin', 'teacher'] },
  { to: '/monitor', icon: <MonitorPlay size={18} />, label: 'Theo dõi thực tế', roles: ['admin', 'teacher'] },
  { to: '/schedule', icon: <CalendarDays size={18} />, label: 'Lịch học', roles: ['admin', 'teacher', 'parent'] },
  { to: '/reports', icon: <BarChart3 size={18} />, label: 'Báo cáo & Thống kê', roles: ['admin', 'teacher'] },
  { to: '/classes', icon: <BookOpen size={18} />, label: 'Quản lý lớp học', roles: ['admin'] },
  { to: '/teachers', icon: <Users size={18} />, label: 'Quản lý giáo viên', roles: ['admin'] },
  { to: '/parent', icon: <Home size={18} />, label: 'Thông tin phụ huynh', roles: ['parent'] },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  const filteredNav = NAV_ITEMS.filter(item =>
    user && item.roles.includes(user.role)
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel: Record<string, string> = {
    admin: 'Quản trị viên',
    teacher: 'Giáo viên',
    parent: 'Phụ huynh',
  };

  const roleColor: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    teacher: 'bg-blue-100 text-blue-700',
    parent: 'bg-green-100 text-green-700',
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
          <GraduationCap size={20} className="text-white" />
        </div>
        <div>
          <div className="text-white text-sm font-semibold leading-tight">EduMonitor</div>
          <div className="text-slate-400 text-xs">Hệ thống quản lý</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-700/50">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.name.split(' ').pop()?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{user?.name}</div>
            <div className={`text-xs px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${roleColor[user?.role || 'admin']}`}>
              {roleLabel[user?.role || 'admin']}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-400 transition-colors"
            title="Đăng xuất"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-slate-800 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-slate-800 flex flex-col z-10">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="hidden sm:flex items-center gap-1 text-sm text-gray-500">
              <span className="text-blue-600 font-medium">EduMonitor</span>
              <ChevronRight size={14} />
              <span>Quản lý lớp học</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotif(!showNotif)}
                className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <Bell size={18} />
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center" style={{ fontSize: 10 }}>
                  {NOTIFICATIONS.filter(n => n.type === 'alert' || n.type === 'warning').length}
                </span>
              </button>

              {showNotif && (
                <div className="absolute right-0 top-11 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                  <div className="p-4 border-b border-gray-100">
                    <div className="font-semibold text-gray-800">Thông báo</div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {NOTIFICATIONS.slice(0, 5).map(n => (
                      <div key={n.id} className="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            n.type === 'alert' ? 'bg-red-500' :
                            n.type === 'warning' ? 'bg-amber-500' :
                            n.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                          }`} />
                          <div>
                            <div className="text-sm font-medium text-gray-700 leading-tight">{n.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{n.date} · {n.time}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 text-center">
                    <button className="text-sm text-blue-600 hover:underline" onClick={() => setShowNotif(false)}>
                      Xem tất cả
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User avatar */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                {user?.name.split(' ').pop()?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-gray-700 leading-tight">{user?.name}</div>
                <div className="text-xs text-gray-400">{roleLabel[user?.role || 'admin']}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
