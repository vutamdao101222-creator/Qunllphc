import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  CLASSES, LIVE_DATA, TEACHERS, ROOMS,
  getTeacher, getRoom, getConcentrationColor, getConcentrationLabel,
  getAlertLabel, getAlertStyle
} from '../data/mockData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell
} from 'recharts';
import {
  Users, BookOpen, TrendingUp, AlertTriangle, Activity,
  ArrowRight, Clock, Eye, ChevronRight
} from 'lucide-react';

function StatCard({
  title, value, sub, icon, color, bg
}: {
  title: string; value: string | number; sub: string;
  icon: React.ReactNode; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ConcentrationBar({ value }: { value: number }) {
  const color = value >= 80 ? '#16a34a' : value >= 60 ? '#d97706' : '#dc2626';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right" style={{ color }}>
        {value}%
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const activeClasses = LIVE_DATA.filter(l => l.isActive);
  const totalStudents = activeClasses.reduce((s, l) => s + l.currentStudents, 0);
  const avgConcentration = activeClasses.length
    ? Math.round(activeClasses.reduce((s, l) => s + l.concentrationLevel, 0) / activeClasses.length)
    : 0;

  const topClass = activeClasses.reduce((best, l) =>
    l.concentrationLevel > (best?.concentrationLevel ?? 0) ? l : best, activeClasses[0]);
  const alertClasses = activeClasses.filter(l => l.alertStatus !== 'normal');

  const topClassInfo = topClass ? CLASSES.find(c => c.id === topClass.classId) : null;
  const firstAlertInfo = alertClasses[0] ? CLASSES.find(c => c.id === alertClasses[0].classId) : null;

  // Chart data
  const chartData = LIVE_DATA.filter(l => l.isActive).map(l => {
    const cls = CLASSES.find(c => c.id === l.classId);
    return {
      name: cls?.name ?? l.classId,
      students: l.currentStudents,
      expected: cls?.expectedStudents ?? 0,
      concentration: l.concentrationLevel,
    };
  });

  // Room status
  const roomStatus = ROOMS.map(room => {
    const cls = CLASSES.find(c => c.roomId === room.id);
    const live = cls ? LIVE_DATA.find(l => l.classId === cls.id && l.isActive) : null;
    return { ...room, classInfo: cls, live };
  });

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Tổng quan hệ thống</h1>
          <p className="text-sm text-gray-500 mt-0.5">Thứ Tư, 08/04/2026 · Cập nhật mỗi 15 giây</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-700 font-medium">Hệ thống hoạt động</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Lớp đang học"
          value={`${activeClasses.length}/${CLASSES.length}`}
          sub={`${CLASSES.length - activeClasses.length} lớp nghỉ`}
          icon={<BookOpen size={20} className="text-blue-600" />}
          color="text-blue-700"
          bg="bg-blue-50"
        />
        <StatCard
          title="Tổng số học sinh"
          value={totalStudents}
          sub={`Hiện diện trong phòng`}
          icon={<Users size={20} className="text-indigo-600" />}
          color="text-indigo-700"
          bg="bg-indigo-50"
        />
        <StatCard
          title="Lớp tập trung cao nhất"
          value={topClassInfo?.name ?? '–'}
          sub={`Đạt ${topClass?.concentrationLevel ?? 0}% tập trung`}
          icon={<TrendingUp size={20} className="text-green-600" />}
          color="text-green-700"
          bg="bg-green-50"
        />
        <StatCard
          title="Lớp cần chú ý"
          value={alertClasses.length > 0 ? (firstAlertInfo?.name ?? '–') : 'Không có'}
          sub={alertClasses.length > 0 ? getAlertLabel(alertClasses[0].alertStatus) : 'Tất cả ổn định'}
          icon={<AlertTriangle size={20} className={alertClasses.length > 0 ? 'text-red-600' : 'text-gray-400'} />}
          color={alertClasses.length > 0 ? 'text-red-600' : 'text-gray-600'}
          bg={alertClasses.length > 0 ? 'bg-red-50' : 'bg-gray-50'}
        />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Concentration Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-gray-800 font-semibold">Mức tập trung theo lớp</h3>
              <p className="text-xs text-gray-400 mt-0.5">Hiện tại đang học</p>
            </div>
            <Link to="/monitor" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              Xem chi tiết <ArrowRight size={12} />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(v: number) => [`${v}%`, 'Tập trung']}
              />
              <Bar dataKey="concentration" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={getConcentrationColor(d.concentration)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Room status */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-800 font-semibold">Trạng thái phòng học</h3>
            <span className="text-xs text-gray-400">{roomStatus.filter(r => r.live).length}/{ROOMS.length} đang dùng</span>
          </div>
          <div className="space-y-3">
            {roomStatus.map(room => (
              <div key={room.id} className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${
                room.live ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${room.live ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium text-gray-700">{room.name}</span>
                </div>
                <div className="text-right">
                  {room.live ? (
                    <div>
                      <span className="text-sm font-semibold text-blue-700">{room.live.currentStudents}</span>
                      <span className="text-xs text-gray-400"> người</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Trống</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Classes Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-gray-800 font-semibold">Danh sách lớp đang học</h3>
          <Link to="/monitor" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
            Theo dõi thực tế <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Lớp học</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Giáo viên</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Phòng</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Sĩ số</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 w-44">Mức tập trung</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {LIVE_DATA.filter(l => l.isActive).map(live => {
                const cls = CLASSES.find(c => c.id === live.classId);
                const teacher = cls ? getTeacher(cls.teacherId) : null;
                const room = cls ? getRoom(cls.roomId) : null;
                if (!cls) return null;
                return (
                  <tr key={live.classId} className="border-t border-gray-50 hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-800 text-sm">{cls.name}</div>
                      <div className="text-xs text-gray-400">{cls.subject}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                          {teacher?.avatar.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-700">{teacher?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{room?.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-800">{live.currentStudents}</span>
                      <span className="text-xs text-gray-400">/{cls.expectedStudents}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ConcentrationBar value={live.concentrationLevel} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${getAlertStyle(live.alertStatus)}`}>
                        {live.alertStatus !== 'normal' && <AlertTriangle size={10} />}
                        {getAlertLabel(live.alertStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/monitor/${cls.id}`}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Eye size={14} />
                        Theo dõi
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts */}
      {alertClasses.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-gray-800 font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Cảnh báo hiện tại
          </h3>
          <div className="space-y-3">
            {alertClasses.map(l => {
              const cls = CLASSES.find(c => c.id === l.classId);
              const room = cls ? getRoom(cls.roomId) : null;
              return (
                <div key={l.classId} className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
                  l.alertStatus === 'low_attendance' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div>
                    <span className={`font-medium text-sm ${l.alertStatus === 'low_attendance' ? 'text-red-700' : 'text-amber-700'}`}>
                      {cls?.name}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">· {room?.name}</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {l.alertStatus === 'low_concentration'
                        ? `Mức tập trung chỉ đạt ${l.concentrationLevel}% — cần theo dõi thêm`
                        : `Sĩ số chỉ ${l.currentStudents}/${cls?.expectedStudents} — thấp bất thường`
                      }
                    </p>
                  </div>
                  <Link to={`/monitor/${l.classId}`}>
                    <button className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 ${
                      l.alertStatus === 'low_attendance' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700'
                    }`}>
                      Xem <ChevronRight size={12} />
                    </button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
