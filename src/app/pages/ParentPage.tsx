import React, { useMemo, useState } from 'react';
import {
  fetchParentOverview,
  fetchParentSummary,
  fetchMyParentLinks,
  fetchParentParentTeacherExchange,
  postParentParentTeacherExchange,
  fetchParentStudentAttendanceRecords,
} from '../lib/api';
import {
  CLASSES, LIVE_DATA, NOTIFICATIONS, SESSION_REPORTS,
  getTeacher, getRoom, getConcentrationBg, getConcentrationLabel,
  getAlertLabel, getAlertStyle
} from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { SCHOOL_TODAY, useSchoolData } from '../context/SchoolDataContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import {
  BookOpen, CalendarDays, Bell, Activity, Clock,
  Users, TrendingUp, Info, CheckCircle, AlertTriangle, MessageSquare,
} from 'lucide-react';

import type { StudentProfile } from '../data/mockData';

function resolveExchangeTargetForStudent(
  studentId: string,
  links: Array<{ studentId: string; maLop: string | null }>,
  allStudents: StudentProfile[],
): { maLop: string; maHocSinh: string } | null {
  const withLop = links.find((l) => l.studentId === studentId && l.maLop);
  if (withLop?.maLop) return { maLop: withLop.maLop, maHocSinh: withLop.studentId };
  const st = allStudents.find((s) => s.id === studentId);
  const clsMeta = st && CLASSES.find((c) => c.id === st.classId);
  if (!clsMeta) return null;
  return { maLop: clsMeta.code, maHocSinh: studentId };
}

