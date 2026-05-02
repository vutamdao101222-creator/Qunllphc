import React from 'react';
import { Link } from 'react-router';
import { ShieldAlert, Home, LogIn } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={26} />
        </div>
        <h1 className="text-gray-900 text-xl font-semibold">Không có quyền truy cập</h1>
        <p className="text-sm text-gray-500 mt-2">
          Tài khoản hiện tại không được phép mở trang này. Vui lòng quay về trang chính hoặc đăng nhập tài khoản khác.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link to="/dashboard">
            <button className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
              <Home size={14} />
              Về trang chủ
            </button>
          </Link>
          <Link to="/login">
            <button className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
              <LogIn size={14} />
              Đăng nhập lại
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
