import React, { useState } from 'react';
import {
  CLASSES, SESSION_REPORTS, LIVE_DATA,
  getTeacher, getConcentrationColor, getConcentrationBg
} from '../data/mockData';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend
} from 'recharts';
import { Download, TrendingUp, TrendingDown, BarChart2, Filter } from 'lucide-react';

const SUBJECT_COLORS_MAP: Record<string, string> = {
  'Toán học': '#3b82f6',
  'Ngữ văn': '#8b5cf6',
  'Vật lý': '#06b6d4',
  'Hóa học': '#22c55e',
  'Sinh học': '#10b981',
  'Tiếng Anh': '#f97316',
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'byClass' | 'weekly' | 'monthly'>('overview');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month'>('week');

  const filteredSessions = selectedClass === 'all'
    ? SESSION_REPORTS
    : SESSION_REPORTS.filter(s => s.classId === selectedClass);

  // Summary per class
  const classSummary = CLASSES.map(cls => {
    const sessions = SESSION_REPORTS.filter(s => s.classId === cls.id);
    const teacher = getTeacher(cls.teacherId);
    if (sessions.length === 0) return { cls, teacher, avgConc: 0, avgStudents: 0, sessions: 0, trend: 0 };
    const avgConc = Math.round(sessions.reduce((s, r) => s + r.avgConcentration, 0) / sessions.length);
    const avgStudents = Math.round(sessions.reduce((s, r) => s + r.avgStudents, 0) / sessions.length);
    const recent = sessions.slice(0, 3);
    const older = sessions.slice(3, 6);
    const recentAvg = recent.length ? recent.reduce((s, r) => s + r.avgConcentration, 0) / recent.length : avgConc;
    const olderAvg = older.length ? older.reduce((s, r) => s + r.avgConcentration, 0) / older.length : avgConc;
    const trend = Math.round(recentAvg - olderAvg);
    return { cls, teacher, avgConc, avgStudents, sessions: sessions.length, trend };
  }).sort((a, b) => b.avgConc - a.avgConc);

  // Time-series data: group sessions by date
  const allDates = [...new Set(SESSION_REPORTS.map(s => s.date))].sort().slice(-14);
  const timelineData = allDates.map(date => {
    const daySessions = SESSION_REPORTS.filter(s => s.date === date);
    const avgConc = daySessions.length
      ? Math.round(daySessions.reduce((s, r) => s + r.avgConcentration, 0) / daySessions.length)
      : 0;
    const avgStudents = daySessions.length
      ? Math.round(daySessions.reduce((s, r) => s + r.avgStudents, 0) / daySessions.length)
      : 0;
    return { date: date.slice(5), avgConc, avgStudents, sessions: daySessions.length };
  });

  // Class comparison chart
  const classCompData = classSummary.map(item => ({
    name: item.cls.name,
    concentration: item.avgConc,
    students: item.avgStudents,
    fill: getConcentrationColor(item.avgConc),
  }));

  // Hour distribution (which hours have low concentration)
  const hourData = Array.from({ length: 11 }, (_, i) => {
    const hour = `${(7 + i).toString().padStart(2, '0')}:00`;
    const sessions = SESSION_REPORTS.filter(s => s.startTime <= hour && s.endTime > hour);
    const avgConc = sessions.length
      ? Math.round(sessions.reduce((s, r) => s + r.avgConcentration, 0) / sessions.length)
      : null;
    return { hour, avgConc, count: sessions.length };
  }).filter(d => d.avgConc !== null);

  const totalSessions = SESSION_REPORTS.length;
  const overallAvgConc = Math.round(SESSION_REPORTS.reduce((s, r) => s + r.avgConcentration, 0) / totalSessions);
  const overallAvgStudents = Math.round(SESSION_REPORTS.reduce((s, r) => s + r.avgStudents, 0) / totalSessions);
  const lowConcSessions = SESSION_REPORTS.filter(s => s.avgConcentration < 60).length;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Báo cáo & Thống kê</h1>
          <p className="text-sm text-gray-500 mt-0.5">Dữ liệu tổng hợp 2 tuần gần nhất</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Download size={15} />
          Xuất báo cáo
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng buổi học', value: totalSessions, sub: 'Trong 2 tuần qua', color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Tập trung trung bình', value: `${overallAvgConc}%`, sub: getConcentrationBg(overallAvgConc).includes('green') ? 'Mức tốt' : 'Cần cải thiện', color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Sĩ số trung bình', value: `${overallAvgStudents} HS`, sub: 'Mỗi buổi học', color: 'text-indigo-700', bg: 'bg-indigo-50' },
          { label: 'Buổi tập trung thấp', value: lowConcSessions, sub: 'Dưới 60% tập trung', color: 'text-red-700', bg: 'bg-red-50' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
              <BarChart2 size={18} className={item.color} />
            </div>
            <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-sm text-gray-600 mt-0.5">{item.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {[
            { key: 'overview', label: 'Tổng quan' },
            { key: 'byClass', label: 'Theo lớp' },
            { key: 'weekly', label: 'Theo ngày' },
            { key: 'monthly', label: 'Khung giờ' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
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
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Trend over time */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Xu hướng tập trung theo ngày</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={timelineData}>
                      <defs>
                        <linearGradient id="overallGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={2} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, 'Tập trung TB']} />
                      <Area type="monotone" dataKey="avgConc" stroke="#3b82f6" fill="url(#overallGrad)" strokeWidth={2} dot={{ fill: '#3b82f6', r: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Attendance trend */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Sĩ số trung bình theo ngày</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={2} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [v, 'Học sinh TB']} />
                      <Bar dataKey="avgStudents" radius={[3, 3, 0, 0]} fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Class ranking */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Xếp hạng tập trung theo lớp</h3>
                <div className="space-y-2">
                  {classSummary.map((item, idx) => (
                    <div key={item.cls.id} className="flex items-center gap-4 bg-gray-50 rounded-lg px-4 py-3 hover:bg-gray-100 transition-colors">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                        idx === 1 ? 'bg-gray-300 text-gray-700' :
                        idx === 2 ? 'bg-amber-600 text-white' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800 text-sm">{item.cls.name}</span>
                          <span className="text-xs text-gray-400">· {item.teacher?.name}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${item.avgConc}%`, backgroundColor: getConcentrationColor(item.avgConc) }}
                            />
                          </div>
                          <span className="text-xs font-medium w-8 text-right" style={{ color: getConcentrationColor(item.avgConc) }}>
                            {item.avgConc}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-medium text-gray-700">{item.avgStudents} HS</div>
                        <div className={`flex items-center gap-0.5 text-xs justify-end ${item.trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {item.trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {Math.abs(item.trend)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BY CLASS TAB */}
          {activeTab === 'byClass' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Filter size={15} className="text-gray-400" />
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="all">Tất cả lớp</option>
                  {CLASSES.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Comparison bar chart */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">So sánh mức tập trung trung bình</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={classCompData} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, 'Tập trung TB']} />
                    <Bar dataKey="concentration" radius={[0, 4, 4, 0]}>
                      {classCompData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detailed table */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Bảng tổng hợp theo lớp</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border border-gray-100 rounded-lg">
                        <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Lớp</th>
                        <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Giáo viên</th>
                        <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Số buổi</th>
                        <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Sĩ số TB</th>
                        <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Tập trung TB</th>
                        <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Xu hướng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classSummary.map(item => (
                        <tr key={item.cls.id} className="border-t border-gray-50 hover:bg-gray-50/70">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">{item.cls.name}</div>
                            <div className="text-xs text-gray-400">{item.cls.subject}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{item.teacher?.name}</td>
                          <td className="px-4 py-3 text-gray-700 font-medium">{item.sessions}</td>
                          <td className="px-4 py-3 text-gray-700">{item.avgStudents} HS</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getConcentrationBg(item.avgConc)}`}>
                              {item.avgConc}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`flex items-center gap-1 text-xs ${item.trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {item.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              {item.trend >= 0 ? '+' : ''}{item.trend}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* WEEKLY/DAILY TAB */}
          {activeTab === 'weekly' && (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Mức tập trung theo ngày</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={1} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, 'Tập trung TB']} />
                      <Line type="monotone" dataKey="avgConc" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Số buổi học mỗi ngày</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={1} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [v, 'Số buổi']} />
                      <Bar dataKey="sessions" radius={[3, 3, 0, 0]} fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Session list */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Danh sách buổi học gần đây</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Lớp</th>
                        <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Ngày</th>
                        <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Thời gian</th>
                        <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Sĩ số TB</th>
                        <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Tập trung</th>
                        <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Thấp lúc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SESSION_REPORTS.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map(s => {
                        const cls = CLASSES.find(c => c.id === s.classId);
                        return (
                          <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/70">
                            <td className="px-4 py-3">
                              <span className="font-medium text-gray-800">{cls?.name}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{s.date}</td>
                            <td className="px-4 py-3 text-gray-600">{s.startTime}–{s.endTime}</td>
                            <td className="px-4 py-3 text-gray-700">{s.avgStudents} HS</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getConcentrationBg(s.avgConcentration)}`}>
                                {s.avgConcentration}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{s.lowConcentrationTime}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* HOUR TAB */}
          {activeTab === 'monthly' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">Mức tập trung theo khung giờ</h3>
                <p className="text-xs text-gray-400 mb-3">Khung giờ nào học sinh học tập hiệu quả nhất</p>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={hourData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, 'Tập trung TB']} />
                    <Bar dataKey="avgConc" radius={[4, 4, 0, 0]}>
                      {hourData.map((d, i) => (
                        <Cell key={i} fill={getConcentrationColor(d.avgConc ?? 0)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Insights */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                    <TrendingUp size={15} /> Khung giờ hiệu quả nhất
                  </div>
                  {hourData.length > 0 && (() => {
                    const best = hourData.reduce((b, d) => (d.avgConc ?? 0) > (b.avgConc ?? 0) ? d : b);
                    return (
                      <div>
                        <div className="text-2xl font-bold text-green-700">{best.hour}</div>
                        <div className="text-sm text-green-600">{best.avgConc}% tập trung trung bình</div>
                      </div>
                    );
                  })()}
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="font-semibold text-amber-700 mb-2 flex items-center gap-2">
                    <TrendingDown size={15} /> Khung giờ tập trung kém nhất
                  </div>
                  {hourData.length > 0 && (() => {
                    const worst = hourData.filter(d => d.count > 0).reduce((b, d) => (d.avgConc ?? 100) < (b.avgConc ?? 100) ? d : b);
                    return (
                      <div>
                        <div className="text-2xl font-bold text-amber-700">{worst.hour}</div>
                        <div className="text-sm text-amber-600">{worst.avgConc}% tập trung trung bình</div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Monthly summary */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Lớp duy trì tập trung tốt nhất</h3>
                <div className="space-y-2">
                  {classSummary.slice(0, 3).map((item, idx) => (
                    <div key={item.cls.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                      <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                        idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-700' : 'bg-amber-500 text-white'
                      }`}>{idx + 1}</span>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-800">{item.cls.name}</span>
                        <span className="text-xs text-gray-400 ml-2">· {item.teacher?.name}</span>
                      </div>
                      <span className={`text-sm font-bold ${getConcentrationColor(item.avgConc) === '#16a34a' ? 'text-green-700' : getConcentrationColor(item.avgConc) === '#d97706' ? 'text-amber-700' : 'text-red-700'}`}>
                        {item.avgConc}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