export default function ParentPage() {
  const { user } = useAuth();
  const {
    students,
    studentStatuses,
    feedbacks,
    submissions,
    assignments,
    parentAccounts,
    parentStudentLinks,
    scheduleAdjustments,
    markFeedbackRead,
    addFeedbackReply,
    filterFeedbacks,
    getEffectiveSchedules,
  } = useSchoolData();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'children' | 'schedule' | 'reports' | 'notifications' | 'comms'
  >('overview');
  const [feedbackPeriod, setFeedbackPeriod] = useState<'today' | 'week' | 'all'>('week');
  const [feedbackType, setFeedbackType] = useState<'all' | 'praise' | 'reminder' | 'discipline'>('all');
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [remoteParentData, setRemoteParentData] = useState<any | null>(null);
  const [periodReport, setPeriodReport] = useState<any | null>(null);
  const [apiLinks, setApiLinks] = useState<
    Array<{ id: string; studentId: string; maLop: string | null; relationship?: string }>
  >([]);
  const [apiExchanges, setApiExchanges] = useState<
    Array<{
      maTraoDoi: number;
      maLop: string;
      maHocSinh: string | null;
      vaiTroGui: string;
      tieuDe: string;
      noiDung: string;
      thoiDiem: string;
      hoTenNguoiGui?: string;
    }>
  >([]);
  const [apiAttDetail, setApiAttDetail] = useState<
    Array<{ ma: number; maLop: string; maHocSinh: string; thoiDiem: string; trangThai: string; ghiChu?: string | null }>
  >([]);
  const [commsSel, setCommsSel] = useState<{ maLop: string; maHocSinh: string } | null>(null);
  const [commsCompose, setCommsCompose] = useState({ tieuDe: '', noiDung: '', thoiDiem: '' });

  function toDatetimeLocalValue(d = new Date()) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  React.useEffect(() => {
    if (user?.role !== 'parent' && user?.role !== 'admin') return;
    let cancelled = false;
    (async () => {
      try {
        const linksRes = await fetchMyParentLinks();
        if (!cancelled) setApiLinks(linksRes.items ?? []);
      } catch {
        if (!cancelled) setApiLinks([]);
      }
      try {
        const att = await fetchParentStudentAttendanceRecords();
        if (!cancelled) setApiAttDetail(att);
      } catch {
        if (!cancelled) setApiAttDetail([]);
      }
      try {
        const ex = await fetchParentParentTeacherExchange();
        if (!cancelled) setApiExchanges(ex);
      } catch {
        if (!cancelled) setApiExchanges([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  React.useEffect(() => {
    if (apiLinks.length === 0) return;
    setCommsSel((prev) => {
      if (prev) return prev;
      const first = apiLinks.find((l) => l.maLop && l.studentId);
      if (!first?.maLop) return prev;
      return { maLop: first.maLop, maHocSinh: first.studentId };
    });
  }, [apiLinks]);

  React.useEffect(() => {
    if (activeTab !== 'comms' || (user?.role !== 'parent' && user?.role !== 'admin')) return;
    setCommsCompose((c) => ({ ...c, thoiDiem: toDatetimeLocalValue() }));
  }, [activeTab, user?.role]);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchParentOverview();
        if (mounted) setRemoteParentData(data);
      } catch {
        // fallback to local mock
      }
    };
    load();
  }, []);

  React.useEffect(() => {
    let mounted = true;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    fetchParentSummary(from.toISOString(), to.toISOString())
      .then((r) => {
        if (mounted) setPeriodReport(r);
      })
      .catch(() => {
        if (mounted) setPeriodReport(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const todayLabel = React.useMemo(
    () =>
      new Date().toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    []
  );

  const linkedParent = parentAccounts.find(
    (item) => item.id === user?.id || (user?.username && item.username === user.username),
  );
  const fromApiLinks = user?.id
    ? parentStudentLinks.filter((link) => link.parentId === user.id).map((link) => link.studentId)
    : [];
  const fromMockStore = linkedParent
    ? parentStudentLinks.filter((link) => link.parentId === linkedParent.id).map((link) => link.studentId)
    : [];
  let linkedStudentIds = [...new Set([...fromApiLinks, ...fromMockStore])];

  if (linkedStudentIds.length === 0 && user?.parentStudentIds?.length) {
    linkedStudentIds = [...user.parentStudentIds];
  }
  if (
    linkedStudentIds.length === 0 &&
    (user?.role === 'admin' || user?.role === 'teacher')
  ) {
    linkedStudentIds = ['st1', 'st2', 'st3'];
  }

  const myStudents =
    linkedStudentIds.length > 0
      ? students.filter((student) => linkedStudentIds.includes(student.id))
      : students.filter((student) => student.parentUserId === user?.id);

  const displayName =
    user?.name?.trim() ||
    user?.username ||
    user?.email ||
    (user?.role === 'admin' ? 'Quản trị viên' : user?.role === 'teacher' ? 'Giáo viên' : 'Phụ huynh');
  const myStudentIds = myStudents.map((s) => s.id);
  const myClassIds = [...new Set(myStudents.map((student) => student.classId))];
  const myClasses = CLASSES.filter((c) => myClassIds.includes(c.id));

  const notifications = remoteParentData?.notifications?.length
    ? remoteParentData.notifications.map((n: any) => ({
      id: n.maThongBao,
      title: n.tieuDe,
      content: n.noiDung,
      type: n.loai,
      date: new Date(n.thoiDiem).toLocaleDateString('vi-VN'),
      time: new Date(n.thoiDiem).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }))
    : NOTIFICATIONS.filter(n => !n.classId || myClassIds.includes(n.classId));
  const myFeedbacks = useMemo(() => {
    const mine = feedbacks
      .filter(item => myStudentIds.includes(item.studentId))
      .sort((a, b) => b.date.localeCompare(a.date));
    return filterFeedbacks(mine, feedbackPeriod, feedbackType);
  }, [feedbackPeriod, feedbackType, feedbacks, filterFeedbacks, myStudentIds]);

  const unreadCount = notifications.filter(n => n.type === 'alert' || n.type === 'warning').length;

  const pendingHomeworkCount = myStudents.reduce((sum, student) => {
    const classAssignments = assignments.filter(a => a.classId === student.classId);
    const pending = classAssignments.filter(a =>
      submissions.some(s => s.assignmentId === a.id && s.studentId === student.id && s.status !== 'submitted')
    ).length;
    return sum + pending;
  }, 0);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-white">Xin chào, {displayName}!</h1>
            <p className="text-blue-100 text-sm mt-1">Theo dõi thông tin lớp học của con bạn</p>
          </div>
          <div className="text-right">
            <div className="text-blue-100 text-xs">{todayLabel}</div>
            <div className="mt-1 bg-white/20 rounded-lg px-3 py-1.5 text-xs font-medium">
              {myClasses.length} lớp theo dõi
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Lớp đang học', value: myClasses.filter(c => LIVE_DATA.find(l => l.classId === c.id && l.isActive)).length, icon: '📚' },
            { label: 'Học sinh hiện diện', value: myClasses.reduce((s, c) => s + (LIVE_DATA.find(l => l.classId === c.id && l.isActive)?.currentStudents ?? 0), 0), icon: '👥' },
            { label: 'Thông báo mới', value: unreadCount, icon: '🔔' },
            { label: 'Buổi học tuần này', value: myClasses.reduce((s, c) => s + getEffectiveSchedules(c.id, c.schedules).length, 0), icon: '📅' },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 rounded-xl p-3">
              <div className="text-lg">{item.icon}</div>
              <div className="text-xl font-bold mt-1">{item.value}</div>
              <div className="text-xs text-blue-200 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-white/10 border border-white/20 rounded-xl p-3">
          <p className="text-xs text-blue-100">Tổng quan 15 giây cho phụ huynh</p>
          <p className="text-sm text-white mt-1">
            Hôm nay có <strong>{myStudents.length}</strong> học sinh theo dõi, còn <strong>{pendingHomeworkCount}</strong> bài tập chưa nộp.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { key: 'overview', label: 'Tổng quan', icon: <Activity size={14} /> },
          { key: 'children', label: 'Học sinh của tôi', icon: <Users size={14} /> },
          ...(user?.role === 'parent' || user?.role === 'admin'
            ? ([
                {
                  key: 'comms',
                  label: 'Trao đổi GV & điểm danh',
                  icon: <MessageSquare size={14} />,
                },
              ] as const)
            : []),
          { key: 'schedule', label: 'Lịch học', icon: <CalendarDays size={14} /> },
          { key: 'reports', label: 'Báo cáo lớp', icon: <TrendingUp size={14} /> },
          { key: 'notifications', label: `Thông báo${unreadCount > 0 ? ` (${unreadCount})` : ''}`, icon: <Bell size={14} /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {periodReport && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" />
                Báo cáo tóm tắt 30 ngày (API)
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Phạm vi: {periodReport.scope === 'linked_classes' ? 'Theo lớp đã liên kết với tài khoản' : 'Toàn hệ thống (chưa gán lớp cho liên kết phụ huynh)'}.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-white/80 rounded-lg p-3 border border-white">
                  <div className="text-gray-500 text-xs">Tỷ lệ tham dự TB</div>
                  <div className="font-semibold text-gray-900">
                    {periodReport.attendance?.tyLeThamDuTrungBinh != null
                      ? `${Math.round(periodReport.attendance.tyLeThamDuTrungBinh)}%`
                      : '—'}
                  </div>
                </div>
                <div className="bg-white/80 rounded-lg p-3 border border-white">
                  <div className="text-gray-500 text-xs">Tập trung TB</div>
                  <div className="font-semibold text-gray-900">
                    {periodReport.concentration?.mucTapTrungTrungBinh != null
                      ? `${Math.round(periodReport.concentration.mucTapTrungTrungBinh)}%`
                      : '—'}
                  </div>
                </div>
                <div className="bg-white/80 rounded-lg p-3 border border-white">
                  <div className="text-gray-500 text-xs">Lần điểm danh</div>
                  <div className="font-semibold text-gray-900">{periodReport.attendance?.soLanDiemDanh ?? '—'}</div>
                </div>
              </div>
            </div>
          )}
          {myClasses.map(cls => {
            const teacher = getTeacher(cls.teacherId);
            const room = getRoom(cls.roomId);
            const live = LIVE_DATA.find(l => l.classId === cls.id);
            const isActive = live?.isActive;
            const sessions = SESSION_REPORTS.filter(s => s.classId === cls.id).slice(0, 5);
            const avgConc = sessions.length
              ? Math.round(sessions.reduce((s, r) => s + r.avgConcentration, 0) / sessions.length)
              : 0;

            return (
              <div key={cls.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Card header */}
                <div className={`flex items-center justify-between px-5 py-4 border-b border-gray-100 ${isActive ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-green-600' : 'bg-gray-300'}`}>
                      <BookOpen size={18} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{cls.name}</h3>
                      <p className="text-xs text-gray-500">{cls.subject} · {teacher?.name}</p>
                    </div>
                  </div>
                  {isActive ? (
                    <div className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs px-3 py-1.5 rounded-full border border-green-200 font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Đang học
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">Không có lớp</span>
                  )}
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                        <Users size={12} /> Sĩ số lớp
                      </div>
                      <div className="font-semibold text-gray-800">
                        {isActive ? `${live?.currentStudents}/${cls.expectedStudents}` : `–/${cls.expectedStudents}`}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                        <Activity size={12} /> Tập trung TB
                      </div>
                      <div className={`font-semibold ${avgConc >= 80 ? 'text-green-700' : avgConc >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                        {avgConc > 0 ? `${avgConc}%` : '–'}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                        <BookOpen size={12} /> Phòng học
                      </div>
                      <div className="font-semibold text-gray-800">{room?.name}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                        <Clock size={12} /> Buổi/tuần
                      </div>
                      <div className="font-semibold text-gray-800">{getEffectiveSchedules(cls.id, cls.schedules).length} buổi</div>
                    </div>
                  </div>

                  {/* Trạng thái buổi hiện tại */}
                  {isActive && live && (
                    <div className={`mt-3 rounded-lg p-3 border ${getAlertStyle(live.alertStatus).includes('green') || live.alertStatus === 'normal' ? 'bg-green-50 border-green-200' : live.alertStatus === 'low_concentration' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                      <p className="text-sm text-gray-700">
                        <strong>Buổi học hiện tại:</strong> Lớp {cls.name} đang có {live.currentStudents}/{cls.expectedStudents} học sinh,
                        mức độ tập trung <strong>{live.concentrationLevel}%</strong> ({getConcentrationLabel(live.concentrationLevel)}).
                        Trạng thái: <span className="font-medium">{getAlertLabel(live.alertStatus)}</span>.
                      </p>
                    </div>
                  )}

                  {avgConc > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-400 mb-1.5">Tập trung trung bình 5 buổi gần nhất</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${avgConc}%`, backgroundColor: avgConc >= 80 ? '#16a34a' : avgConc >= 60 ? '#d97706' : '#dc2626' }}
                          />
                        </div>
                        <span className={`text-sm font-bold w-10 text-right ${avgConc >= 80 ? 'text-green-700' : avgConc >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                          {avgConc}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CHILDREN TAB */}
      {activeTab === 'children' && (
        <div className="space-y-4">
          {myStudents.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-500">
              Chưa có dữ liệu học sinh liên kết với tài khoản phụ huynh này.
            </div>
          ) : (
            myStudents.map(student => {
              const cls = CLASSES.find(c => c.id === student.classId);
              const teacher = cls ? getTeacher(cls.teacherId) : undefined;
              const todayStatus = studentStatuses.find(s => s.studentId === student.id && s.date === SCHOOL_TODAY);
              const studentFeedbacks = myFeedbacks.filter(f => f.studentId === student.id);

              return (
                <div key={student.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-blue-50 border-b border-blue-100 px-5 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">{student.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {cls?.name} {teacher ? `· GVCN: ${teacher.name}` : ''}
                      </p>
                    </div>
                    <span className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-full">Hôm nay</span>
                  </div>

                  <div className="p-5 space-y-4">
                    {todayStatus ? (
                      <div className="grid sm:grid-cols-4 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">Điểm danh</div>
                          <div className={`text-sm font-semibold ${
                            todayStatus.attendance === 'present' ? 'text-green-700' :
                            todayStatus.attendance === 'late' ? 'text-amber-700' : 'text-red-700'
                          }`}>
                            {todayStatus.attendance === 'present' ? 'Có mặt' : todayStatus.attendance === 'late' ? 'Đi muộn' : 'Vắng'}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">Giờ vào lớp</div>
                          <div className="text-sm font-semibold text-gray-800">{todayStatus.checkInTime ?? 'Chưa cập nhật'}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">Tập trung</div>
                          <div className="text-sm font-semibold text-gray-800">{todayStatus.concentrationScore}%</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">Tham gia</div>
                          <div className="text-sm font-semibold text-gray-800">{todayStatus.participationScore}%</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 sm:col-span-2">
                          <div className="text-xs text-gray-500 mb-1">Hành vi</div>
                          <div className={`text-sm font-semibold ${
                            todayStatus.behavior === 'good' ? 'text-green-700' :
                            todayStatus.behavior === 'normal' ? 'text-amber-700' : 'text-red-700'
                          }`}>
                            {todayStatus.behavior === 'good' ? 'Tốt' : todayStatus.behavior === 'normal' ? 'Bình thường' : 'Cần chú ý'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                        Hôm nay chưa có dữ liệu điểm danh cho học sinh này.
                      </div>
                    )}

                    {todayStatus?.note && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Nhận xét nhanh trong ngày:</strong> {todayStatus.note}
                        </p>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-gray-800">Nhận xét giáo viên gửi phụ huynh</h4>
                        <div className="flex items-center gap-2">
                          <select
                            value={feedbackPeriod}
                            onChange={e => setFeedbackPeriod(e.target.value as 'today' | 'week' | 'all')}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs"
                          >
                            <option value="today">Hôm nay</option>
                            <option value="week">Tuần này</option>
                            <option value="all">Tất cả</option>
                          </select>
                          <select
                            value={feedbackType}
                            onChange={e => setFeedbackType(e.target.value as 'all' | 'praise' | 'reminder' | 'discipline')}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs"
                          >
                            <option value="all">Mọi loại</option>
                            <option value="praise">Khen ngợi</option>
                            <option value="reminder">Nhắc nhở</option>
                            <option value="discipline">Phê bình</option>
                          </select>
                        </div>
                      </div>
                      {studentFeedbacks.length === 0 ? (
                        <p className="text-sm text-gray-400">Chưa có nhận xét nào.</p>
                      ) : (
                        <div className="space-y-2">
                          {studentFeedbacks.slice(0, 8).map(fb => (
                            <div key={fb.id} className="border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    fb.category === 'praise' ? 'bg-green-100 text-green-700' :
                                    fb.category === 'reminder' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {fb.category === 'praise' ? 'Khen ngợi' : fb.category === 'reminder' ? 'Nhắc nhở' : 'Phê bình'}
                                  </span>
                                  {!fb.readByParent && (
                                    <button
                                      onClick={() => markFeedbackRead(fb.id)}
                                      className="text-xs text-blue-600 hover:underline"
                                    >
                                      Đánh dấu đã xem
                                    </button>
                                  )}
                                  {fb.readByParent && (
                                    <span className="text-[11px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">Đã xem</span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400">{fb.date}</span>
                              </div>
                              <p className="text-sm font-medium text-gray-800 mt-2">{fb.title}</p>
                              <p className="text-sm text-gray-600 mt-1">{fb.content}</p>
                              {fb.replyRequested && (
                                <div className="mt-2 border-t border-gray-100 pt-2">
                                  <p className="text-xs text-amber-700 mb-1">Giáo viên đang xin phản hồi từ phụ huynh</p>
                                  <p className="text-[11px] text-gray-500 mb-1.5 leading-snug">
                                    Phản hồi được lưu trong trình duyệt; nếu tài khoản đã liên kết lớp trên máy chủ, hệ thống
                                    đồng gửi bản vào{' '}
                                    <strong className="font-medium text-gray-600">khối «Phản hồi phụ huynh qua máy chủ»</strong>{' '}
                                    ở trang chi tiết lớp (GV bấm Làm mới).
                                  </p>
                                  <textarea
                                    rows={2}
                                    value={replyInputs[fb.id] ?? ''}
                                    onChange={e => setReplyInputs(prev => ({ ...prev, [fb.id]: e.target.value }))}
                                    placeholder="Nhập phản hồi của phụ huynh..."
                                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm resize-none"
                                  />
                                  <button
                                    onClick={async () => {
                                      const text = (replyInputs[fb.id] ?? '').trim();
                                      if (!text) {
                                        toast.error('Vui lòng nhập nội dung phản hồi');
                                        return;
                                      }
                                      await addFeedbackReply(fb.id, {
                                        fromRole: 'parent',
                                        authorName: user?.name ?? 'Phụ huynh',
                                        date: SCHOOL_TODAY,
                                        content: text,
                                      });
                                      setReplyInputs(prev => ({ ...prev, [fb.id]: '' }));

                                      const target = resolveExchangeTargetForStudent(fb.studentId, apiLinks, students);
                                      if (!target) {
                                        toast.success(
                                          'Đã lưu phản hồi trên trình duyệt; chưa đồng bộ máy chủ (thiếu mã lớp/liên kết).',
                                        );
                                        return;
                                      }
                                      try {
                                        await postParentParentTeacherExchange({
                                          maLop: target.maLop,
                                          maHocSinh: target.maHocSinh,
                                          tieuDe: fb.title?.trim()
                                            ? `Phản hồi nhận xét: ${fb.title.trim()}`
                                            : 'Phản hồi nhận xét giáo viên',
                                          noiDung: text,
                                          thoiDiem: new Date().toISOString(),
                                        });
                                        try {
                                          const ex = await fetchParentParentTeacherExchange();
                                          setApiExchanges(ex);
                                        } catch {
                                          // ignore
                                        }
                                        toast.success(
                                          'Đã gửi phản hồi; giáo viên xem ở Nhận xét lớp → khối đồng bộ SQL (bấm Làm mới).',
                                        );
                                      } catch {
                                        toast.warning(
                                          'Đã lưu trên trình duyệt nhưng chưa gửi lên máy chủ — kiểm tra liên kết phụ huynh–học sinh và mã lớp.',
                                        );
                                      }
                                    }}
                                    className="mt-2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700"
                                  >
                                    Gửi phản hồi
                                  </button>
                                </div>
                              )}
                              {fb.replies.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {fb.replies.map(reply => (
                                    <div key={reply.id} className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                                      <p className="text-xs text-gray-500">{reply.authorName} · {reply.date}</p>
                                      <p className="text-sm text-gray-700">{reply.content}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TRAO ĐỔI + ĐIỂM DANH (API) */}
      {activeTab === 'comms' && (user?.role === 'parent' || user?.role === 'admin') && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <MessageSquare size={17} className="text-blue-600" />
              Trao đổi giáo viên — phụ huynh
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Dữ liệu lấy từ máy chủ (bảng trao đổi và điểm danh học sinh). Chọn học sinh đã được quản trị liên kết với lớp.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end mb-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Liên kết gửi tin</label>
                <select
                  value={
                    commsSel
                      ? `${commsSel.maLop}|${commsSel.maHocSinh}`
                      : ''
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    const [maLop, maHocSinh] = v.split('|');
                    if (maLop && maHocSinh) setCommsSel({ maLop, maHocSinh });
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {apiLinks.filter((l) => l.maLop && l.studentId).length === 0 ? (
                    <option value="">Không có liên kết lớp + học sinh trên hệ thống</option>
                  ) : (
                    apiLinks
                      .filter((l) => l.maLop && l.studentId)
                      .map((l) => (
                        <option key={l.id} value={`${l.maLop}|${l.studentId}`}>
                          Lớp {l.maLop} — HS {l.studentId}
                          {l.relationship ? ` (${l.relationship})` : ''}
                        </option>
                      ))
                  )}
                </select>
              </div>
            </div>

            {!user?.chiDoc && (
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/90 space-y-2 mb-4">
                <p className="text-xs font-medium text-gray-700">Phản hồi giáo viên</p>
                <input
                  value={commsCompose.tieuDe}
                  onChange={(e) => setCommsCompose((c) => ({ ...c, tieuDe: e.target.value }))}
                  placeholder="Tiêu đề"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                />
                <textarea
                  value={commsCompose.noiDung}
                  onChange={(e) => setCommsCompose((c) => ({ ...c, noiDung: e.target.value }))}
                  rows={3}
                  placeholder="Nội dung…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-none"
                />
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Thời điểm gửi</label>
                    <input
                      type="datetime-local"
                      value={commsCompose.thoiDiem}
                      onChange={(e) =>
                        setCommsCompose((c) => ({ ...c, thoiDiem: e.target.value }))
                      }
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    className="text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white"
                    onClick={() => setCommsCompose((c) => ({ ...c, thoiDiem: toDatetimeLocalValue() }))}
                  >
                    Giờ hiện tại
                  </button>
                  <button
                    type="button"
                    disabled={!commsSel}
                    className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    onClick={async () => {
                      if (!commsSel || !commsCompose.noiDung.trim()) {
                        toast.error('Chọn học sinh liên kết và nhập nội dung');
                        return;
                      }
                      const thIso = commsCompose.thoiDiem.trim()
                        ? new Date(commsCompose.thoiDiem).toISOString()
                        : new Date().toISOString();
                      try {
                        await postParentParentTeacherExchange({
                          maLop: commsSel.maLop,
                          maHocSinh: commsSel.maHocSinh,
                          tieuDe: commsCompose.tieuDe.trim() || undefined,
                          noiDung: commsCompose.noiDung.trim(),
                          thoiDiem: thIso,
                        });
                        setCommsCompose((c) => ({ ...c, tieuDe: '', noiDung: '', thoiDiem: toDatetimeLocalValue() }));
                        const ex = await fetchParentParentTeacherExchange();
                        setApiExchanges(ex);
                        toast.success('Đã gửi');
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Không gửi được');
                      }
                    }}
                  >
                    Gửi
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {apiExchanges.length === 0 ? (
                <p className="text-sm text-gray-400">Chưa có tin trao đổi.</p>
              ) : (
                apiExchanges.map((m) => (
                  <div
                    key={m.maTraoDoi}
                    className={`rounded-lg border p-3 text-sm ${m.vaiTroGui === 'teacher' ? 'bg-blue-50/70 border-blue-100' : 'bg-green-50/70 border-green-100'
                      }`}
                  >
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{m.vaiTroGui === 'teacher' ? 'Giáo viên' : 'Phụ huynh'} · Lớp {m.maLop}</span>
                      <span>{new Date(m.thoiDiem).toLocaleString('vi-VN')}</span>
                    </div>
                    <p className="font-semibold text-gray-800 mt-1">{m.tieuDe}</p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      HS: {m.maHocSinh ?? '—'}
                    </p>
                    <p className="text-gray-700 mt-2 whitespace-pre-wrap">{m.noiDung}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <Clock size={17} className="text-green-600" />
              Điểm danh theo thời điểm (30 ngày gần nhất)
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Mỗi dòng là một lần ghi với giờ cụ thể (giáo viên chọn hoặc giờ hiện tại).
            </p>
            {apiAttDetail.length === 0 ? (
              <p className="text-sm text-gray-400">Chưa có bản ghi hoặc chưa liên kết học sinh.</p>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500">
                      <th className="px-3 py-2">Thời điểm</th>
                      <th className="px-3 py-2">Lớp</th>
                      <th className="px-3 py-2">Mã HS</th>
                      <th className="px-3 py-2">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiAttDetail.map((r) => (
                      <tr key={r.ma} className="border-t border-gray-100">
                        <td className="px-3 py-2 whitespace-nowrap">{new Date(r.thoiDiem).toLocaleString('vi-VN')}</td>
                        <td className="px-3 py-2 font-mono">{r.maLop}</td>
                        <td className="px-3 py-2 font-mono">{r.maHocSinh}</td>
                        <td className="px-3 py-2">
                          {r.trangThai === 'present' ? 'Có mặt' : r.trangThai === 'late' ? 'Muộn' : 'Vắng'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCHEDULE TAB */}
      {activeTab === 'schedule' && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Info size={15} />
              <span className="text-sm font-medium">Lịch học tuần 06/04 – 12/04/2026</span>
            </div>
            <p className="text-xs text-blue-600">Lịch học có thể thay đổi theo điều chỉnh từ admin. Vui lòng kiểm tra thường xuyên.</p>
          </div>

          {['Thứ 2 (06/04)', 'Thứ 3 (07/04)', 'Thứ 4 (08/04)', 'Thứ 5 (09/04)', 'Thứ 6 (10/04)', 'Thứ 7 (11/04)'].map((dayLabel, di) => {
            const jsDay = di + 1; // Mon=1...Sat=6
            const dow = jsDay === 0 ? 1 : jsDay + 1; // our dayOfWeek
            const dayClasses = myClasses.filter(c => getEffectiveSchedules(c.id, c.schedules).some(s => s.dayOfWeek === dow));

            return (
              <div key={di} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${di === 2 ? 'border-blue-300' : 'border-gray-200'}`}>
                <div className={`flex items-center justify-between px-4 py-3 border-b ${di === 2 ? 'bg-blue-600 border-blue-500' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`font-medium text-sm ${di === 2 ? 'text-white' : 'text-gray-700'}`}>{dayLabel}</span>
                  {di === 2 && <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">Hôm nay</span>}
                  <span className={`text-xs ${di === 2 ? 'text-blue-200' : 'text-gray-400'}`}>{dayClasses.length} lớp</span>
                </div>
                {dayClasses.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400">Không có lớp học</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {dayClasses.map(cls => {
                      const effectiveSchedules = getEffectiveSchedules(cls.id, cls.schedules);
                      const sched = effectiveSchedules.find(s => s.dayOfWeek === dow);
                      const adjusted = scheduleAdjustments.some((item) => item.classId === cls.id);
                      const teacher = getTeacher(cls.teacherId);
                      const room = getRoom(cls.roomId);
                      const live = di === 2 ? LIVE_DATA.find(l => l.classId === cls.id) : null;
                      return (
                        <div key={cls.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800">{cls.name}</span>
                              {adjusted && <span className="text-[11px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">Lịch đã chỉnh</span>}
                              {live?.isActive && (
                                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                  Live
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-gray-400">{teacher?.name}</span>
                              <span className="text-xs text-gray-300">·</span>
                              <span className="text-xs text-gray-400">{room?.name}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-700">
                              {sched?.startTime} – {sched?.endTime}
                            </div>
                            {live?.isActive && (
                              <div className="text-xs text-green-600">{live.currentStudents} HS · {live.concentrationLevel}%</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* REPORTS TAB */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-700 mb-1">
              <Info size={15} />
              <span className="text-sm font-medium">Báo cáo tổng quát lớp học</span>
            </div>
            <p className="text-xs text-amber-600">
              Dữ liệu phản ánh tổng thể lớp học. Hệ thống không theo dõi thông tin cá nhân từng học sinh.
            </p>
          </div>

          {myClasses.map(cls => {
            const sessions = SESSION_REPORTS.filter(s => s.classId === cls.id).slice(0, 8);
            const avgConc = sessions.length
              ? Math.round(sessions.reduce((s, r) => s + r.avgConcentration, 0) / sessions.length)
              : 0;
            const avgStudents = sessions.length
              ? Math.round(sessions.reduce((s, r) => s + r.avgStudents, 0) / sessions.length)
              : 0;
            const chartData = sessions.slice().reverse().map(s => ({
              date: s.date.slice(5),
              concentration: s.avgConcentration,
              students: s.avgStudents,
            }));

            return (
              <div key={cls.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">{cls.name}</h3>
                    <p className="text-xs text-gray-400">{sessions.length} buổi học gần nhất</p>
                  </div>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${getConcentrationBg(avgConc)}`}>
                    TB {avgConc}%
                  </span>
                </div>

                {chartData.length > 0 ? (
                  <>
                    <div className="mb-4">
                      <p className="text-xs text-gray-400 mb-2">Mức tập trung lớp theo buổi</p>
                      <ResponsiveContainer width="100%" height={120}>
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id={`pgrad${cls.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="%" />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, 'Tập trung']} />
                          <Area type="monotone" dataKey="concentration" stroke="#3b82f6" fill={`url(#pgrad${cls.id})`} strokeWidth={1.5} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className="text-sm font-semibold text-gray-800">{avgStudents}/{cls.expectedStudents}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Sĩ số TB</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className={`text-sm font-semibold ${avgConc >= 80 ? 'text-green-700' : avgConc >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                          {avgConc}%
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">Tập trung TB</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className="text-sm font-semibold text-gray-800">{sessions.length}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Buổi đã học</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">Chưa có dữ liệu báo cáo</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
              <CheckCircle size={40} className="mx-auto mb-3 text-green-400 opacity-50" />
              <p className="text-gray-400">Không có thông báo mới</p>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`bg-white rounded-xl border shadow-sm p-4 ${
                n.type === 'alert' ? 'border-red-200' :
                n.type === 'warning' ? 'border-amber-200' :
                n.type === 'success' ? 'border-green-200' : 'border-gray-200'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    n.type === 'alert' ? 'bg-red-100 text-red-600' :
                    n.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                    n.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {n.type === 'alert' || n.type === 'warning' ? <AlertTriangle size={16} /> :
                     n.type === 'success' ? <CheckCircle size={16} /> : <Bell size={16} />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 text-sm">{n.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{n.content}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        n.type === 'alert' ? 'bg-red-100 text-red-600' :
                        n.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                        n.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {n.type === 'alert' ? 'Khẩn' : n.type === 'warning' ? 'Cảnh báo' : n.type === 'success' ? 'Tốt' : 'Thông tin'}
                      </span>
                      <span className="text-xs text-gray-400">{n.date} · {n.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
