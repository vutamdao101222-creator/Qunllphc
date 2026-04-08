import React, { useState } from 'react';
import { Link } from 'react-router';
import {
  TEACHERS, CLASSES, SESSION_REPORTS,
  getConcentrationBg, getConcentrationColor
} from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Search, TrendingUp, TrendingDown, BookOpen, CalendarDays, BarChart2 } from 'lucide-react';

export default function TeacherManagementPage() {
  const [search, setSearch] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);

  const filtered = TEACHERS.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  );

  const getTeacherStats = (teacherId: string) => {
    const teacherClasses = CLASSES.filter(c => c.teacherId === teacherId);
    const classIds = teacherClasses.map(c => c.id);
    const sessions = SESSION_REPORTS.filter(s => classIds.includes(s.classId));
    const avgConc = sessions.length
      ? Math.round(sessions.reduce((s, r) => s + r.avgConcentration, 0) / sessions.length)
      : 0;
    const avgStudents = sessions.length
      ? Math.round(sessions.reduce((s, r) => s + r.avgStudents, 0) / sessions.length)
      : 0;

    const recentSessions = sessions.slice(0, 5);
    const olderSessions = sessions.slice(5, 10);
    const recentAvg = recentSessions.length ? Math.round(recentSessions.reduce((s, r) => s + r.avgConcentration, 0) / recentSessions.length) : avgConc;
    const olderAvg = olderSessions.length ? Math.round(olderSessions.reduce((s, r) => s + r.avgConcentration, 0) / olderSessions.length) : avgConc;
    const trend = recentAvg - olderAvg;

    return { teacherClasses, sessions, avgConc, avgStudents, trend, recentSessions };
  };

  const selectedTeacherData = selectedTeacher ? TEACHERS.find(t => t.id === selectedTeacher) : null;
  const selectedStats = selectedTeacher ? getTeacherStats(selectedTeacher) : null;

  const sessionChartData = selectedStats?.recentSessions.slice().reverse().map(s => {
    const cls = CLASSES.find(c => c.id === s.classId);
    return {
      label: `${cls?.name?.slice(0, 6)} ${s.date.slice(5)}`,
      concentration: s.avgConcentration,
      students: s.avgStudents,
    };
  }) ?? [];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-gray-900">Quản lý giáo viên</h1>
        <p className="text-sm text-gray-500 mt-0.5">{TEACHERS.length} giáo viên</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Teacher list */}
        <div className="space-y-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm giáo viên..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="space-y-2">
            {filtered.map(teacher => {
              const stats = getTeacherStats(teacher.id);
              const isSelected = selectedTeacher === teacher.id;
              return (
                <button
                  key={teacher.id}
                  onClick={() => setSelectedTeacher(isSelected ? null : teacher.id)}
                  className={`w-full text-left bg-white rounded-xl border shadow-sm p-4 hover:border-blue-300 transition-all ${
                    isSelected ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {teacher.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 text-sm truncate">{teacher.name}</div>
                      <div className="text-xs text-gray-500">{teacher.subject}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-bold ${getConcentrationColor(stats.avgConc) === '#16a34a' ? 'text-green-700' : getConcentrationColor(stats.avgConc) === '#d97706' ? 'text-amber-700' : 'text-red-700'}`}>
                        {stats.avgConc}%
                      </div>
                      <div className="text-xs text-gray-400">{stats.teacherClasses.length} lớp</div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${stats.avgConc}%`, backgroundColor: getConcentrationColor(stats.avgConc) }}
                      />
                    </div>
                    <div className={`flex items-center gap-0.5 text-xs ${stats.trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {stats.trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {Math.abs(stats.trend)}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Teacher detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedTeacherData ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-gray-400">
              <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
              <p>Chọn một giáo viên để xem thống kê</p>
            </div>
          ) : (
            <>
              {/* Teacher info */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {selectedTeacherData.avatar}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-gray-900 font-semibold">{selectedTeacherData.name}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{selectedTeacherData.subject}</p>
                    <div className="flex flex-wrap gap-3 mt-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                        <span>📧</span> {selectedTeacherData.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                        <span>📞</span> {selectedTeacherData.phone}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              {selectedStats && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                      <div className="text-2xl font-bold text-blue-700">{selectedStats.teacherClasses.length}</div>
                      <div className="text-xs text-gray-500 mt-1">Lớp phụ trách</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                      <div className={`text-2xl font-bold ${selectedStats.avgConc >= 80 ? 'text-green-700' : selectedStats.avgConc >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                        {selectedStats.avgConc}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Tập trung TB</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                      <div className="text-2xl font-bold text-indigo-700">{selectedStats.sessions.length}</div>
                      <div className="text-xs text-gray-500 mt-1">Buổi đã dạy</div>
                    </div>
                  </div>

                  {/* Classes */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h3 className="font-semibold text-gray-800 mb-3">Lớp đang phụ trách</h3>
                    <div className="space-y-2">
                      {selectedStats.teacherClasses.map(cls => {
                        const clsSessions = SESSION_REPORTS.filter(s => s.classId === cls.id);
                        const clsAvgConc = clsSessions.length
                          ? Math.round(clsSessions.reduce((s, r) => s + r.avgConcentration, 0) / clsSessions.length)
                          : 0;
                        return (
                          <Link key={cls.id} to={`/classes/${cls.id}`}>
                            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 hover:bg-blue-50 transition-colors cursor-pointer">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                  <BookOpen size={14} className="text-blue-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-800">{cls.name}</div>
                                  <div className="text-xs text-gray-400">{cls.schedules.length} buổi/tuần · {cls.expectedStudents} HS</div>
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getConcentrationBg(clsAvgConc)}`}>
                                {clsAvgConc}%
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent sessions chart */}
                  {sessionChartData.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                      <h3 className="font-semibold text-gray-800 mb-3">Tập trung buổi gần đây</h3>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={sessionChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="%" />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, 'Tập trung']} />
                          <Bar dataKey="concentration" radius={[3, 3, 0, 0]}>
                            {sessionChartData.map((d, i) => (
                              <Cell key={i} fill={getConcentrationColor(d.concentration)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Insight */}
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">
                          {selectedStats.trend >= 3 ? (
                            <span className="text-green-700">📈 Xu hướng tập trung <strong>tăng</strong> trong các buổi gần đây ({selectedStats.trend > 0 ? '+' : ''}{selectedStats.trend}%). Tiếp tục duy trì phương pháp giảng dạy tốt!</span>
                          ) : selectedStats.trend <= -3 ? (
                            <span className="text-red-700">📉 Xu hướng tập trung <strong>giảm</strong> ({selectedStats.trend}%). Cân nhắc điều chỉnh phương pháp hoặc thời lượng buổi học.</span>
                          ) : (
                            <span className="text-gray-600">📊 Mức tập trung <strong>ổn định</strong> trong các buổi gần đây.</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
