import React, { useState } from 'react';
import { Link } from 'react-router';
import { CLASSES, TEACHERS, ROOMS, getTeacher, getRoom, DAY_NAMES_FULL, ClassInfo } from '../data/mockData';
import { Plus, Pencil, Trash2, Search, BookOpen, X, Save } from 'lucide-react';

type FormData = {
  code: string; name: string; subject: string;
  teacherId: string; roomId: string; expectedStudents: string; grade: string;
};

const SUBJECTS = ['Toán học', 'Ngữ văn', 'Vật lý', 'Hóa học', 'Sinh học', 'Tiếng Anh', 'Lịch sử', 'Địa lý'];

export default function ClassManagementPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([...CLASSES]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    code: '', name: '', subject: '', teacherId: '', roomId: '', expectedStudents: '', grade: ''
  });

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.subject.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setForm({ code: '', name: '', subject: '', teacherId: '', roomId: '', expectedStudents: '', grade: '' });
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (cls: ClassInfo) => {
    setForm({
      code: cls.code, name: cls.name, subject: cls.subject,
      teacherId: cls.teacherId, roomId: cls.roomId,
      expectedStudents: cls.expectedStudents.toString(), grade: cls.grade,
    });
    setEditId(cls.id);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name || !form.code) return;
    if (editId) {
      setClasses(prev => prev.map(c =>
        c.id === editId
          ? { ...c, ...form, expectedStudents: parseInt(form.expectedStudents) || 30 }
          : c
      ));
    } else {
      const newClass: ClassInfo = {
        id: `c${Date.now()}`,
        code: form.code, name: form.name, subject: form.subject,
        teacherId: form.teacherId, roomId: form.roomId,
        schedules: [], expectedStudents: parseInt(form.expectedStudents) || 30, grade: form.grade,
      };
      setClasses(prev => [...prev, newClass]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Quản lý lớp học</h1>
          <p className="text-sm text-gray-500 mt-0.5">{classes.length} lớp học</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Thêm lớp học
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm lớp học..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Mã / Tên lớp</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Môn học</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Giáo viên</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Phòng học</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Sĩ số</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Lịch học</th>
                <th className="text-center text-xs text-gray-500 font-medium px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(cls => {
                const teacher = getTeacher(cls.teacherId);
                const room = getRoom(cls.roomId);
                return (
                  <tr key={cls.id} className="border-t border-gray-50 hover:bg-gray-50/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <BookOpen size={14} className="text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{cls.name}</div>
                          <div className="text-xs text-gray-400">{cls.code} · Khối {cls.grade}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{cls.subject}</td>
                    <td className="px-4 py-3">
                      {teacher ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                            {teacher.avatar.charAt(0)}
                          </div>
                          <span className="text-gray-700">{teacher.name}</span>
                        </div>
                      ) : <span className="text-gray-400">–</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{room?.name ?? '–'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{cls.expectedStudents}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {cls.schedules.map((s, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                            {DAY_NAMES_FULL[s.dayOfWeek].replace('Thứ ', 'T')} {s.startTime}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link to={`/classes/${cls.id}`}>
                          <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                            Chi tiết
                          </button>
                        </Link>
                        <button
                          onClick={() => openEdit(cls)}
                          className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(cls.id)}
                          className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                    Không tìm thấy lớp học nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{editId ? 'Chỉnh sửa lớp học' : 'Thêm lớp học mới'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Mã lớp *</label>
                  <input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="VD: T10A"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Khối</label>
                  <select
                    value={form.grade}
                    onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">-- Chọn --</option>
                    {['10', '11', '12'].map(g => <option key={g} value={g}>Khối {g}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Tên lớp *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="VD: Toán 10A"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Môn học</label>
                <select
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">-- Chọn môn --</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Giáo viên</label>
                  <select
                    value={form.teacherId}
                    onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">-- Chọn GV --</option>
                    {TEACHERS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Phòng học</label>
                  <select
                    value={form.roomId}
                    onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">-- Chọn phòng --</option>
                    {ROOMS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Sĩ số dự kiến</label>
                <input
                  type="number"
                  value={form.expectedStudents}
                  onChange={e => setForm(f => ({ ...f, expectedStudents: e.target.value }))}
                  placeholder="30"
                  min="1" max="60"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                Hủy
              </button>
              <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                <Save size={14} />
                {editId ? 'Lưu thay đổi' : 'Thêm lớp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Xóa lớp học?</h3>
              <p className="text-sm text-gray-500 mb-5">
                Lớp <strong>{classes.find(c => c.id === deleteConfirm)?.name}</strong> sẽ bị xóa vĩnh viễn.
              </p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                  Hủy
                </button>
                <button onClick={() => handleDelete(deleteConfirm)} className="px-5 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
