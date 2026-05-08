import React, { useMemo, useState } from 'react';
import { CLASSES, DAY_NAMES_FULL, STUDENTS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useSchoolData } from '../context/SchoolDataContext';
import { createParentAccount, listParentAccounts } from '../lib/api';
import { toast } from 'sonner';

type Relation = 'father' | 'mother' | 'guardian';

const RELATION_LABEL: Record<Relation, string> = {
  father: 'Cha',
  mother: 'Mẹ',
  guardian: 'Người giám hộ',
};

export default function AdminManagementPage() {
  const { user } = useAuth();
  const {
    parentStudentLinks,
    scheduleAdjustments,
    linkStudentToParent,
    unlinkStudentFromParent,
    updateClassSchedules,
    resetClassSchedules,
    getEffectiveSchedules,
  } = useSchoolData();

  const [remoteParents, setRemoteParents] = useState<Array<{ maTaiKhoan: string; hoTen: string; tenDangNhap: string }>>([]);
  const [parentSearch, setParentSearch] = useState('');

  const [accountForm, setAccountForm] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
  });
  const [linkForm, setLinkForm] = useState({
    parentId: '',
    studentId: '',
    relationship: 'guardian' as Relation,
  });
  const [selectedClassId, setSelectedClassId] = useState(CLASSES[0]?.id ?? '');
  const [scheduleReason, setScheduleReason] = useState('');

  const selectedClass = CLASSES.find((cls) => cls.id === selectedClassId) ?? CLASSES[0];
  const effectiveSchedule = useMemo(
    () => (selectedClass ? getEffectiveSchedules(selectedClass.id, selectedClass.schedules) : []),
    [getEffectiveSchedules, selectedClass],
  );
  const [editableSchedule, setEditableSchedule] = useState(effectiveSchedule);

  React.useEffect(() => {
    setEditableSchedule(effectiveSchedule);
  }, [effectiveSchedule]);

  React.useEffect(() => {
    let mounted = true;
    const loadParents = async () => {
      try {
        const res = await listParentAccounts({ q: parentSearch || undefined, pageSize: 200 });
        const items = Array.isArray(res?.items) ? res.items : [];
        if (mounted) {
          setRemoteParents(items);
        }
      } catch {
        // ignore
      }
    };
    loadParents();
    return () => {
      mounted = false;
    };
  }, [parentSearch]);

  const linkRows = parentStudentLinks
    .map((link) => {
      const parent = remoteParents.find((item) => item.maTaiKhoan === link.parentId) || null;
      const student = STUDENTS.find((item) => item.id === link.studentId);
      const cls = student ? CLASSES.find((item) => item.id === student.classId) : null;
      return { link, parent, student, cls };
    })
    .filter((item) => item.parent && item.student);

  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [filterStudentId, setFilterStudentId] = useState<string>('all');
  const [quickQuery, setQuickQuery] = useState('');
  const [sortKey, setSortKey] = useState<'parent' | 'student' | 'class'>('parent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filteredLinkRows = useMemo(() => {
    const q = quickQuery.trim().toLowerCase();
    const base = linkRows.filter((r) => {
      if (filterClassId !== 'all' && r.cls?.id !== filterClassId) return false;
      if (filterStudentId !== 'all' && r.student?.id !== filterStudentId) return false;
      if (!q) return true;
      const parentText = `${r.parent?.hoTen ?? ''} ${r.parent?.tenDangNhap ?? ''}`.toLowerCase();
      const studentText = `${r.student?.name ?? ''}`.toLowerCase();
      const classText = `${r.cls?.name ?? ''}`.toLowerCase();
      return parentText.includes(q) || studentText.includes(q) || classText.includes(q);
    });

    const dir = sortDir === 'desc' ? -1 : 1;
    const getVal = (r: any) => {
      if (sortKey === 'student') return (r.student?.name ?? '').toLowerCase();
      if (sortKey === 'class') return (r.cls?.name ?? '').toLowerCase();
      return (r.parent?.hoTen ?? '').toLowerCase();
    };
    return base.slice().sort((a, b) => getVal(a).localeCompare(getVal(b)) * dir);
  }, [filterClassId, filterStudentId, linkRows, quickQuery, sortDir, sortKey]);

  const handleCreateAccount = async () => {
    if (!accountForm.name.trim() || !accountForm.username.trim() || !accountForm.password.trim()) {
      toast.error('Vui lòng nhập đủ thông tin tài khoản phụ huynh');
      return;
    }
    try {
      await createParentAccount({
        name: accountForm.name,
        username: accountForm.username,
        password: accountForm.password,
        email: accountForm.email || undefined,
      });
      setAccountForm({ name: '', username: '', password: '', email: '' });
      toast.success('Đã tạo tài khoản phụ huynh');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể tạo tài khoản phụ huynh');
    }
  };

  const handleCreateLink = async () => {
    if (!linkForm.parentId || !linkForm.studentId) {
      toast.error('Vui lòng chọn phụ huynh và học sinh');
      return;
    }
    await linkStudentToParent(linkForm);
    toast.success('Đã liên kết học sinh với phụ huynh');
  };

  const handleSaveSchedule = async () => {
    if (!selectedClass) return;
    if (!scheduleReason.trim()) {
      toast.error('Vui lòng nhập lý do điều chỉnh');
      return;
    }
    await updateClassSchedules({
      classId: selectedClass.id,
      schedules: editableSchedule,
      reason: scheduleReason,
      updatedBy: user?.name || 'Admin',
    });
    setScheduleReason('');
    toast.success('Đã lưu điều chỉnh lịch học');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-gray-900">Quản trị phụ huynh & lịch học</h1>
        <p className="text-sm text-gray-500 mt-1">Liên kết học sinh-phụ huynh, tạo tài khoản phụ huynh và điều chỉnh lịch học chi tiết.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-800">Tạo tài khoản phụ huynh</h2>
          <input
            value={accountForm.name}
            onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Họ tên phụ huynh"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={accountForm.username}
            onChange={(e) => setAccountForm((prev) => ({ ...prev, username: e.target.value }))}
            placeholder="Tên đăng nhập"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={accountForm.password}
            onChange={(e) => setAccountForm((prev) => ({ ...prev, password: e.target.value }))}
            placeholder="Mật khẩu"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={accountForm.email}
            onChange={(e) => setAccountForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Email (tuỳ chọn)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={handleCreateAccount} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
            Tạo tài khoản
          </button>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-800">Liên kết học sinh với phụ huynh</h2>
          <input
            value={parentSearch}
            onChange={(e) => setParentSearch(e.target.value)}
            placeholder="Tìm nhanh phụ huynh (tên / username)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={linkForm.parentId}
            onChange={(e) => setLinkForm((prev) => ({ ...prev, parentId: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Chọn phụ huynh</option>
            {remoteParents.map((parent) => (
              <option key={parent.maTaiKhoan} value={parent.maTaiKhoan}>
                {parent.hoTen} ({parent.tenDangNhap})
              </option>
            ))}
          </select>
          <select
            value={linkForm.studentId}
            onChange={(e) => setLinkForm((prev) => ({ ...prev, studentId: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Chọn học sinh</option>
            {STUDENTS.map((student) => {
              const cls = CLASSES.find((item) => item.id === student.classId);
              return (
                <option key={student.id} value={student.id}>
                  {student.name} - {cls?.name}
                </option>
              );
            })}
          </select>
          <select
            value={linkForm.relationship}
            onChange={(e) => setLinkForm((prev) => ({ ...prev, relationship: e.target.value as Relation }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            {Object.entries(RELATION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button onClick={handleCreateLink} className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700">
            Liên kết
          </button>
        </section>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-gray-800">Điều chỉnh lịch học chi tiết</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            {CLASSES.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
          <input
            value={scheduleReason}
            onChange={(e) => setScheduleReason(e.target.value)}
            placeholder="Lý do điều chỉnh"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm md:col-span-2"
          />
        </div>
        <div className="space-y-2">
          {editableSchedule.map((slot, index) => (
            <div key={`${slot.dayOfWeek}-${index}`} className="grid grid-cols-3 md:grid-cols-4 gap-2 items-center">
              <select
                value={slot.dayOfWeek}
                onChange={(e) =>
                  setEditableSchedule((prev) => prev.map((item, i) => (i === index ? { ...item, dayOfWeek: Number(e.target.value) } : item)))
                }
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              >
                {[2, 3, 4, 5, 6, 7].map((dow) => (
                  <option key={dow} value={dow}>
                    {DAY_NAMES_FULL[dow]}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={slot.startTime}
                onChange={(e) =>
                  setEditableSchedule((prev) => prev.map((item, i) => (i === index ? { ...item, startTime: e.target.value } : item)))
                }
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
              <input
                type="time"
                value={slot.endTime}
                onChange={(e) =>
                  setEditableSchedule((prev) => prev.map((item, i) => (i === index ? { ...item, endTime: e.target.value } : item)))
                }
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
              <button
                onClick={() => setEditableSchedule((prev) => prev.filter((_, i) => i !== index))}
                className="text-red-600 text-sm border border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-50"
              >
                Xoá
              </button>
            </div>
          ))}
          <button
            onClick={() => setEditableSchedule((prev) => [...prev, { dayOfWeek: 2, startTime: '07:00', endTime: '09:00' }])}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
          >
            + Thêm ca học
          </button>
        </div>
        <button onClick={handleSaveSchedule} className="bg-purple-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-purple-700">
          Lưu điều chỉnh lịch
        </button>
        {selectedClass && scheduleAdjustments.some((a) => a.classId === selectedClass.id) && (
          <button
            onClick={async () => {
              await resetClassSchedules(selectedClass.id);
              toast.success('Đã reset lịch về mặc định của lớp');
            }}
            className="ml-2 bg-white text-purple-700 text-sm px-4 py-2 rounded-lg border border-purple-200 hover:bg-purple-50"
          >
            Reset về mặc định
          </button>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Liên kết hiện có</h2>
        <div className="grid md:grid-cols-4 gap-2 mb-3">
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">Tất cả lớp</option>
            {CLASSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={filterStudentId}
            onChange={(e) => setFilterStudentId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">Tất cả học sinh</option>
            {STUDENTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            value={quickQuery}
            onChange={(e) => setQuickQuery(e.target.value)}
            placeholder="Tìm nhanh theo phụ huynh / học sinh / lớp..."
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm md:col-span-2"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as any)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="parent">Sort theo phụ huynh</option>
            <option value="student">Sort theo học sinh</option>
            <option value="class">Sort theo lớp</option>
          </select>
          <select
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as any)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="asc">Tăng dần</option>
            <option value="desc">Giảm dần</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 text-gray-500">Phụ huynh</th>
                <th className="text-left px-3 py-2 text-gray-500">Học sinh</th>
                <th className="text-left px-3 py-2 text-gray-500">Lớp</th>
                <th className="text-left px-3 py-2 text-gray-500">Quan hệ</th>
                <th className="text-right px-3 py-2 text-gray-500">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredLinkRows.map(({ link, parent, student, cls }) => (
                <tr key={link.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{parent?.hoTen}</td>
                  <td className="px-3 py-2">{student?.name}</td>
                  <td className="px-3 py-2">{cls?.name}</td>
                  <td className="px-3 py-2">{RELATION_LABEL[link.relationship]}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={async () => {
                        await unlinkStudentFromParent(link.id);
                        toast.success('Đã xóa liên kết học sinh - phụ huynh');
                      }}
                      className="text-red-600 text-sm border border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-50"
                    >
                      Xóa liên kết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Lịch đã điều chỉnh gần đây</h2>
        <div className="space-y-2">
          {scheduleAdjustments.length === 0 ? (
            <p className="text-sm text-gray-500">Chưa có điều chỉnh lịch nào.</p>
          ) : (
            scheduleAdjustments.slice(0, 6).map((item) => {
              const cls = CLASSES.find((c) => c.id === item.classId);
              return (
                <div key={item.id} className="border border-gray-200 rounded-lg px-3 py-2">
                  <p className="text-sm font-medium text-gray-800">{cls?.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.reason}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Cập nhật bởi {item.updatedBy}</p>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
