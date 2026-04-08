import React, { useState } from 'react';
import { Link } from 'react-router';
import { CLASSES, LIVE_DATA, getTeacher, getRoom, DAY_NAMES_FULL } from '../data/mockData';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Users, AlertTriangle } from 'lucide-react';

// April 8, 2026 is a Wednesday (dayOfWeek=4 in Vietnamese: Thứ 4)
// Vietnamese: Thứ 2=Mon, Thứ 3=Tue, Thứ 4=Wed, Thứ 5=Thu, Thứ 6=Fri, Thứ 7=Sat, CN=Sun
// dayOfWeek mapping: 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat

const TODAY = new Date(2026, 3, 8); // April 8, 2026

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

// Get classes for a specific dayOfWeek (2=Mon...7=Sat, 1=Sun)
function getClassesForDay(jsDay: number): typeof CLASSES {
  // jsDay: 0=Sun, 1=Mon, 2=Tue, ..., 6=Sat
  // Our dayOfWeek: 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat, 1=Sun
  const dow = jsDay === 0 ? 1 : jsDay + 1;
  return CLASSES.filter(c => c.schedules.some(s => s.dayOfWeek === dow));
}

function getScheduleForDay(cls: typeof CLASSES[0], jsDay: number) {
  const dow = jsDay === 0 ? 1 : jsDay + 1;
  return cls.schedules.find(s => s.dayOfWeek === dow);
}

const HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

const SUBJECT_COLORS: Record<string, string> = {
  'Toán học': 'bg-blue-100 border-blue-300 text-blue-800',
  'Ngữ văn': 'bg-purple-100 border-purple-300 text-purple-800',
  'Vật lý': 'bg-cyan-100 border-cyan-300 text-cyan-800',
  'Hóa học': 'bg-green-100 border-green-300 text-green-800',
  'Sinh học': 'bg-emerald-100 border-emerald-300 text-emerald-800',
  'Tiếng Anh': 'bg-orange-100 border-orange-300 text-orange-800',
};

