import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { fetchMyNotifications, markNotificationReadApi } from '../lib/api';
import { ArrowLeft, Bell, Check } from 'lucide-react';

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMyNotifications(1, 50);
      setItems(data?.items ?? data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const mark = async (id: string) => {
    try {
      await markNotificationReadApi(id);
      setItems((prev) => prev.map((n) => (n.maThongBao === id ? { ...n, daDoc: true } : n)));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
          <ArrowLeft size={16} /> Về tổng quan
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Bell className="text-blue-600" size={22} />
        <h1 className="text-xl font-semibold text-gray-900">Trung tâm thông báo</h1>
      </div>
      <p className="text-sm text-gray-500">
        Thông báo từ nhà trường và hệ thống (nhắc lịch, cảnh báo). Đánh dấu đã đọc để theo dõi.
      </p>

      {loading ? (
        <div className="text-gray-500 text-sm py-12 text-center">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="text-gray-400 text-sm py-12 text-center border border-dashed rounded-xl">Chưa có thông báo.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.maThongBao}
              className={`rounded-xl border p-4 flex gap-3 ${n.daDoc ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200 shadow-sm'}`}
            >
              <div
                className={`w-2 rounded-full flex-shrink-0 mt-1.5 ${
                  n.loai === 'alert' ? 'bg-red-500' : n.loai === 'warning' ? 'bg-amber-500' : n.loai === 'reminder' ? 'bg-indigo-500' : 'bg-blue-500'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800">{n.tieuDe}</div>
                <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{n.noiDung}</div>
                <div className="text-xs text-gray-400 mt-2">
                  {n.thoiDiem ? new Date(n.thoiDiem).toLocaleString('vi-VN') : ''} · {n.loai}
                </div>
              </div>
              {!n.daDoc && (
                <button
                  type="button"
                  onClick={() => mark(n.maThongBao)}
                  className="flex-shrink-0 h-9 px-3 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-1"
                >
                  <Check size={14} /> Đã đọc
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
