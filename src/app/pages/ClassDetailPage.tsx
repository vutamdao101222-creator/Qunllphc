import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  CLASSES, LIVE_DATA, SESSION_REPORTS,
  getTeacher, getRoom, getConcentrationColor,
  getConcentrationBg, DAY_NAMES_FULL
} from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { SCHOOL_STUDENTS, SCHOOL_TODAY, useSchoolData } from '../context/SchoolDataContext';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  ArrowLeft, Users, Activity, Clock, BookOpen,
  CalendarDays, TrendingDown, TrendingUp, BarChart2, Send, MessageSquare, ClipboardCheck
} from 'lucide-react';

export default function ClassDetailPage() {
  const { user } = useAuth();
  const { studentStatuses, feedbacks, assignments, submissions, learningProfiles, setAttendance, createFeedback, toggleReplyRequested, filterFeedbacks, addFeedbackReply } = useSchoolData();
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const cls = CLASSES.find(c => c.id === classId);
  const teacher = cls ? getTeacher(cls.teacherId) : null;
  const room = cls ? getRoom(cls.roomId) : null;
  const live = LIVE_DATA.find(l => l.classId === classId);
  const sessions = SESSION_REPORTS.filter(s => s.classId === classId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'trends' | 'attendance' | 'feedback' | 'assignments' | 'profiles'>('overview');
  const classStudents = cls ? SCHOOL_STUDENTS.filter(s => s.classId === cls.id) : [];
  const canSendFeedback = user?.role === 'teacher' || user?.role === 'admin';
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<'praise' | 'reminder' | 'discipline'>('reminder');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackPeriod, setFeedbackPeriod] = useState<'today' | 'week' | 'all'>('week');
  const [feedbackType, setFeedbackType] = useState<'all' | 'praise' | 'reminder' | 'discipline'>('all');
  const [teacherReplies, setTeacherReplies] = useState<Record<string, string>>({});
  const classAssignments = assignments.filter(a => a.classId === classId);
  const classFeedbacks = useMemo(() => {
    const items = feedbacks
      .filter(f => f.classId === classId)
      .sort((a, b) => b.date.localeCompare(a.date));
    return filterFeedbacks(items, feedbackPeriod, feedbackType);
  }, [classId, feedbackPeriod, feedbackType, feedbacks, filterFeedbacks]);

  if (!cls) return (
    <div className="p-6 text-gray-500 text-center">Không tìm thấy lớp học.</div>
  );

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

      {/* Stats overview */}
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
              {sessions.length} buổi học gần nhất
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex border-b border-gray-100">
          {[
            { key: 'overview', label: 'Tổng quan buổi học' },
            { key: 'sessions', label: 'Danh sách buổi học' },
            { key: 'trends', label: 'Xu hướng' },
            { key: 'attendance', label: 'Điểm danh học sinh' },
            { key: 'feedback', label: 'Nhận xét phụ huynh' },
            { key: 'assignments', label: 'Bài tập & deadline' },
            { key: 'profiles', label: 'Learning Profile' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
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
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                Giáo viên cập nhật điểm danh theo từng học sinh. Phụ huynh sẽ thấy ngay trạng thái hôm nay và giờ vào lớp.
              </div>
              {classStudents.map(student => {
                const status = studentStatuses.find(s => s.studentId === student.id && s.date === SCHOOL_TODAY);
                return (
                  <div key={student.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{student.name}</p>
                        <p className="text-xs text-gray-500">Ngày {SCHOOL_TODAY}</p>
                      </div>
                      <div className="text-xs text-gray-500">Giờ vào lớp: {status?.checkInTime ?? 'Chưa có'}</div>
                    </div>
                    <div className="grid sm:grid-cols-4 gap-2 mt-3">
                      {[
                        { value: 'present', label: 'Có mặt' },
                        { value: 'late', label: 'Đi muộn' },
                        { value: 'absent', label: 'Vắng' },
                      ].map(item => (
                        <button
                          key={item.value}
                          onClick={() => setAttendance({
                            studentId: student.id,
                            date: SCHOOL_TODAY,
                            attendance: item.value as 'present' | 'late' | 'absent',
                            checkInTime: item.value === 'present' ? '06:55' : item.value === 'late' ? '07:10' : '',
                          })}
                          className={`text-xs px-3 py-2 rounded-lg border ${
                            status?.attendance === item.value
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-gray-200 text-gray-600'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-4">
              {canSendFeedback && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="font-medium text-gray-800 mb-3">Gửi nhận xét đến phụ huynh</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Học sinh</label>
                      <select
                        value={selectedStudentId}
                        onChange={e => setSelectedStudentId(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">Chọn học sinh</option>
                        {classStudents.map(student => (
                          <option key={student.id} value={student.id}>{student.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Loại nhận xét</label>
                      <select
                        value={feedbackCategory}
                        onChange={e => setFeedbackCategory(e.target.value as 'praise' | 'reminder' | 'discipline')}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="praise">Khen ngợi</option>
                        <option value="reminder">Nhắc nhở</option>
                        <option value="discipline">Phê bình</option>
                      </select>
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
                      if (!selectedStudentId || !feedbackTitle.trim() || !feedbackContent.trim() || !classId || !teacher) return;
                      await createFeedback({
                        studentId: selectedStudentId,
                        classId,
                        teacherId: teacher.id,
                        date: SCHOOL_TODAY,
                        category: feedbackCategory,
                        title: feedbackTitle.trim(),
                        content: feedbackContent.trim(),
                      });
                      setFeedbackTitle('');
                      setFeedbackContent('');
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Send size={14} />
                    Gửi phụ huynh
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
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
              </div>

              <div className="space-y-2">
                {classFeedbacks.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 bg-white border border-gray-200 rounded-xl">
                    <MessageSquare size={30} className="mx-auto mb-2 opacity-40" />
                    Chưa có nhận xét nào cho lớp này.
                  </div>
                ) : (
                  classFeedbacks.map(item => {
                    const student = SCHOOL_STUDENTS.find(s => s.id === item.studentId);
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
                            onClick={() => toggleReplyRequested(item.id, !item.replyRequested)}
                            className="text-[11px] text-blue-600 hover:underline"
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
                        <div className="mt-2">
                          <textarea
                            rows={2}
                            value={teacherReplies[item.id] ?? ''}
                            onChange={e => setTeacherReplies(prev => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Trả lời phụ huynh..."
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm resize-none"
                          />
                          <button
                            onClick={async () => {
                              const text = (teacherReplies[item.id] ?? '').trim();
                              if (!text) return;
                              await addFeedbackReply(item.id, {
                                fromRole: 'teacher',
                                authorName: user?.name ?? 'Giáo viên',
                                date: SCHOOL_TODAY,
                                content: text,
                              });
                              setTeacherReplies(prev => ({ ...prev, [item.id]: '' }));
                            }}
                            className="mt-1 bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-slate-800"
                          >
                            Gửi trả lời
                          </button>
                        </div>
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
