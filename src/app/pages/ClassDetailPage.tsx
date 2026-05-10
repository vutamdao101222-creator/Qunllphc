import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  CLASSES, LIVE_DATA, SESSION_REPORTS,
  getTeacher, getRoom, getConcentrationColor,
  getConcentrationBg, DAY_NAMES_FULL
} from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { SCHOOL_TODAY, useSchoolData } from '../context/SchoolDataContext';
import {
  fetchClass,
  fetchClassSuggestedStudentCodes,
  fetchClassParentTeacherExchange,
  postClassParentTeacherExchange,
  fetchClassStudentAttendanceRecords,
  postClassStudentAttendanceRecord,
} from '../lib/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  ArrowLeft, Users, Activity, Clock, BookOpen,
  CalendarDays, TrendingDown, TrendingUp, BarChart2, Send, MessageSquare, ClipboardCheck,
  Plus, Pencil, Trash2, X, Search,
} from 'lucide-react';
import { toast } from 'sonner';

function toDatetimeLocalValue(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseFeedbackCategoryInput(text: string): 'praise' | 'reminder' | 'discipline' {
  const t = text.trim().toLowerCase();
  if (!t) return 'reminder';
  if (/(khen|khen ngợi|ngợi|tốt|xuất sắc|đạt)/.test(t)) return 'praise';
  if (/(phê|phê bình|kỷ luật|khiển|phạt)/.test(t)) return 'discipline';
  return 'reminder';
}

export default function ClassDetailPage() {
  const { user } = useAuth();
  const {
    students,
    parentAccounts,
    studentStatuses,
    feedbacks,
    assignments,
    submissions,
    learningProfiles,
    addStudent,
    updateStudent,
    deleteStudent,
    setAttendance,
    createFeedback,
    toggleReplyRequested,
    filterFeedbacks,
    addFeedbackReply,
    getParentsOfStudent,
    setLearningProfileNote,
  } = useSchoolData();
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const cls = CLASSES.find(c => c.id === classId);
  const [remoteClass, setRemoteClass] = useState<any | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const teacher = cls ? getTeacher(cls.teacherId) : null;
  const room = cls ? getRoom(cls.roomId) : null;
  const live = LIVE_DATA.find(l => l.classId === classId);
  const sessions = SESSION_REPORTS.filter(s => s.classId === classId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20);

  React.useEffect(() => {
    let mounted = true;
    const loadRemote = async () => {
      if (cls || !classId) return;
      setRemoteLoading(true);
      try {
        const data = await fetchClass(classId);
        if (mounted) setRemoteClass(data);
      } catch {
        if (mounted) setRemoteClass(null);
      } finally {
        if (mounted) setRemoteLoading(false);
      }
    };
    loadRemote();
    return () => {
      mounted = false;
    };
  }, [classId, cls]);

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'sessions'
    | 'trends'
    | 'attendance'
    | 'exchange'
    | 'students'
    | 'feedback'
    | 'assignments'
    | 'profiles'
  >('overview');
  const classStudents = cls ? students.filter(s => s.classId === cls.id) : [];
  const canSendFeedback = user?.role === 'teacher' || user?.role === 'admin';
  const canEditAttendance = user?.role === 'teacher' || user?.role === 'admin';
  const canManageStudents =
    (user?.role === 'teacher' || user?.role === 'admin') && !user?.chiDoc;
  const [studentFormMode, setStudentFormMode] = useState<null | 'add' | 'edit'>(null);
  const [studentForm, setStudentForm] = useState({ id: '', name: '', parentUserId: '' });
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [feedbackStudentSearch, setFeedbackStudentSearch] = useState('');
  const [feedbackStudentSuggestOpen, setFeedbackStudentSuggestOpen] = useState(false);
  const [feedbackCategoryInput, setFeedbackCategoryInput] = useState('');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackPeriod, setFeedbackPeriod] = useState<'today' | 'week' | 'all'>('week');
  const [feedbackType, setFeedbackType] = useState<'all' | 'praise' | 'reminder' | 'discipline'>('all');
  const [feedbackListSearch, setFeedbackListSearch] = useState('');
  const [teacherReplies, setTeacherReplies] = useState<Record<string, string>>({});
  const [profileEdits, setProfileEdits] = useState<Record<string, string>>({});
  const classAssignments = assignments.filter(a => a.classId === classId);
  const [attendanceAt, setAttendanceAt] = useState(() => toDatetimeLocalValue());
  const [apiAttendanceRows, setApiAttendanceRows] = useState<
    Array<{
      ma: number;
      maLop: string;
      maHocSinh: string;
      thoiDiem: string;
      trangThai: string;
      ghiChu?: string | null;
    }>
  >([]);
  const [suggestedMaHocSinh, setSuggestedMaHocSinh] = useState<string[]>([]);
  const [exchangeList, setExchangeList] = useState<
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
  const [exchangeFilterMaHs, setExchangeFilterMaHs] = useState('');
  const [exchangeForm, setExchangeForm] = useState({
    tieuDe: '',
    noiDung: '',
    thoiDiem: '',
    maHocSinh: '' as string,
  });
  const [exchangeBusy, setExchangeBusy] = useState(false);
  /** Trao đổi thật (SQL) — hiển thị trong tab «Nhận xét» để GV thấy phản hồi PH từ máy chủ */
  const [feedbackApiThread, setFeedbackApiThread] = useState<
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
  const [feedbackSyncToApi, setFeedbackSyncToApi] = useState(true);

  React.useEffect(() => {
    if (!cls || activeTab !== 'attendance') return;
    let cancelled = false;
    const maLop = cls.code;
    const to = new Date();
    const from = new Date(to.getTime() - 90 * 86400000);
    (async () => {
      try {
        const [items, sug] = await Promise.all([
          fetchClassStudentAttendanceRecords(maLop, { from: from.toISOString(), to: to.toISOString() }),
          fetchClassSuggestedStudentCodes(maLop).catch(() => [] as string[]),
        ]);
        if (!cancelled) {
          setApiAttendanceRows(items);
          setSuggestedMaHocSinh(sug);
        }
      } catch {
        if (!cancelled) {
          setApiAttendanceRows([]);
          setSuggestedMaHocSinh([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cls, activeTab]);

  React.useEffect(() => {
    if (!cls || activeTab !== 'exchange') return;
    if (user?.role !== 'teacher' && user?.role !== 'admin') return;
    let cancelled = false;
    const maLop = cls.code;
    const f = exchangeFilterMaHs.trim() || undefined;
    fetchClassParentTeacherExchange(maLop, f)
      .then((rows) => {
        if (!cancelled) setExchangeList(rows);
      })
      .catch(() => {
        if (!cancelled) setExchangeList([]);
      });
    return () => {
      cancelled = true;
    };
  }, [cls, activeTab, exchangeFilterMaHs, user?.role]);

  React.useEffect(() => {
    if (activeTab === 'exchange' && cls && (user?.role === 'teacher' || user?.role === 'admin')) {
      setExchangeForm((prev) => ({ ...prev, thoiDiem: toDatetimeLocalValue() }));
    }
  }, [activeTab, cls, user?.role]);

  React.useEffect(() => {
    if (!cls || activeTab !== 'feedback') return;
    if (user?.role !== 'teacher' && user?.role !== 'admin') return;
    let cancelled = false;
    fetchClassParentTeacherExchange(cls.code)
      .then((rows) => {
        if (!cancelled) setFeedbackApiThread(rows);
      })
      .catch(() => {
        if (!cancelled) setFeedbackApiThread([]);
      });
    return () => {
      cancelled = true;
    };
  }, [cls, activeTab, user?.role]);

  const attendanceStudentIds = useMemo(() => {
    const fromLocal = new Set(classStudents.map((s) => s.id));
    for (const c of suggestedMaHocSinh) fromLocal.add(c);
    return [...fromLocal];
  }, [classStudents, suggestedMaHocSinh]);

  const classFeedbacks = useMemo(() => {
    const items = feedbacks
      .filter(f => f.classId === classId)
      .sort((a, b) => b.date.localeCompare(a.date));
    return filterFeedbacks(items, feedbackPeriod, feedbackType);
  }, [classId, feedbackPeriod, feedbackType, feedbacks, filterFeedbacks]);

  const classFeedbacksFiltered = useMemo(() => {
    const q = feedbackListSearch.trim().toLowerCase();
    if (!q) return classFeedbacks;
    return classFeedbacks.filter((f) => {
      const st = students.find((s) => s.id === f.studentId);
      const name = (st?.name ?? '').toLowerCase();
      const id = (st?.id ?? f.studentId).toLowerCase();
      const title = (f.title ?? '').toLowerCase();
      const body = (f.content ?? '').toLowerCase();
      return name.includes(q) || id.includes(q) || title.includes(q) || body.includes(q);
    });
  }, [classFeedbacks, feedbackListSearch, students]);

  const feedbackApiSorted = useMemo(() => {
    return [...feedbackApiThread].sort(
      (a, b) => new Date(b.thoiDiem).getTime() - new Date(a.thoiDiem).getTime(),
    );
  }, [feedbackApiThread]);

  const feedbackStudentMatches = useMemo(() => {
    const q = feedbackStudentSearch.trim().toLowerCase();
    if (!q) return classStudents.slice(0, 10);
    return classStudents
      .filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
      .slice(0, 12);
  }, [classStudents, feedbackStudentSearch]);

  const resolveFeedbackStudentId = (): string | null => {
    const raw = feedbackStudentSearch.trim();
    if (!raw) return null;
    const paren = raw.match(/\(([^)]+)\)\s*$/);
    if (paren) {
      const id = paren[1].trim();
      const hit = classStudents.find((s) => s.id === id);
      if (hit) return hit.id;
    }
    const byId = classStudents.find((s) => s.id === raw);
    if (byId) return byId.id;
    const nameEq = classStudents.filter((s) => s.name.toLowerCase() === raw.toLowerCase());
    if (nameEq.length === 1) return nameEq[0].id;
    return null;
  };

  if (!cls) {
    if (remoteLoading) {
      return <div className="p-6 text-gray-500 text-center">Đang tải thông tin lớp...</div>;
    }
    if (remoteClass) {
      return (
        <div className="p-4 lg:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
            >
              <ArrowLeft size={16} /> Quay lại
            </button>
            <div>
              <h1 className="text-gray-900">{remoteClass.tenLop ?? remoteClass.maLop ?? 'Lớp học'}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Mã lớp: <strong>{remoteClass.maLop}</strong> · GV: {remoteClass.tenGiaoVien ?? remoteClass.maGiaoVien}
              </p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-700">
              Lớp này đang lấy từ <strong>DB/API</strong>. Phần biểu đồ/live demo hiện chỉ có cho các lớp mock (`c1…c7`).
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/dashboard">
              <button className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Về tổng quan</button>
            </Link>
            {user?.role === 'admin' && (
              <Link to="/classes">
                <button className="text-sm px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">Quản lý lớp</button>
              </Link>
            )}
          </div>
        </div>
      );
    }
    return <div className="p-6 text-gray-500 text-center">Không tìm thấy thông tin lớp học.</div>;
  }

  const avgConc = sessions.length
    ? Math.round(sessions.reduce((s, r) => s + r.avgConcentration, 0) / sessions.length)
    : 0;
  const avgStudents = sessions.length
    ? Math.round(sessions.reduce((s, r) => s + r.avgStudents, 0) / sessions.length)
    : 0;
  const peakStudents = sessions.length ? Math.max(...sessions.map(s => s.peakStudents)) : 0;
  const minStudents = sessions.length ? Math.min(...sessions.map(s => s.minStudents)) : 0;

  const sessionChartData = sessions.slice().reverse().map(s => ({
    date: s.date.slice(5),
    students: s.avgStudents,
    concentration: s.avgConcentration,
  }));

  const lowConcPeriods = sessions.filter(s => s.avgConcentration < 60);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-gray-900">{cls.name}</h1>
            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
              {cls.code}
            </span>
            {live?.isActive && (
              <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Đang học
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{cls.subject} · Khối {cls.grade}</p>
        </div>
        {live?.isActive && (
          <Link to={`/monitor/${cls.id}`}>
            <button className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <Activity size={15} />
              Theo dõi live
            </button>
          </Link>
        )}
      </div>

      {/* Class Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Thông tin lớp học</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Giáo viên', value: teacher?.name, icon: <Users size={15} className="text-blue-600" />, sub: teacher?.subject },
            { label: 'Phòng học', value: room?.name, icon: <BookOpen size={15} className="text-indigo-600" />, sub: `Tòa ${room?.building}, tầng ${room?.floor}` },
            { label: 'Sĩ số dự kiến', value: `${cls.expectedStudents} học sinh`, icon: <Users size={15} className="text-green-600" />, sub: `Sức chứa: ${room?.capacity}` },
            { label: 'Lịch học', value: `${cls.schedules.length} buổi/tuần`, icon: <CalendarDays size={15} className="text-amber-600" />, sub: cls.schedules.map(s => DAY_NAMES_FULL[s.dayOfWeek]).join(', ') },
          ].map((info, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                {info.icon}
                {info.label}
              </div>
              <div className="font-semibold text-gray-800 text-sm">{info.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{info.sub}</div>
            </div>
          ))}
        </div>

        {/* Schedule detail */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Chi tiết lịch học:</p>
          <div className="flex flex-wrap gap-2">
            {cls.schedules.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 text-xs text-blue-700">
                <CalendarDays size={11} />
                <span className="font-medium">{DAY_NAMES_FULL[s.dayOfWeek]}</span>
                <span className="text-blue-500">{s.startTime}–{s.endTime}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats overview — nguồn mock buổi học (SESSION_REPORTS), không gắn DB BuoiHoc/điểm danh SQL */}
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
        <strong>Dữ liệu tổng quan (4 thẻ dưới đây và biểu đồ các tab Tổng quan / Xu hướng)</strong> được tính từ{' '}
        <strong>dữ liệu demo</strong> trong ứng dụng (chuỗi buổi học mẫu theo lớp mock), không đồng bộ với cơ sở
        dữ liệu SQL. Để xem điểm danh / trao đổi thật, dùng tab{' '}
        <strong>Điểm danh học sinh</strong> và <strong>Trao đổi PH (API)</strong> / <strong>Nhận xét phụ huynh</strong> (phần
        máy chủ).
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tập trung TB', value: `${avgConc}%`, bg: getConcentrationBg(avgConc), trend: avgConc >= 70 ? 'up' : 'down' },
          { label: 'Sĩ số TB', value: `${avgStudents} người`, bg: 'bg-blue-100 text-blue-800', trend: 'neutral' },
          { label: 'Đông nhất', value: `${peakStudents} người`, bg: 'bg-green-100 text-green-800', trend: 'up' },
          { label: 'Vắng nhất', value: `${minStudents} người`, bg: 'bg-red-100 text-red-800', trend: 'down' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className={`inline-block text-xs px-2 py-1 rounded-full mb-2 font-medium ${stat.bg}`}>
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-400 mt-1">
              {sessions.length} buổi học gần nhất (demo)
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {[
            { key: 'overview', label: 'Tổng quan buổi học' },
            { key: 'sessions', label: 'Danh sách buổi học' },
            { key: 'trends', label: 'Xu hướng' },
            { key: 'attendance', label: 'Điểm danh học sinh' },
            { key: 'exchange', label: 'Trao đổi PH (API)' },
            { key: 'students', label: 'Quản lý học sinh' },
            { key: 'feedback', label: 'Nhận xét phụ huynh' },
            { key: 'assignments', label: 'Bài tập & deadline' },
            { key: 'profiles', label: 'Learning Profile' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 lg:px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Mức tập trung theo buổi học</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={sessionChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, 'Tập trung']} />
                      <Bar dataKey="concentration" radius={[3, 3, 0, 0]}>
                        {sessionChartData.map((d, i) => (
                          <Cell key={i} fill={getConcentrationColor(d.concentration)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Sĩ số trung bình theo buổi</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={sessionChartData}>
                      <defs>
                        <linearGradient id="studGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, cls.expectedStudents + 5]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [v, 'Học sinh']} />
                      <Area type="monotone" dataKey="students" stroke="#6366f1" fill="url(#studGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {lowConcPeriods.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <TrendingDown size={15} className="text-red-500" />
                    Các buổi có mức tập trung thấp
                  </h4>
                  <div className="space-y-2">
                    {lowConcPeriods.map(s => (
                      <div key={s.id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
                        <div>
                          <span className="text-sm font-medium text-red-700">{s.date}</span>
                          <span className="text-xs text-gray-500 ml-2">{s.startTime}–{s.endTime}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">Thấp nhất lúc {s.lowConcentrationTime}</span>
                          <span className="text-sm font-bold text-red-600">{s.avgConcentration}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Ngày</th>
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Giờ học</th>
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Sĩ số TB</th>
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Đông nhất</th>
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Vắng nhất</th>
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Tập trung TB</th>
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Thấp nhất lúc</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/70">
                      <td className="px-4 py-3 font-medium text-gray-800">{s.date}</td>
                      <td className="px-4 py-3 text-gray-600">{s.startTime}–{s.endTime}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{s.avgStudents}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">{s.peakStudents}</td>
                      <td className="px-4 py-3 text-red-600 font-medium">{s.minStudents}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getConcentrationBg(s.avgConcentration)}`}>
                          {s.avgConcentration}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{s.lowConcentrationTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-700">Buổi tốt nhất</span>
                  </div>
                  {sessions.length > 0 && (() => {
                    const best = sessions.reduce((b, s) => s.avgConcentration > b.avgConcentration ? s : b);
                    return <>
                      <div className="text-xl font-bold text-green-700">{best.avgConcentration}%</div>
                      <div className="text-xs text-green-600">{best.date} · {best.startTime}–{best.endTime}</div>
                    </>;
                  })()}
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown size={16} className="text-red-600" />
                    <span className="text-sm font-medium text-red-700">Buổi thấp nhất</span>
                  </div>
                  {sessions.length > 0 && (() => {
                    const worst = sessions.reduce((b, s) => s.avgConcentration < b.avgConcentration ? s : b);
                    return <>
                      <div className="text-xl font-bold text-red-700">{worst.avgConcentration}%</div>
                      <div className="text-xs text-red-600">{worst.date} · {worst.startTime}–{worst.endTime}</div>
                    </>;
                  })()}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart2 size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Tổng buổi học</span>
                  </div>
                  <div className="text-xl font-bold text-blue-700">{sessions.length}</div>
                  <div className="text-xs text-blue-600">Trong 2 tuần qua</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Xu hướng tập trung theo thời gian</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={sessionChartData}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, 'Tập trung TB']} />
                    <Area type="monotone" dataKey="concentration" stroke="#3b82f6" fill="url(#trendGrad)" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                Điểm danh theo học sinh: ghi vào{' '}
                <strong>hệ thống (SQL)</strong> với <strong>thời điểm đã chọn</strong> hoặc giờ hiện tại. Demo cục bộ (ngày
                {` ${SCHOOL_TODAY}`}) vẫn cập nhật song song để hiển thị trên các màn hình chỉ đọc mock.
                {!canEditAttendance && (
                  <span className="block mt-2 text-indigo-800">
                    Bạn đang xem ở chế độ chỉ đọc — chỉ quản trị hoặc giáo viên mới chỉnh được điểm danh.
                  </span>
                )}
              </div>
              {cls && (
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 border border-gray-200 rounded-lg p-3 bg-gray-50/80">
                  <div className="flex-1 min-w-[11rem]">
                    <label className="block text-xs text-gray-500 mb-1">Thời điểm ghi điểm danh</label>
                    <input
                      type="datetime-local"
                      value={attendanceAt}
                      onChange={(e) => setAttendanceAt(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    className="text-sm px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
                    onClick={() => setAttendanceAt(toDatetimeLocalValue())}
                  >
                    Giờ hiện tại
                  </button>
                </div>
              )}
              {(attendanceStudentIds.length ? attendanceStudentIds : classStudents.map((s) => s.id)).map((sid) => {
                const student = classStudents.find((s) => s.id === sid);
                const label = student?.name ?? sid;
                const status = studentStatuses.find((s) => s.studentId === sid && s.date === SCHOOL_TODAY);
                const parents = student ? getParentsOfStudent(student.id) : [];
                return (
                  <div key={sid} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{label}</p>
                        <p className="text-xs text-gray-500 font-mono">Mã HS: {sid}</p>
                        <p className="text-xs text-gray-500">Demo ngày: {SCHOOL_TODAY}</p>
                        {student && (
                          <p className="text-xs text-indigo-600 mt-0.5">
                            Phụ huynh liên kết:{' '}
                            {parents.length ? parents.map((parent) => parent.name).join(', ') : 'Chưa liên kết'}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">Giờ vào lớp (demo): {status?.checkInTime ?? 'Chưa có'}</div>
                    </div>
                    <div className="grid sm:grid-cols-4 gap-2 mt-3">
                      {[
                        { value: 'present', label: 'Có mặt' },
                        { value: 'late', label: 'Đi muộn' },
                        { value: 'absent', label: 'Vắng' },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          disabled={!canEditAttendance || !cls || !!user?.chiDoc}
                          onClick={async () => {
                            if (!canEditAttendance || !cls || user?.chiDoc) return;
                            const thIso = new Date(attendanceAt).toISOString();
                            setAttendance({
                              studentId: sid,
                              date: SCHOOL_TODAY,
                              attendance: item.value as 'present' | 'late' | 'absent',
                              checkInTime:
                                item.value === 'present' ? '06:55' : item.value === 'late' ? '07:10' : '',
                            });
                            try {
                              await postClassStudentAttendanceRecord(cls.code, {
                                maHocSinh: sid,
                                trangThai: item.value as 'present' | 'late' | 'absent',
                                thoiDiem: thIso,
                              });
                              const to = new Date();
                              const from = new Date(to.getTime() - 90 * 86400000);
                              const rows = await fetchClassStudentAttendanceRecords(cls.code, {
                                from: from.toISOString(),
                                to: to.toISOString(),
                              });
                              setApiAttendanceRows(rows);
                              toast.success('Đã lưu điểm danh vào hệ thống');
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : 'Không lưu được điểm danh API');
                            }
                          }}
                          className={`text-xs px-3 py-2 rounded-lg border ${
                            status?.attendance === item.value
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-gray-200 text-gray-600'
                          } ${!canEditAttendance || user?.chiDoc ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {cls && apiAttendanceRows.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Lịch sử điểm danh (API, 90 ngày gần nhất)</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-left text-gray-500">
                          <th className="px-3 py-2">Thời điểm</th>
                          <th className="px-3 py-2">Mã HS</th>
                          <th className="px-3 py-2">Trạng thái</th>
                          <th className="px-3 py-2">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiAttendanceRows.slice(0, 80).map((r) => (
                          <tr key={r.ma} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                              {new Date(r.thoiDiem).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-3 py-2 font-mono">{r.maHocSinh}</td>
                            <td className="px-3 py-2">
                              {r.trangThai === 'present' ? 'Có mặt' : r.trangThai === 'late' ? 'Muộn' : 'Vắng'}
                            </td>
                            <td className="px-3 py-2 text-gray-500">{r.ghiChu ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'exchange' && cls && (
            <div className="space-y-4">
              {user?.role !== 'teacher' && user?.role !== 'admin' ? (
                <p className="text-sm text-gray-500">Chỉ giáo viên hoặc quản trị xem và gửi trao đổi theo lớp tại đây.</p>
              ) : (
                <>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-800">
                    Trao đổi hai chiều với phụ huynh theo mã lớp <strong>{cls.code}</strong>. Tin nhắn lưu trong bảng{' '}
                    <code className="text-xs">TraoDoiPhHuynhGiaoVien</code>.
                  </div>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Lọc theo mã HS (tuỳ chọn)</label>
                      <input
                        value={exchangeFilterMaHs}
                        onChange={(e) => setExchangeFilterMaHs(e.target.value)}
                        placeholder="Để trống = cả lớp"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[22rem] overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50/60">
                    {exchangeList.length === 0 ? (
                      <p className="text-sm text-gray-500">Chưa có tin trao đổi hoặc chưa tải được dữ liệu.</p>
                    ) : (
                      exchangeList.map((m) => (
                        <div
                          key={m.maTraoDoi}
                          className={`rounded-lg p-3 border ${
                            m.vaiTroGui === 'teacher' ? 'bg-white border-blue-100' : 'bg-green-50/80 border-green-100'
                          }`}
                        >
                          <div className="flex justify-between gap-2 text-xs text-gray-500">
                            <span>{m.vaiTroGui === 'teacher' ? 'Giáo viên' : 'Phụ huynh'}</span>
                            <span>{new Date(m.thoiDiem).toLocaleString('vi-VN')}</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-800 mt-1">{m.tieuDe}</p>
                          <p className="text-xs text-gray-400 font-mono">
                            {m.maHocSinh ? `HS: ${m.maHocSinh}` : 'Cả lớp / không gắn HS'}
                          </p>
                          <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{m.noiDung}</p>
                        </div>
                      ))
                    )}
                  </div>
                  {!user?.chiDoc && (
                    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
                      <h4 className="text-sm font-medium text-gray-800">Gửi tin đến phụ huynh</h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Gắn mã học sinh (tuỳ chọn)</label>
                          <select
                            value={exchangeForm.maHocSinh}
                            onChange={(e) =>
                              setExchangeForm((prev) => ({ ...prev, maHocSinh: e.target.value }))
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="">— Cả lớp hoặc chung —</option>
                            {attendanceStudentIds.map((id) => (
                              <option key={id} value={id}>
                                {classStudents.find((s) => s.id === id)?.name ?? id}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Thời điểm hiển thị tin</label>
                          <input
                            type="datetime-local"
                            value={exchangeForm.thoiDiem}
                            onChange={(e) =>
                              setExchangeForm((prev) => ({ ...prev, thoiDiem: e.target.value }))
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            className="text-xs text-blue-600 mt-1 hover:underline"
                            onClick={() =>
                              setExchangeForm((prev) => ({ ...prev, thoiDiem: toDatetimeLocalValue() }))
                            }
                          >
                            Đặt giờ hiện tại
                          </button>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Tiêu đề</label>
                          <input
                            value={exchangeForm.tieuDe}
                            onChange={(e) =>
                              setExchangeForm((prev) => ({ ...prev, tieuDe: e.target.value }))
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Nội dung</label>
                          <textarea
                            value={exchangeForm.noiDung}
                            onChange={(e) =>
                              setExchangeForm((prev) => ({ ...prev, noiDung: e.target.value }))
                            }
                            rows={3}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={exchangeBusy}
                        className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                        onClick={async () => {
                          const noi = exchangeForm.noiDung.trim();
                          if (!noi) {
                            toast.error('Nhập nội dung');
                            return;
                          }
                          setExchangeBusy(true);
                          try {
                            const thIso = exchangeForm.thoiDiem.trim()
                              ? new Date(exchangeForm.thoiDiem).toISOString()
                              : new Date().toISOString();
                            await postClassParentTeacherExchange(cls.code, {
                              maHocSinh: exchangeForm.maHocSinh.trim() || null,
                              tieuDe: exchangeForm.tieuDe.trim() || undefined,
                              noiDung: noi,
                              thoiDiem: thIso,
                            });
                            setExchangeForm((prev) => ({ ...prev, tieuDe: '', noiDung: '', thoiDiem: toDatetimeLocalValue() }));
                            const rows = await fetchClassParentTeacherExchange(
                              cls.code,
                              exchangeFilterMaHs.trim() || undefined,
                            );
                            setExchangeList(rows);
                            toast.success('Đã gửi trao đổi');
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : 'Không gửi được');
                          } finally {
                            setExchangeBusy(false);
                          }
                        }}
                      >
                        Gửi
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'students' && cls && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-gray-600">
                  Thêm, sửa hoặc xóa học sinh trong lớp. Dữ liệu lưu trên trình duyệt (đồng bộ với phụ huynh / điểm danh).
                </p>
                {canManageStudents && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStudentId(null);
                      setStudentForm({
                        id: '',
                        name: '',
                        parentUserId: parentAccounts[0]?.id ?? 'u4',
                      });
                      setStudentFormMode('add');
                    }}
                    className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    <Plus size={16} />
                    Thêm học sinh
                  </button>
                )}
              </div>
              {!canManageStudents && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Chỉ quản trị hoặc giáo viên (không chế độ chỉ đọc) mới chỉnh được danh sách học sinh.
                </p>
              )}
              {classStudents.length === 0 ? (
                <div className="text-center text-gray-500 py-10 border border-dashed border-gray-200 rounded-xl">
                  Chưa có học sinh nào trong lớp. {canManageStudents && 'Nhấn «Thêm học sinh» để bắt đầu.'}
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs text-gray-500">
                        <th className="px-4 py-3 font-medium">Mã HS</th>
                        <th className="px-4 py-3 font-medium">Họ tên</th>
                        <th className="px-4 py-3 font-medium">Phụ huynh (tài khoản)</th>
                        <th className="px-4 py-3 font-medium w-32 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map((st) => {
                        const pa = parentAccounts.find((p) => p.id === st.parentUserId);
                        return (
                          <tr key={st.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                            <td className="px-4 py-3 font-mono text-xs text-gray-700">{st.id}</td>
                            <td className="px-4 py-3 font-medium text-gray-800">{st.name}</td>
                            <td className="px-4 py-3 text-gray-600">
                              {pa ? `${pa.name} (${pa.username})` : st.parentUserId}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {canManageStudents && (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingStudentId(st.id);
                                      setStudentForm({
                                        id: st.id,
                                        name: st.name,
                                        parentUserId: st.parentUserId,
                                      });
                                      setStudentFormMode('edit');
                                    }}
                                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                                    title="Sửa"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteStudentId(st.id)}
                                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                                    title="Xóa"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {studentFormMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                  <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">
                        {studentFormMode === 'add' ? 'Thêm học sinh' : 'Sửa học sinh'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setStudentFormMode(null)}
                        className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Mã học sinh</label>
                        <input
                          value={studentForm.id}
                          onChange={(e) => setStudentForm((f) => ({ ...f, id: e.target.value }))}
                          disabled={studentFormMode === 'edit'}
                          placeholder="VD: hs-01 (để trống sẽ tự tạo)"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Họ và tên</label>
                        <input
                          value={studentForm.name}
                          onChange={(e) => setStudentForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tài khoản phụ huynh liên kết</label>
                        <select
                          value={studentForm.parentUserId}
                          onChange={(e) => setStudentForm((f) => ({ ...f, parentUserId: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        >
                          {parentAccounts.length === 0 ? (
                            <option value="u4">u4 (mặc định demo)</option>
                          ) : (
                            parentAccounts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} — {p.username}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setStudentFormMode(null)}
                        className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const name = studentForm.name.trim();
                          if (!name) {
                            toast.error('Vui lòng nhập họ tên');
                            return;
                          }
                          if (studentFormMode === 'add') {
                            const id = studentForm.id.trim() || `hs-${Date.now()}`;
                            try {
                              await addStudent({
                                id,
                                name,
                                classId: cls.id,
                                parentUserId: studentForm.parentUserId || parentAccounts[0]?.id || 'u4',
                              });
                              toast.success('Đã thêm học sinh');
                              setStudentFormMode(null);
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : 'Không thêm được');
                            }
                          } else if (editingStudentId) {
                            await updateStudent(editingStudentId, {
                              name,
                              parentUserId: studentForm.parentUserId,
                            });
                            toast.success('Đã cập nhật học sinh');
                            setStudentFormMode(null);
                            setEditingStudentId(null);
                          }
                        }}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {deleteStudentId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                  <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
                    <p className="text-sm text-gray-800">
                      Xóa học sinh <strong>{classStudents.find((s) => s.id === deleteStudentId)?.name}</strong>? Các điểm
                      danh, nhận xét và nộp bài của học sinh này cũng sẽ bị xóa khỏi bản local.
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteStudentId(null)}
                        className="px-4 py-2 text-sm border border-gray-200 rounded-lg"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteStudent(deleteStudentId);
                          toast.success('Đã xóa học sinh');
                          setDeleteStudentId(null);
                        }}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-4">
              {(user?.role === 'teacher' || user?.role === 'admin') && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-900">
                        Phản hồi phụ huynh qua máy chủ (đồng bộ SQL)
                      </h4>
                      <p className="text-xs text-emerald-900/90 mt-1 leading-relaxed max-w-3xl">
                        Phụ huynh gửi tin ở trang <strong>Phụ huynh → Trao đổi GV &amp; điểm danh</strong> được lưu bảng{' '}
                        <code className="text-[11px] bg-white/70 px-1 rounded">TraoDoiPhHuynhGiaoVien</code> theo mã lớp{' '}
                        <strong>{cls.code}</strong> — hiển thị luôn tại đây. Phần nhận xét dạng khen/nhắc (ô xám bên dưới)
                        chỉ nằm trong <strong>trình duyệt này</strong>, nên máy khác hoặc phụ huynh đăng nhập thật sẽ không
                        thấy trừ khi bạn bật «Đồng thời đẩy…» khi gửi.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs shrink-0 px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100/80"
                      onClick={async () => {
                        try {
                          const rows = await fetchClassParentTeacherExchange(cls.code);
                          setFeedbackApiThread(rows);
                          toast.success('Đã làm mới tin từ máy chủ');
                        } catch {
                          toast.error('Không tải được trao đổi — kiểm tra quyền GV lớp hoặc API.');
                        }
                      }}
                    >
                      Làm mới
                    </button>
                  </div>
                  {feedbackApiSorted.filter((m) => m.vaiTroGui === 'parent').length === 0 &&
                  feedbackApiSorted.length === 0 ? (
                    <p className="text-sm text-emerald-800">
                      Chưa có trao đổi API cho lớp <strong>{cls.code}</strong>.
                    </p>
                  ) : feedbackApiSorted.filter((m) => m.vaiTroGui === 'parent').length === 0 ? (
                    <p className="text-sm text-emerald-800">
                      Chưa có tin từ <strong>phụ huynh</strong>; chỉ có tin giáo viên gửi qua API (xem bên dưới).
                    </p>
                  ) : null}
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {feedbackApiSorted.map((m) => (
                      <div
                        key={m.maTraoDoi}
                        className={`rounded-lg border p-3 text-sm ${
                          m.vaiTroGui === 'parent'
                            ? 'bg-white border-emerald-300 shadow-sm'
                            : 'bg-white/60 border-emerald-100'
                        }`}
                      >
                        <div className="flex flex-wrap justify-between gap-1 text-xs text-gray-500">
                          <span>
                            {m.vaiTroGui === 'parent' ? (
                              <span className="font-semibold text-emerald-800">Phụ huynh</span>
                            ) : (
                              <span className="font-medium text-blue-800">Giáo viên / quản trị</span>
                            )}
                            {m.maHocSinh ? (
                              <span className="ml-2 font-mono text-gray-600">· HS {m.maHocSinh}</span>
                            ) : null}
                            {m.hoTenNguoiGui ? <span className="ml-1">· {m.hoTenNguoiGui}</span> : null}
                          </span>
                          <span className="whitespace-nowrap">{new Date(m.thoiDiem).toLocaleString('vi-VN')}</span>
                        </div>
                        <p className="font-semibold text-gray-900 mt-1">{m.tieuDe}</p>
                        <p className="text-gray-700 mt-1 whitespace-pre-wrap">{m.noiDung}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {canSendFeedback && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="font-medium text-gray-800 mb-3">Gửi nhận xét đến phụ huynh (lưu cục bộ)</h4>
                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                    Ô dưới đây thêm mục vào danh sách <strong>demo trong trình duyệt</strong> (thông báo khen / nhắc). Để phụ
                    huynh đang dùng tài khoản thật đọc được trên tab «Trao đổi» của họ, hãy bật tùy chọn đẩy lên máy chủ.
                  </p>
                  <label className="flex items-start gap-2 text-sm text-gray-800 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-gray-300"
                      checked={feedbackSyncToApi}
                      onChange={(e) => setFeedbackSyncToApi(e.target.checked)}
                      disabled={!!user?.chiDoc}
                    />
                    <span>
                      <strong>Đồng thời đẩy lên máy chủ</strong> (trao đổi API, mã lớp {cls.code}) — phụ huynh xem được
                      khi đăng nhập qua hệ thống.
                    </span>
                  </label>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="block text-xs text-gray-500 mb-1">Học sinh</label>
                      <input
                        type="text"
                        value={feedbackStudentSearch}
                        onChange={(e) => {
                          setFeedbackStudentSearch(e.target.value);
                          setFeedbackStudentSuggestOpen(true);
                        }}
                        onFocus={() => setFeedbackStudentSuggestOpen(true)}
                        onBlur={() => {
                          window.setTimeout(() => setFeedbackStudentSuggestOpen(false), 200);
                        }}
                        placeholder="Nhập tên hoặc mã học sinh để tìm…"
                        autoComplete="off"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        Gõ để lọc; chọn dòng trong gợi ý hoặc nhập đúng tên / mã (có thể dạng Tên (mã)).
                      </p>
                      {feedbackStudentSuggestOpen && feedbackStudentMatches.length > 0 && (
                        <ul className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg">
                          {feedbackStudentMatches.map((s) => (
                            <li key={s.id}>
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left hover:bg-gray-50"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setFeedbackStudentSearch(`${s.name} (${s.id})`);
                                  setFeedbackStudentSuggestOpen(false);
                                }}
                              >
                                <span className="font-medium text-gray-800">{s.name}</span>
                                <span className="ml-2 text-xs text-gray-400">{s.id}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Loại nhận xét</label>
                      <input
                        type="text"
                        value={feedbackCategoryInput}
                        onChange={(e) => setFeedbackCategoryInput(e.target.value)}
                        placeholder="VD: khen ngợi, nhắc nhở, phê bình…"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        Hệ thống nhận diện từ khóa (khen / nhắc / phê…); mặc định là nhắc nhở nếu không khớp.
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Tiêu đề</label>
                      <input
                        value={feedbackTitle}
                        onChange={e => setFeedbackTitle(e.target.value)}
                        placeholder="Ví dụ: Nhắc nhở nề nếp trong giờ học"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Nội dung gửi phụ huynh</label>
                      <textarea
                        value={feedbackContent}
                        onChange={e => setFeedbackContent(e.target.value)}
                        rows={3}
                        placeholder="Nhập nhận xét chi tiết..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!feedbackTitle.trim() || !feedbackContent.trim() || !classId || !teacher) {
                        toast.error('Vui lòng nhập đầy đủ thông tin nhận xét');
                        return;
                      }
                      const sid = resolveFeedbackStudentId();
                      if (!sid) {
                        const raw = feedbackStudentSearch.trim();
                        const nameDup = classStudents.filter((s) => s.name.toLowerCase() === raw.toLowerCase());
                        if (nameDup.length > 1) {
                          toast.error('Nhiều học sinh trùng tên — chọn trong gợi ý hoặc nhập mã chính xác.');
                        } else {
                          toast.error('Không tìm thấy học sinh — kiểm tra tên, mã hoặc chọn từ danh sách gợi ý.');
                        }
                        return;
                      }
                      const category = parseFeedbackCategoryInput(feedbackCategoryInput);
                      const catLabel =
                        category === 'praise' ? 'Khen ngợi' : category === 'reminder' ? 'Nhắc nhở' : 'Phê bình';
                      await createFeedback({
                        studentId: sid,
                        classId,
                        teacherId: teacher.id,
                        date: SCHOOL_TODAY,
                        category,
                        title: feedbackTitle.trim(),
                        content: feedbackContent.trim(),
                      });
                      if (feedbackSyncToApi && !user?.chiDoc) {
                        try {
                          await postClassParentTeacherExchange(cls.code, {
                            maHocSinh: sid,
                            tieuDe: feedbackTitle.trim(),
                            noiDung: `[${catLabel}] ${feedbackContent.trim()}`,
                            thoiDiem: new Date().toISOString(),
                          });
                          const rows = await fetchClassParentTeacherExchange(cls.code);
                          setFeedbackApiThread(rows);
                          toast.success('Đã lưu nhận xét (demo) và đã gửi bản lên máy chủ');
                        } catch (e) {
                          toast.warning(
                            `Đã lưu nhận xét trên trình duyệt; không gửi được lên máy chủ: ${e instanceof Error ? e.message : 'lỗi'}. Kiểm tra mã lớp ${cls.code} trong SQL và quyền giáo viên phụ trách lớp.`,
                          );
                        }
                      } else {
                        toast.success('Đã gửi nhận xét đến phụ huynh (chỉ trong trình duyệt)');
                      }
                      setFeedbackTitle('');
                      setFeedbackContent('');
                      setFeedbackStudentSearch('');
                      setFeedbackCategoryInput('');
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Send size={14} />
                    Gửi phụ huynh
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={feedbackPeriod}
                  onChange={e => setFeedbackPeriod(e.target.value as 'today' | 'week' | 'all')}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                >
                  <option value="today">Hôm nay</option>
                  <option value="week">Tuần này</option>
                  <option value="all">Tất cả</option>
                </select>
                <select
                  value={feedbackType}
                  onChange={e => setFeedbackType(e.target.value as 'all' | 'praise' | 'reminder' | 'discipline')}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                >
                  <option value="all">Mọi loại</option>
                  <option value="praise">Khen ngợi</option>
                  <option value="reminder">Nhắc nhở</option>
                  <option value="discipline">Phê bình</option>
                </select>
                <div className="relative flex-1 min-w-[12rem] max-w-md">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="search"
                    value={feedbackListSearch}
                    onChange={(e) => setFeedbackListSearch(e.target.value)}
                    placeholder="Tìm theo tên / mã HS, tiêu đề hoặc nội dung…"
                    className="w-full border border-gray-200 rounded-lg pl-8 pr-2 py-1.5 text-xs"
                    aria-label="Tìm nhận xét trong danh sách"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {classFeedbacks.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 bg-white border border-gray-200 rounded-xl">
                    <MessageSquare size={30} className="mx-auto mb-2 opacity-40" />
                    Chưa có nhận xét nào cho lớp này.
                  </div>
                ) : classFeedbacksFiltered.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 bg-white border border-gray-200 rounded-xl">
                    <Search size={30} className="mx-auto mb-2 opacity-40" />
                    Không có nhận xét khớp “{feedbackListSearch.trim()}”.
                  </div>
                ) : (
                  classFeedbacksFiltered.map(item => {
                    const student = students.find(s => s.id === item.studentId);
                    return (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-gray-800">{student?.name ?? 'Học sinh'}</div>
                          <span className="text-xs text-gray-400">{item.date}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            item.category === 'praise' ? 'bg-green-100 text-green-700' :
                            item.category === 'reminder' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {item.category === 'praise' ? 'Khen ngợi' : item.category === 'reminder' ? 'Nhắc nhở' : 'Phê bình'}
                          </span>
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                            item.readByParent ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {item.readByParent ? 'Phụ huynh đã xem' : 'Chưa xem'}
                          </span>
                          <button
                            type="button"
                            disabled={!canSendFeedback}
                            onClick={() => canSendFeedback && toggleReplyRequested(item.id, !item.replyRequested)}
                            className={`text-[11px] text-blue-600 hover:underline ${!canSendFeedback ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            {item.replyRequested ? 'Tắt xin phản hồi' : 'Xin phản hồi'}
                          </button>
                          <span className="text-xs text-gray-500">{item.title}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{item.content}</p>
                        {item.replies.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {item.replies.map(reply => (
                              <div key={reply.id} className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                                <p className="text-xs text-gray-500">{reply.authorName} · {reply.date}</p>
                                <p className="text-sm text-gray-700">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {canSendFeedback && (
                          <div className="mt-2">
                            <textarea
                              rows={2}
                              value={teacherReplies[item.id] ?? ''}
                              onChange={e => setTeacherReplies(prev => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder="Trả lời phụ huynh..."
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm resize-none"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                const text = (teacherReplies[item.id] ?? '').trim();
                                if (!text) {
                                  toast.error('Vui lòng nhập nội dung trả lời');
                                  return;
                                }
                                await addFeedbackReply(item.id, {
                                  fromRole: 'teacher',
                                  authorName: user?.name ?? 'Giáo viên',
                                  date: SCHOOL_TODAY,
                                  content: text,
                                });
                                setTeacherReplies(prev => ({ ...prev, [item.id]: '' }));
                                toast.success('Đã gửi trả lời phụ huynh');
                              }}
                              className="mt-1 bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-slate-800"
                            >
                              Gửi trả lời
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="space-y-3">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-700">
                Giao bài theo lớp/nhóm/học sinh, theo dõi hạn nộp và tỷ lệ đúng hạn.
              </div>
              {classAssignments.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có bài tập cho lớp này.</p>
              ) : (
                classAssignments.map(assignment => {
                  const assignmentSubmissions = submissions.filter(s => s.assignmentId === assignment.id);
                  const submitted = assignmentSubmissions.filter(s => s.status === 'submitted').length;
                  const total = classStudents.length || 1;
                  const onTimeRate = Math.round((submitted / total) * 100);
                  return (
                    <div key={assignment.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{assignment.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{assignment.description}</p>
                        </div>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          Hạn nộp {assignment.dueDate}
                        </span>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-2 mt-3">
                        <div className="bg-gray-50 rounded-lg p-2 text-xs">
                          <span className="text-gray-500">Đối tượng</span>
                          <p className="font-semibold text-gray-700">{assignment.target}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-xs">
                          <span className="text-gray-500">Đã nộp</span>
                          <p className="font-semibold text-gray-700">{submitted}/{total}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-xs">
                          <span className="text-gray-500">Tỷ lệ đúng hạn</span>
                          <p className={`font-semibold ${onTimeRate >= 80 ? 'text-green-700' : onTimeRate >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                            {onTimeRate}%
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'profiles' && (
            <div className="space-y-3">
              {classStudents.map(student => {
                const profile = learningProfiles.find(p => p.studentId === student.id);
                if (!profile) return null;
                const declining = profile.concentrationTrend.length >= 3 &&
                  profile.concentrationTrend.slice(-3).every((v, i, arr) => i === 0 || v <= arr[i - 1]);
                return (
                  <div key={student.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-800">{student.name}</p>
                      {declining && (
                        <span className="text-[11px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          Cảnh báo: tụt tập trung liên tiếp
                        </span>
                      )}
                    </div>
                    <div className="mt-2 h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={profile.weekLabels.map((w, i) => ({
                          week: w,
                          tapTrung: profile.concentrationTrend[i],
                          thamGia: profile.participationTrend[i],
                          hoanThanh: profile.completionTrend[i],
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="tapTrung" fill="#3b82f6" />
                          <Bar dataKey="thamGia" fill="#16a34a" />
                          <Bar dataKey="hoanThanh" fill="#d97706" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-gray-600 mt-2"><strong>Điểm mạnh:</strong> {profile.strengths.join(', ')}</p>
                    <p className="text-xs text-gray-600 mt-1"><strong>Cần cải thiện:</strong> {profile.weaknesses.join(', ')}</p>
                    <p className="text-xs text-indigo-700 mt-1"><strong>Gợi ý can thiệp:</strong> {profile.suggestedIntervention}</p>
                    {canSendFeedback && (
                      <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                        <label className="block text-[11px] text-gray-500">Chỉnh sửa gợi ý can thiệp (lưu cục bộ)</label>
                        <textarea
                          rows={2}
                          value={profileEdits[student.id] !== undefined ? profileEdits[student.id] : profile.suggestedIntervention}
                          onChange={(e) => setProfileEdits((prev) => ({ ...prev, [student.id]: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs resize-none"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const raw = profileEdits[student.id] !== undefined ? profileEdits[student.id] : profile.suggestedIntervention;
                            await setLearningProfileNote(student.id, raw.trim());
                            setProfileEdits((prev) => {
                              const next = { ...prev };
                              delete next[student.id];
                              return next;
                            });
                            toast.success('Đã lưu gợi ý can thiệp');
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          Lưu gợi ý
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
