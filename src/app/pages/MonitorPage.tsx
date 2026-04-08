import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import {
  CLASSES, LIVE_DATA, LiveData,
  getTeacher, getRoom, getConcentrationColor, getConcentrationLabel,
  getAlertLabel, getAlertStyle
} from '../data/mockData';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';
import {
  ArrowLeft, Users, Activity, Clock, AlertTriangle,
  Wifi, WifiOff, Video, TrendingUp, TrendingDown
} from 'lucide-react';

// Mini circular concentration indicator
function ConcentrationGauge({ value }: { value: number }) {
  const color = getConcentrationColor(value);
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={80} height={80} className="-rotate-90">
        <circle cx={40} cy={40} r={r} fill="none" stroke="#e5e7eb" strokeWidth={7} />
        <circle
          cx={40} cy={40} r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-base font-bold" style={{ color }}>{value}%</div>
      </div>
    </div>
  );
}

// Live video feed placeholder
function LiveVideoFeed({ className }: { className: string }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString('vi-VN'));
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date().toLocaleTimeString('vi-VN')), 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden relative aspect-video w-full">
      {/* Fake video grid pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid grid-cols-5 grid-rows-4 h-full">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="border border-slate-600" />
          ))}
        </div>
      </div>
      {/* Center silhouette */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-slate-600 text-center">
          <Video size={32} className="mx-auto mb-1 opacity-40" />
          <div className="text-xs opacity-40">Camera trực tiếp</div>
        </div>
      </div>
      {/* LIVE badge */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600 text-white text-xs px-2 py-1 rounded-md font-medium">
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        LIVE
      </div>
      {/* Time */}
      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded font-mono">
        {time}
      </div>
      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <div className="text-white text-xs font-medium truncate">{className}</div>
      </div>
    </div>
  );
}

