import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useSchoolData } from '../context/SchoolDataContext';
import { fetchDashboardOverview } from '../lib/api';
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
  const nowLabel = React.useMemo(
    () =>
      new Date().toLocaleString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    []
  );
  const { learningProfiles } = useSchoolData();
  const [remoteOverview, setRemoteOverview] = useState<any | null>(null);
  const [remoteError, setRemoteError] = useState('');

  const useRemoteClasses =
    remoteOverview &&
    Array.isArray(remoteOverview.classes) &&
    remoteOverview.classes.length > 0;

  /** Lớp đang coi là «đang học» theo SQL (BuoiHoc active + chỉ số đúng buổi) */
  const activeClasses = useRemoteClasses
    ? remoteOverview.classes.filter((l: any) => l.isActive)
    : LIVE_DATA.filter((l) => l.isActive);

  const totalStudents =
    remoteOverview != null
      ? Number(remoteOverview.totalStudents) || 0
      : activeClasses.reduce((s: number, l: any) => s + l.currentStudents, 0);

  const avgConcentration =
    remoteOverview != null
      ? Number(remoteOverview.avgConcentration) || 0
      : activeClasses.length
        ? Math.round(
            activeClasses.reduce((s: number, l: any) => s + l.concentrationLevel, 0) / activeClasses.length,
          )
        : 0;

  const totalClassCount = useRemoteClasses ? remoteOverview.totalClasses : CLASSES.length;

  const topClass = activeClasses.length
    ? activeClasses.reduce((best: any, l: any) =>
        (l.concentrationLevel ?? 0) > (best?.concentrationLevel ?? 0) ? l : best, activeClasses[0])
    : null;
  const alertClasses = activeClasses.filter((l: any) => l.alertStatus !== 'normal');

  const topClassInfo = topClass
    ? useRemoteClasses
      ? null
      : CLASSES.find((c) => c.id === (topClass.classId || topClass.maLop))
    : null;
  const topClassLabel = topClass
    ? useRemoteClasses
      ? (topClass.tenLop || topClass.maLop)
      : (topClassInfo?.name ?? topClass.tenLop ?? topClass.maLop)
    : null;

  const firstAlertInfo = alertClasses[0]
    ? useRemoteClasses
      ? null
      : CLASSES.find((c) => c.id === (alertClasses[0].classId || alertClasses[0].maLop))
    : null;
  const firstAlertLabel = alertClasses[0]
    ? useRemoteClasses
      ? (alertClasses[0].tenLop || alertClasses[0].maLop)
      : (firstAlertInfo?.name ?? alertClasses[0].tenLop)
    : null;

  /** Biểu đồ: với API hiển thị toàn bộ lớp từ SQL (kể cả chưa active) để không trống */
  const chartSource = useRemoteClasses ? remoteOverview.classes : activeClasses;
  const chartData = chartSource.map((l: any) => {
    const cls = CLASSES.find((c) => c.id === (l.classId || l.maLop));
    return {
      name: useRemoteClasses ? (l.tenLop || l.maLop) : (cls?.name ?? l.tenLop ?? l.classId ?? l.maLop),
      students: l.currentStudents,
      expected: useRemoteClasses ? (l.siSoDuKien ?? 0) : (cls?.expectedStudents ?? l.siSoDuKien ?? 0),
      concentration: l.concentrationLevel,
    };
  });

  /** Bảng: API = tất cả lớp từ server; không API = chỉ mock đang active */
  const tableRows =
    useRemoteClasses ? remoteOverview.classes : activeClasses;

  /** Trạng thái phòng — chỉ đáng tin khi không dùng API (map id mock c1…); với SQL hiển thị gợi ý */
  const roomStatus = ROOMS.map((room) => {
    const cls = CLASSES.find((c) => c.roomId === room.id);
    const live =
      cls && !useRemoteClasses
        ? activeClasses.find((l: any) => (l.classId || l.maLop) === cls.id && l.isActive)
        : null;
    return { ...room, classInfo: cls, live };
  });

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadOverview = async () => {
      try {
        const data = await fetchDashboardOverview();
        if (mounted) {
          setRemoteOverview(data);
          setRemoteError('');
        }
      } catch (error: any) {
        if (mounted) {
          setRemoteError(error.message ?? 'Khong the tai du lieu API');
        }
      }
    };
    loadOverview();
    const iv = setInterval(loadOverview, 15000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  const riskStudents = learningProfiles.filter(profile =>
    profile.concentrationTrend.length >= 3 &&
    profile.concentrationTrend.slice(-3).every((v, i, arr) => i === 0 || v <= arr[i - 1])
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Tổng quan hệ thống</h1>
          <p className="text-sm text-gray-500 mt-0.5">{nowLabel} · Cập nhật mỗi 15 giây</p>
          {remoteError && (
            <p className="text-xs text-amber-600 mt-1">
              Đang dùng dữ liệu dự phòng do API lỗi: {remoteError}
            </p>
          )}
          {!remoteError && useRemoteClasses && remoteOverview?.usingSnapshotFallback && (
            <p className="text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-2 max-w-3xl leading-relaxed">
              <strong>Chưa có buổi học đang active</strong> trong bảng <code className="text-[11px]">BuoiHoc</code> (hoặc
              chưa có <code className="text-[11px]">ChiSoTapTrung</code> khớp mã buổi). Số liệu thẻ tổng quan và biểu đồ
              đang dùng<strong> chỉ số mới nhất / sĩ số dự kiến</strong> ({remoteOverview.totalClasses} lớp). Để có «đang
              học» thực tế: tạo phiên học{' '}
              <code className="text-[11px]">active</code> hoặc chạy nguồn sinh chỉ số (xem README / đồng bộ thiết bị).
            </p>
          )}
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
          value={`${activeClasses.length}/${totalClassCount}`}
          sub={`${Math.max(0, totalClassCount - activeClasses.length)} lớp không active (SQL)`}
          icon={<BookOpen size={20} className="text-blue-600" />}
          color="text-blue-700"
          bg="bg-blue-50"
        />
        <StatCard
          title="Tổng số học sinh"
          value={totalStudents}
          sub={
            useRemoteClasses
              ? remoteOverview?.usingSnapshotFallback
                ? `Theo chỉ số mới nhất — dự kiến cả khối ~${remoteOverview.totalExpectedStudents ?? '—'} HS`
                : 'Hiện diện (lớp đang học)'
              : 'Hiện diện trong phòng (demo)'
          }
          icon={<Users size={20} className="text-indigo-600" />}
          color="text-indigo-700"
          bg="bg-indigo-50"
        />
        <StatCard
          title="Lớp tập trung cao nhất"
          value={topClassLabel ?? '–'}
          sub={`Đạt ${topClass?.concentrationLevel ?? 0}% tập trung`}
          icon={<TrendingUp size={20} className="text-green-600" />}
          color="text-green-700"
          bg="bg-green-50"
        />
        <StatCard
          title="Lớp cần chú ý"
          value={alertClasses.length > 0 ? (firstAlertLabel ?? '–') : 'Không có'}
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
              <p className="text-xs text-gray-400 mt-0.5">
                {useRemoteClasses
                  ? remoteOverview?.usingSnapshotFallback
                    ? 'Tất cả lớp SQL — chỉ số snapshot mới nhất (không có buổi active)'
                    : 'Lớp đang học — theo realtime SQL'
                  : 'Hiện tại đang học (demo)'}
              </p>
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
            {!useRemoteClasses ? (
              <span className="text-xs text-gray-400">{roomStatus.filter((r) => r.live).length}/{ROOMS.length} đang dùng</span>
            ) : (
              <span className="text-xs text-gray-400">Demo (map c1…)</span>
            )}
          </div>
          {useRemoteClasses && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-3">
              Phòng học chưa liên kết với lớp trong SQL; khi dùng API hãy xem bảng lớp bên dưới.
            </p>
          )}
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
          <div>
            <h3 className="text-gray-800 font-semibold">
              {useRemoteClasses ? 'Danh sách lớp (dữ liệu SQL)' : 'Danh sách lớp đang học'}
            </h3>
            {useRemoteClasses && (
              <p className="text-[11px] text-gray-500 mt-1">
                Mã hiển thị là <strong>MãLớp</strong> trong database (khác id demo c1, c2…).
              </p>
            )}
          </div>
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
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-500">
                    {useRemoteClasses
                      ? 'Không có bản ghi LopHoc trên máy chủ.'
                      : 'Không có lớp đang học trong bản demo hiện tại.'}
                  </td>
                </tr>
              ) : (
                tableRows.map((live: any) => {
                  if (useRemoteClasses) {
                    const initial = String(live.tenGiaoVien || live.maLop || '?').charAt(0);
                    return (
                      <tr key={live.maLop} className="border-t border-gray-50 hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-800 text-sm">{live.tenLop || live.maLop}</div>
                          <div className="text-xs text-gray-400">{live.monHoc ?? '—'}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{live.maLop}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold uppercase">
                              {initial}
                            </div>
                            <span className="text-sm text-gray-700">{live.tenGiaoVien ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">—</td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-800">{live.currentStudents ?? 0}</span>
                          <span className="text-xs text-gray-400">
                            /{live.siSoDuKien != null ? live.siSoDuKien : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ConcentrationBar value={Number(live.concentrationLevel) || 0} />
                        </td>
                        <td className="px-4 py-3 space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${getAlertStyle(live.alertStatus)}`}
                          >
                            {live.alertStatus !== 'normal' && <AlertTriangle size={10} />}
                            {getAlertLabel(live.alertStatus)}
                          </span>
                          <span
                            className={`block text-[10px] px-1.5 py-0.5 rounded w-fit ${live.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                          >
                            {live.isActive ? 'Buổi active + chỉ số' : 'Chưa active / chỉ snapshot'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/classes/${encodeURIComponent(live.maLop)}`}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <Eye size={14} />
                            Chi tiết
                          </Link>
                        </td>
                      </tr>
                    );
                  }
                  const cls = CLASSES.find((c) => c.id === (live.classId || live.maLop));
                  const teacher = cls ? getTeacher(cls.teacherId) : null;
                  const room = cls ? getRoom(cls.roomId) : null;
                  if (!cls) return null;
                  return (
                    <tr
                      key={live.classId || live.maLop}
                      className="border-t border-gray-50 hover:bg-gray-50/70 transition-colors"
                    >
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
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${getAlertStyle(live.alertStatus)}`}
                        >
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
                })
              )}
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
            {alertClasses.map((l: any) => {
              const cls = useRemoteClasses ? null : CLASSES.find((c) => c.id === (l.classId || l.maLop));
              const room = cls ? getRoom(cls.roomId) : null;
              const title = useRemoteClasses ? (l.tenLop || l.maLop) : cls?.name;
              const exp = useRemoteClasses ? l.siSoDuKien : cls?.expectedStudents;
              return (
                <div key={l.classId || l.maLop} className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
                  l.alertStatus === 'low_attendance' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div>
                    <span className={`font-medium text-sm ${l.alertStatus === 'low_attendance' ? 'text-red-700' : 'text-amber-700'}`}>
                      {title}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">· {room?.name ?? 'Phòng (SQL chưa map)'}</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {l.alertStatus === 'low_concentration'
                        ? `Mức tập trung chỉ đạt ${l.concentrationLevel}% — cần theo dõi thêm`
                        : `Sĩ số chỉ ${l.currentStudents}/${exp ?? '—'} — thấp bất thường`
                      }
                    </p>
                  </div>
                  <Link to={useRemoteClasses ? `/monitor` : `/monitor/${l.classId || l.maLop}`}>
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-gray-800 font-semibold mb-3">Phân tích lớp học thông minh</h3>
        {riskStudents.length === 0 ? (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            Không có học sinh tụt tập trung liên tiếp trong 3 buổi gần nhất.
          </p>
        ) : (
          <div className="space-y-2">
            {riskStudents.map(item => (
              <div key={item.studentId} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="text-sm text-red-700">Học sinh {item.studentId} đang có xu hướng giảm tập trung</span>
                <Link to="/classes/c1" className="text-xs text-blue-600 hover:underline">Xem can thiệp</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
