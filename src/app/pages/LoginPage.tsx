import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in
  React.useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const success = login(username, password);
    setLoading(false);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Tên đăng nhập hoặc mật khẩu không đúng.');
    }
  };

  const fillDemo = (role: 'admin' | 'teacher' | 'parent') => {
    if (role === 'admin') { setUsername('admin'); setPassword('admin123'); }
    if (role === 'teacher') { setUsername('gv.nguyenan'); setPassword('teacher123'); }
    if (role === 'parent') { setUsername('phuhuynha'); setPassword('parent123'); }
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-white text-2xl font-semibold">EduMonitor</h1>
          <p className="text-slate-400 text-sm mt-1">Hệ thống quản lý & giám sát lớp học</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white text-lg font-semibold mb-6">Đăng nhập</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-1.5">Tên đăng nhập</label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="Nhập tên đăng nhập hoặc email"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Nhập mật khẩu"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 pr-10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-lg py-2.5 font-medium transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang đăng nhập...
                </>
              ) : 'Đăng nhập'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-slate-400 text-xs mb-3 text-center">Tài khoản demo:</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: 'admin' as const, label: 'Quản trị viên', color: 'from-purple-600/40 to-purple-700/40 border-purple-500/30' },
                { role: 'teacher' as const, label: 'Giáo viên', color: 'from-blue-600/40 to-blue-700/40 border-blue-500/30' },
                { role: 'parent' as const, label: 'Phụ huynh', color: 'from-green-600/40 to-green-700/40 border-green-500/30' },
              ].map(({ role, label, color }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => fillDemo(role)}
                  className={`bg-gradient-to-b ${color} border rounded-lg py-2 px-2 text-white text-xs text-center hover:opacity-80 transition-opacity`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © 2026 EduMonitor · Hệ thống giám sát lớp học
        </p>
      </div>
    </div>
  );
}
