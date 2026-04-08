import React, { useState } from 'react';
import {
  CLASSES, LIVE_DATA, NOTIFICATIONS, SESSION_REPORTS,
  getTeacher, getRoom, getConcentrationBg, getConcentrationLabel,
  getAlertLabel, getAlertStyle, DAY_NAMES_FULL
} from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  BookOpen, CalendarDays, Bell, Activity, Clock,
  Users, TrendingUp, Info, CheckCircle, AlertTriangle
} from 'lucide-react';

export default function ParentPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'reports' | 'notifications'>('overview');

  // Parent sees all classes (or their child's classes in production)
  const parentClassIds = user?.parentClassIds ?? ['c1', 'c4'];
  const myClasses = CLASSES.filter(c => parentClassIds.includes(c.id));
  const notifications = NOTIFICATIONS.filter(n =>
    !n.classId || parentClassIds.includes(n.classId)
  );

  const unreadCount = notifications.filter(n => n.type === 'alert' || n.type === 'warning').length;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-white">Xin chào, {user?.name}!</h1>
            <p className="text-blue-100 text-sm mt-1">Theo dõi thông tin lớp học của con bạn</p>
          </div>
          <div className="text-right">
            <div className="text-blue-100 text-xs">Thứ Tư, 08/04/2026</div>
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
            { label: 'Buổi học tuần này', value: myClasses.reduce((s, c) => s + c.schedules.length, 0), icon: '📅' },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 rounded-xl p-3">
              <div className="text-lg">{item.icon}</div>
              <div className="text-xl font-bold mt-1">{item.value}</div>
              <div className="text-xs text-blue-200 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { key: 'overview', label: 'Tổng quan', icon: <Activity size={14} /> },
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
                      <div className="font-semibold text-gray-800">{cls.schedules.length} buổi</div>
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

      {/* SCHEDULE TAB */}
      {activeTab === 'schedule' && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Info size={15} />
              <span className="text-sm font-medium">Lịch học tuần 06/04 – 12/04/2026</span>
            </div>
            <p className="text-xs text-blue-600">Lịch học có thể thay đổi. Vui lòng liên hệ giáo viên để xác nhận.</p>
          </div>

          {['Thứ 2 (06/04)', 'Thứ 3 (07/04)', 'Thứ 4 (08/04)', 'Thứ 5 (09/04)', 'Thứ 6 (10/04)', 'Thứ 7 (11/04)'].map((dayLabel, di) => {
            const jsDay = di + 1; // Mon=1...Sat=6
            const dow = jsDay === 0 ? 1 : jsDay + 1; // our dayOfWeek
            const dayClasses = myClasses.filter(c => c.schedules.some(s => s.dayOfWeek === dow));

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
                      const sched = cls.schedules.find(s => s.dayOfWeek === dow);
                      const teacher = getTeacher(cls.teacherId);
                      const room = getRoom(cls.roomId);
                      const live = di === 2 ? LIVE_DATA.find(l => l.classId === cls.id) : null;
                      return (
                        <div key={cls.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800">{cls.name}</span>
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
