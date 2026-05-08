import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Trash2, Pencil, RefreshCw } from 'lucide-react';
import { ApiTeacher, createTeacher, deleteTeacher, listTeachers, updateTeacher } from '../lib/api';

export default function TeacherManagementPage() {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'maGiaoVien' | 'hoTen' | 'monHoc' | 'email'>('maGiaoVien');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ApiTeacher[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApiTeacher | null>(null);
  const [form, setForm] = useState<ApiTeacher>({
    maGiaoVien: '',
    hoTen: '',
    monHoc: '',
    soDienThoai: '',
    email: '',
  });

  const totalLabel = useMemo(() => `${items.length} giáo viên`, [items.length]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listTeachers({ page: 1, pageSize: 200, q: q.trim() || undefined, sort, order });
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (e: any) {
      toast.error(e?.message || 'Không tải được danh sách giáo viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, order]);

  const openCreate = () => {
    setEditing(null);
    setForm({ maGiaoVien: '', hoTen: '', monHoc: '', soDienThoai: '', email: '' });
    setShowForm(true);
  };

  const openEdit = (t: ApiTeacher) => {
    setEditing(t);
    setForm({
      maGiaoVien: t.maGiaoVien,
      hoTen: t.hoTen,
      monHoc: t.monHoc,
      soDienThoai: t.soDienThoai ?? '',
      email: t.email ?? '',
    });
    setShowForm(true);
  };

  const submit = async () => {
    if (!form.hoTen.trim() || !form.monHoc.trim() || (!editing && !form.maGiaoVien.trim())) {
      toast.error('Vui lòng nhập đủ Mã GV, Họ tên, Môn học');
      return;
    }
    try {
      if (editing) {
        await updateTeacher(editing.maGiaoVien, {
          hoTen: form.hoTen.trim(),
          monHoc: form.monHoc.trim(),
          soDienThoai: (form.soDienThoai || '').trim() || null,
          email: (form.email || '').trim() || null,
        });
        toast.success('Đã cập nhật giáo viên');
      } else {
        await createTeacher({
          maGiaoVien: form.maGiaoVien.trim(),
          hoTen: form.hoTen.trim(),
          monHoc: form.monHoc.trim(),
          soDienThoai: (form.soDienThoai || '').trim() || null,
          email: (form.email || '').trim() || null,
        });
        toast.success('Đã tạo giáo viên');
      }
      setShowForm(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Không thể lưu giáo viên');
    }
  };

  const remove = async (t: ApiTeacher) => {
    const ok = window.confirm(`Xóa giáo viên ${t.hoTen} (${t.maGiaoVien})?`);
    if (!ok) return;
    try {
      await deleteTeacher(t.maGiaoVien);
      toast.success('Đã xóa giáo viên');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Không thể xóa giáo viên');
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-gray-900">Quản lý giáo viên</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
            title="Tải lại"
          >
            <RefreshCw size={16} />
            Tải lại
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Thêm giáo viên
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="grid md:grid-cols-5 gap-2">
          <div className="relative md:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo mã / họ tên / môn học / email..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="maGiaoVien">Sort: Mã GV</option>
            <option value="hoTen">Sort: Họ tên</option>
            <option value="monHoc">Sort: Môn học</option>
            <option value="email">Sort: Email</option>
          </select>
          <select value={order} onChange={(e) => setOrder(e.target.value as any)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="asc">Tăng dần</option>
            <option value="desc">Giảm dần</option>
          </select>
          <button
            onClick={load}
            className="text-sm px-3 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900"
            disabled={loading}
          >
            {loading ? 'Đang tải...' : 'Tìm'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 text-gray-500">Mã GV</th>
                <th className="text-left px-3 py-2 text-gray-500">Họ tên</th>
                <th className="text-left px-3 py-2 text-gray-500">Môn học</th>
                <th className="text-left px-3 py-2 text-gray-500">Điện thoại</th>
                <th className="text-left px-3 py-2 text-gray-500">Email</th>
                <th className="text-right px-3 py-2 text-gray-500">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                    Chưa có dữ liệu giáo viên.
                  </td>
                </tr>
              ) : (
                items.map((t) => (
                  <tr key={t.maGiaoVien} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-800">{t.maGiaoVien}</td>
                    <td className="px-3 py-2">{t.hoTen}</td>
                    <td className="px-3 py-2">{t.monHoc}</td>
                    <td className="px-3 py-2">{t.soDienThoai || '—'}</td>
                    <td className="px-3 py-2">{t.email || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => openEdit(t)}
                          className="inline-flex items-center gap-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                        >
                          <Pencil size={14} />
                          Sửa
                        </button>
                        <button
                          onClick={() => remove(t)}
                          className="inline-flex items-center gap-1 text-sm border border-red-200 text-red-700 rounded-lg px-2 py-1.5 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative w-[92vw] max-w-xl bg-white rounded-2xl border border-gray-200 shadow-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">{editing ? 'Cập nhật giáo viên' : 'Thêm giáo viên'}</h2>
                <p className="text-xs text-gray-500 mt-0.5">CRUD qua API + lưu DB</p>
              </div>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-3 mt-4">
              <input
                value={form.maGiaoVien}
                onChange={(e) => setForm((p) => ({ ...p, maGiaoVien: e.target.value }))}
                placeholder="Mã GV (VD: GV004)"
                disabled={Boolean(editing)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              />
              <input
                value={form.hoTen}
                onChange={(e) => setForm((p) => ({ ...p, hoTen: e.target.value }))}
                placeholder="Họ tên"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={form.monHoc}
                onChange={(e) => setForm((p) => ({ ...p, monHoc: e.target.value }))}
                placeholder="Môn học"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={String(form.soDienThoai ?? '')}
                onChange={(e) => setForm((p) => ({ ...p, soDienThoai: e.target.value }))}
                placeholder="Số điện thoại (tuỳ chọn)"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={String(form.email ?? '')}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="Email (tuỳ chọn)"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm md:col-span-2"
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setShowForm(false)}
                className="text-sm px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={submit}
                className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                disabled={loading}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
