import React from 'react';
import { Link } from 'react-router';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
        <h1 className="text-4xl font-bold text-gray-300 mb-2">404</h1>
        <p className="text-gray-500 mb-6">Trang không tồn tại</p>
        <Link to="/dashboard">
          <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors mx-auto">
            <Home size={16} />
            Về trang chủ
          </button>
        </Link>
      </div>
    </div>
  );
}