export default function SchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<'week' | 'list'>('week');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const weekStart = getWeekStart(new Date(TODAY.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000));

  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  }); // Mon to Sat

  const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

  const getClassColor = (cls: typeof CLASSES[0]) => SUBJECT_COLORS[cls.subject] ?? 'bg-gray-100 border-gray-300 text-gray-800';

  const allDayClasses = weekDays.map(d => ({
    date: d,
    classes: getClassesForDay(d.getDay()).map(cls => ({
      cls,
      schedule: getScheduleForDay(cls, d.getDay())!,
      live: LIVE_DATA.find(l => l.classId === cls.id),
      isToday: isSameDay(d, TODAY),
    })),
  }));

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Lịch học</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tuần {weekOffset === 0 ? 'hiện tại' : weekOffset > 0 ? `+${weekOffset}` : weekOffset} ·{' '}
            {formatDate(weekDays[0])} – {formatDate(weekDays[5])}/{weekDays[5].getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1.5 text-sm transition-colors ${view === 'week' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Tuần
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-sm transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Danh sách
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Hôm nay
            </button>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(SUBJECT_COLORS).map(([subj, color]) => (
          <span key={subj} className={`text-xs px-2.5 py-1 rounded-full border ${color}`}>{subj}</span>
        ))}
      </div>

      {/* Week View */}
      {view === 'week' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            <div className="p-3 border-r border-gray-100">
              <span className="text-xs text-gray-400">Giờ</span>
            </div>
            {weekDays.map((d, i) => (
              <div
                key={i}
                className={`p-3 text-center border-r border-gray-100 last:border-r-0 ${
                  isSameDay(d, TODAY) ? 'bg-blue-50' : ''
                }`}
              >
                <div className={`text-xs font-medium ${isSameDay(d, TODAY) ? 'text-blue-600' : 'text-gray-500'}`}>
                  {dayNames[i]}
                </div>
                <div className={`text-sm font-bold mt-0.5 ${
                  isSameDay(d, TODAY)
                    ? 'w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto'
                    : 'text-gray-700'
                }`}>
                  {d.getDate()}
                </div>
                <div className="text-xs text-gray-400">{formatDate(d)}</div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          <div className="overflow-y-auto max-h-[500px]">
            {HOURS.map((hour, hi) => (
              <div key={hour} className="grid grid-cols-7 border-b border-gray-50 min-h-[60px]">
                <div className="p-2 border-r border-gray-100 flex items-start pt-2">
                  <span className="text-xs text-gray-400">{hour}</span>
                </div>
                {weekDays.map((d, di) => {
                  const dayClasses = getClassesForDay(d.getDay());
                  const currentHourStart = parseInt(hour);
                  const matching = dayClasses.filter(cls => {
                    const sched = getScheduleForDay(cls, d.getDay());
                    if (!sched) return false;
                    const startH = parseInt(sched.startTime.split(':')[0]);
                    return startH === currentHourStart;
                  });
                  return (
                    <div
                      key={di}
                      className={`p-1 border-r border-gray-50 last:border-r-0 ${isSameDay(d, TODAY) ? 'bg-blue-50/30' : ''}`}
                    >
                      {matching.map(cls => {
                        const sched = getScheduleForDay(cls, d.getDay())!;
                        const live = LIVE_DATA.find(l => l.classId === cls.id);
                        const isActive = isSameDay(d, TODAY) && live?.isActive;
                        return (
                          <Link key={cls.id} to={`/classes/${cls.id}`}>
                            <div className={`rounded-lg border px-2 py-1.5 mb-1 cursor-pointer hover:opacity-80 transition-opacity ${getClassColor(cls)} ${isActive ? 'ring-2 ring-green-400' : ''}`}>
                              <div className="text-xs font-semibold leading-tight">{cls.name}</div>
                              <div className="text-xs opacity-70 mt-0.5">{sched.startTime}–{sched.endTime}</div>
                              {isActive && (
                                <div className="flex items-center gap-0.5 mt-0.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                  <span className="text-xs text-green-700">Live</span>
                                </div>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-4">
          {allDayClasses.map(({ date, classes }) => (
            <div key={date.toISOString()} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isSameDay(date, TODAY) ? 'border-blue-300' : 'border-gray-200'}`}>
              <div className={`flex items-center justify-between px-5 py-3 border-b ${isSameDay(date, TODAY) ? 'bg-blue-600 border-blue-500' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <CalendarDays size={15} className={isSameDay(date, TODAY) ? 'text-blue-200' : 'text-gray-500'} />
                  <span className={`font-semibold text-sm ${isSameDay(date, TODAY) ? 'text-white' : 'text-gray-700'}`}>
                    {dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1]} · {formatDate(date)}/{date.getFullYear()}
                  </span>
                  {isSameDay(date, TODAY) && (
                    <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">Hôm nay</span>
                  )}
                </div>
                <span className={`text-xs ${isSameDay(date, TODAY) ? 'text-blue-200' : 'text-gray-400'}`}>
                  {classes.length} lớp
                </span>
              </div>
              {classes.length === 0 ? (
                <div className="px-5 py-4 text-sm text-gray-400">Không có lớp học</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {classes.sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime)).map(({ cls, schedule, live, isToday }) => {
                    const teacher = getTeacher(cls.teacherId);
                    const room = getRoom(cls.roomId);
                    const isActive = isToday && live?.isActive;
                    const isLate = isToday && !live?.isActive;
                    return (
                      <div key={cls.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-1 h-12 rounded-full ${SUBJECT_COLORS[cls.subject]?.includes('blue') ? 'bg-blue-400' : SUBJECT_COLORS[cls.subject]?.includes('purple') ? 'bg-purple-400' : SUBJECT_COLORS[cls.subject]?.includes('cyan') ? 'bg-cyan-400' : SUBJECT_COLORS[cls.subject]?.includes('green') ? 'bg-green-400' : SUBJECT_COLORS[cls.subject]?.includes('orange') ? 'bg-orange-400' : 'bg-gray-400'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800 text-sm">{cls.name}</span>
                              {isActive && (
                                <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                  Đang học
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-gray-500">{teacher?.name}</span>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs text-gray-500">{room?.name}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-700">
                              {schedule.startTime} – {schedule.endTime}
                            </div>
                            {isActive && live && (
                              <div className="text-xs text-green-600 mt-0.5">
                                {live.currentStudents}/{cls.expectedStudents} HS · {live.concentrationLevel}% tập trung
                              </div>
                            )}
                          </div>
                          {isActive && (
                            <Link to={`/monitor/${cls.id}`}>
                              <button className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                                Theo dõi
                              </button>
                            </Link>
                          )}
                          {!isActive && (
                            <Link to={`/classes/${cls.id}`}>
                              <button className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                                Chi tiết
                              </button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Today's analysis */}
      {weekOffset === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Phân tích hôm nay (08/04/2026)</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                label: 'Lớp đúng giờ',
                value: LIVE_DATA.filter(l => l.isActive).length,
                color: 'text-green-700', bg: 'bg-green-50 border-green-200',
                desc: 'Đang diễn ra bình thường'
              },
              {
                label: 'Lớp cần chú ý',
                value: LIVE_DATA.filter(l => l.isActive && l.alertStatus !== 'normal').length,
                color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200',
                desc: 'Mức tập trung hoặc sĩ số thấp'
              },
              {
                label: 'Lớp chưa bắt đầu',
                value: CLASSES.length - LIVE_DATA.filter(l => l.isActive).length,
                color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200',
                desc: 'Không có lịch hoặc chưa tới giờ'
              },
            ].map((item, i) => (
              <div key={i} className={`rounded-lg p-4 border ${item.bg}`}>
                <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                <div className={`text-sm font-medium mt-0.5 ${item.color}`}>{item.label}</div>
                <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