// Single class monitor card
function ClassMonitorCard({ live }: { live: LiveData }) {
  const cls = CLASSES.find(c => c.id === live.classId);
  const teacher = cls ? getTeacher(cls.teacherId) : null;
  const room = cls ? getRoom(cls.roomId) : null;
  const [currentConc, setCurrentConc] = useState(live.concentrationLevel);
  const [currentStudents, setCurrentStudents] = useState(live.currentStudents);

  // Simulate slight fluctuation
  useEffect(() => {
    const iv = setInterval(() => {
      setCurrentConc(v => Math.max(0, Math.min(100, v + Math.round((Math.random() - 0.5) * 4))));
      setCurrentStudents(v => Math.max(0, Math.min(cls?.expectedStudents ?? 40, v + Math.round((Math.random() - 0.5) * 2))));
    }, 5000);
    return () => clearInterval(iv);
  }, [cls]);

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
      live.alertStatus !== 'normal' ? 'border-amber-300' : 'border-gray-200'
    }`}>
      {live.alertStatus !== 'normal' && (
        <div className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium ${
          live.alertStatus === 'low_attendance' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
        }`}>
          <AlertTriangle size={12} />
          Cảnh báo: {getAlertLabel(live.alertStatus)}
        </div>
      )}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{cls?.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{teacher?.name} · {room?.name}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full border border-green-200">
            <Wifi size={10} />
            <span>Đang học</span>
          </div>
        </div>

        {/* Video */}
        <LiveVideoFeed className={cls?.name ?? ''} />

        {/* Stats */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-center">
            <ConcentrationGauge value={currentConc} />
            <p className="text-xs text-gray-500 mt-1">Tập trung</p>
          </div>
          <div className="flex-1 px-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users size={14} className="text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Sĩ số</div>
                <div className="font-semibold text-gray-800">{currentStudents}/{cls?.expectedStudents}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Clock size={14} className="text-green-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Bắt đầu</div>
                <div className="font-semibold text-gray-800">{live.sessionStart}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mini chart */}
        {live.last30MinConcentration.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Tập trung 30 phút qua</p>
            <ResponsiveContainer width="100%" height={50}>
              <AreaChart data={live.last30MinConcentration}>
                <defs>
                  <linearGradient id={`grad-${live.classId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getConcentrationColor(currentConc)} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={getConcentrationColor(currentConc)} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone" dataKey="value"
                  stroke={getConcentrationColor(currentConc)}
                  fill={`url(#grad-${live.classId})`}
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <Link to={`/monitor/${live.classId}`}>
          <button className="w-full mt-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors">
            Xem chi tiết →
          </button>
        </Link>
      </div>
    </div>
  );
}

// ===== DETAIL VIEW =====
function MonitorDetail({ classId }: { classId: string }) {
  const navigate = useNavigate();
  const cls = CLASSES.find(c => c.id === classId);
  const live = LIVE_DATA.find(l => l.classId === classId);
  const teacher = cls ? getTeacher(cls.teacherId) : null;
  const room = cls ? getRoom(cls.roomId) : null;

  const [concentration, setConcentration] = useState(live?.concentrationLevel ?? 0);
  const [students, setStudents] = useState(live?.currentStudents ?? 0);
  const [concHistory, setConcHistory] = useState(live?.last30MinConcentration ?? []);
  const [studHistory, setStudHistory] = useState(live?.last30MinStudents ?? []);

  useEffect(() => {
    const iv = setInterval(() => {
      const newConc = Math.max(0, Math.min(100, concentration + Math.round((Math.random() - 0.5) * 6)));
      const newStud = Math.max(0, Math.min(cls?.expectedStudents ?? 40, students + Math.round((Math.random() - 0.5) * 2)));
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setConcentration(newConc);
      setStudents(newStud);
      setConcHistory(h => [...h.slice(-14), { time: timeStr, value: newConc }]);
      setStudHistory(h => [...h.slice(-14), { time: timeStr, value: newStud }]);
    }, 5000);
    return () => clearInterval(iv);
  }, [concentration, students]);

  if (!cls || !live) return (
    <div className="p-6 text-gray-500 text-center">Không tìm thấy thông tin lớp học.</div>
  );

  const alertStatus = concentration < 60 ? 'low_concentration' : students < (cls.expectedStudents * 0.6) ? 'low_attendance' : 'normal';

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/monitor')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={16} /> Quay lại
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-gray-900">{cls.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getAlertStyle(alertStatus)}`}>
              {alertStatus !== 'normal' && <AlertTriangle size={10} className="inline mr-1" />}
              {getAlertLabel(alertStatus)}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {teacher?.name} · {room?.name} · Bắt đầu {live.sessionStart}
          </p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Học sinh hiện diện', value: `${students}/${cls.expectedStudents}`, icon: <Users size={18} className="text-blue-600" />, bg: 'bg-blue-50' },
          { label: 'Mức tập trung', value: `${concentration}%`, icon: <Activity size={18} className="text-green-600" />, bg: 'bg-green-50' },
          { label: 'Tỷ lệ tham dự', value: `${Math.round(students / cls.expectedStudents * 100)}%`, icon: <TrendingUp size={18} className="text-indigo-600" />, bg: 'bg-indigo-50' },
          { label: 'Trạng thái lớp', value: getAlertLabel(alertStatus), icon: <AlertTriangle size={18} className={alertStatus !== 'normal' ? 'text-amber-600' : 'text-gray-400'} />, bg: alertStatus !== 'normal' ? 'bg-amber-50' : 'bg-gray-50' },
        ].map((m, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center`}>{m.icon}</div>
              <p className="text-xs text-gray-500">{m.label}</p>
            </div>
            <p className="font-bold text-gray-900 text-lg">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Video + Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Camera trực tiếp</h3>
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Trực tiếp
            </div>
          </div>
          <LiveVideoFeed className={cls.name} />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <ConcentrationGauge value={concentration} />
              <p className="text-xs text-gray-500 mt-1">Tập trung hiện tại</p>
            </div>
            <div className="flex flex-col justify-center gap-2">
              <div className="flex items-center justify-between bg-blue-50 rounded-lg p-2">
                <span className="text-xs text-gray-600">Sĩ số</span>
                <span className="font-bold text-blue-700">{students}</span>
              </div>
              <div className="flex items-center justify-between bg-green-50 rounded-lg p-2">
                <span className="text-xs text-gray-600">Dự kiến</span>
                <span className="font-bold text-green-700">{cls.expectedStudents}</span>
              </div>
              <div className="flex items-center justify-between bg-amber-50 rounded-lg p-2">
                <span className="text-xs text-gray-600">Vắng</span>
                <span className="font-bold text-amber-700">{Math.max(0, cls.expectedStudents - students)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Concentration chart */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Mức tập trung theo thời gian</h3>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={concHistory}>
                <defs>
                  <linearGradient id="concGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, 'Tập trung']} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#concGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Students chart */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Số học sinh theo thời gian</h3>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={studHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis domain={[0, cls.expectedStudents + 5]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [v, 'Học sinh']} />
                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className={`rounded-xl p-4 border ${
        alertStatus === 'normal' ? 'bg-green-50 border-green-200' :
        alertStatus === 'low_concentration' ? 'bg-amber-50 border-amber-200' :
        'bg-red-50 border-red-200'
      }`}>
        <p className={`text-sm ${
          alertStatus === 'normal' ? 'text-green-800' :
          alertStatus === 'low_concentration' ? 'text-amber-800' : 'text-red-800'
        }`}>
          <strong>Tóm tắt:</strong> Lớp {cls.name} hiện có {students} người trong phòng, mức độ tập trung hiện tại là {concentration}%,
          trạng thái lớp {getAlertLabel(alertStatus).toLowerCase()}.
          {alertStatus === 'low_concentration' && ' Cần theo dõi thêm và có thể điều chỉnh phương pháp giảng dạy.'}
          {alertStatus === 'low_attendance' && ' Sĩ số thấp hơn bình thường, cần kiểm tra nguyên nhân.'}
        </p>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function MonitorPage() {
  const { classId } = useParams<{ classId: string }>();

  if (classId) return <MonitorDetail classId={classId} />;

  const activeClasses = LIVE_DATA.filter(l => l.isActive);
  const [filter, setFilter] = useState<'all' | 'alert'>('all');

  const displayed = filter === 'alert'
    ? activeClasses.filter(l => l.alertStatus !== 'normal')
    : activeClasses;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Theo dõi thời gian thực</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeClasses.length} lớp đang học · Cập nhật liên tục
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              filter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Tất cả ({activeClasses.length})
          </button>
          <button
            onClick={() => setFilter('alert')}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              filter === 'alert' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Cần chú ý ({activeClasses.filter(l => l.alertStatus !== 'normal').length})
          </button>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Activity size={40} className="mx-auto mb-3 opacity-30" />
          <p>Không có lớp nào {filter === 'alert' ? 'cần chú ý' : 'đang học'}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {displayed.map(live => (
            <ClassMonitorCard key={live.classId} live={live} />
          ))}
        </div>
      )}
    </div>
  );
}
