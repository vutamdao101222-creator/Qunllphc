export type UserRole = 'admin' | 'teacher' | 'parent';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  username: string;
  password: string;
  teacherId?: string;
  parentClassIds?: string[];
  parentStudentIds?: string[];
}

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  email: string;
  phone: string;
  classIds: string[];
  avatar: string;
}

export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  floor: number;
}

export interface ScheduleSlot {
  dayOfWeek: number; // 2=Mon...7=Sat (Vietnamese)
  startTime: string;
  endTime: string;
}

export interface ClassInfo {
  id: string;
  code: string;
  name: string;
  subject: string;
  teacherId: string;
  roomId: string;
  schedules: ScheduleSlot[];
  expectedStudents: number;
  grade: string;
}

export interface LiveData {
  classId: string;
  isActive: boolean;
  currentStudents: number;
  concentrationLevel: number;
  sessionStart: string;
  alertStatus: 'normal' | 'low_concentration' | 'low_attendance' | 'late_start';
  last30MinConcentration: { time: string; value: number }[];
  last30MinStudents: { time: string; value: number }[];
}

export interface SessionReport {
  id: string;
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
  avgStudents: number;
  peakStudents: number;
  minStudents: number;
  avgConcentration: number;
  peakConcentrationTime: string;
  lowConcentrationTime: string;
  duration: number;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  date: string;
  time: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  classId?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  classId: string;
  parentUserId: string;
}

export interface StudentDailyStatus {
  studentId: string;
  date: string;
  attendance: 'present' | 'late' | 'absent';
  checkInTime?: string;
  concentrationScore: number;
  participationScore: number;
  behavior: 'good' | 'normal' | 'needs_attention';
  note: string;
}

export interface FeedbackReply {
  id: string;
  fromRole: 'teacher' | 'parent';
  authorName: string;
  date: string;
  content: string;
}

export interface TeacherFeedback {
  id: string;
  studentId: string;
  classId: string;
  teacherId: string;
  date: string;
  category: 'praise' | 'reminder' | 'discipline';
  title: string;
  content: string;
  readByParent: boolean;
  replyRequested: boolean;
  replies: FeedbackReply[];
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueDate: string;
  assignedDate: string;
  target: 'class' | 'group' | 'student';
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt?: string;
  status: 'submitted' | 'pending' | 'late';
}

export interface LearningProfile {
  studentId: string;
  weekLabels: string[];
  concentrationTrend: number[];
  participationTrend: number[];
  completionTrend: number[];
  strengths: string[];
  weaknesses: string[];
  suggestedIntervention: string;
}

// ============================
// USERS
// ============================
export const USERS: User[] = [
  {
    id: 'u1',
    name: 'Nguyễn Quản Trị',
    role: 'admin',
    email: 'admin@edu.vn',
    username: 'admin',
    password: 'admin123',
  },
  {
    id: 'u2',
    name: 'Nguyễn Văn An',
    role: 'teacher',
    email: 'nvan@edu.vn',
    username: 'gv.nguyenan',
    password: 'teacher123',
    teacherId: 't1',
  },
  {
    id: 'u3',
    name: 'Trần Thị Bình',
    role: 'teacher',
    email: 'ttbinh@edu.vn',
    username: 'gv.tranbinh',
    password: 'teacher123',
    teacherId: 't2',
  },
  {
    id: 'u4',
    name: 'Phụ Huynh A',
    role: 'parent',
    email: 'phuhuynha@gmail.com',
    username: 'phuhuynha',
    password: 'parent123',
    parentClassIds: ['c1', 'c4'],
    parentStudentIds: ['st1', 'st2'],
  },
];

// ============================
// TEACHERS
// ============================
export const TEACHERS: Teacher[] = [
  {
    id: 't1',
    name: 'Nguyễn Văn An',
    subject: 'Toán học',
    email: 'nvan@edu.vn',
    phone: '0912 345 678',
    classIds: ['c1', 'c4'],
    avatar: 'NVA',
  },
  {
    id: 't2',
    name: 'Trần Thị Bình',
    subject: 'Ngữ văn',
    email: 'ttbinh@edu.vn',
    phone: '0923 456 789',
    classIds: ['c2'],
    avatar: 'TTB',
  },
  {
    id: 't3',
    name: 'Lê Văn Cường',
    subject: 'Vật lý',
    email: 'lvcuong@edu.vn',
    phone: '0934 567 890',
    classIds: ['c3'],
    avatar: 'LVC',
  },
  {
    id: 't4',
    name: 'Phạm Thị Dung',
    subject: 'Hóa học',
    email: 'ptdung@edu.vn',
    phone: '0945 678 901',
    classIds: ['c5'],
    avatar: 'PTD',
  },
  {
    id: 't5',
    name: 'Hoàng Văn Em',
    subject: 'Sinh học',
    email: 'hvem@edu.vn',
    phone: '0956 789 012',
    classIds: ['c6'],
    avatar: 'HVE',
  },
  {
    id: 't6',
    name: 'Đỗ Thị Phương',
    subject: 'Tiếng Anh',
    email: 'dtphuong@edu.vn',
    phone: '0967 890 123',
    classIds: ['c7'],
    avatar: 'DTP',
  },
];

// ============================
// ROOMS
// ============================
export const ROOMS: Room[] = [
  { id: 'r1', name: 'Phòng 101', building: 'A', capacity: 40, floor: 1 },
  { id: 'r2', name: 'Phòng 102', building: 'A', capacity: 35, floor: 1 },
  { id: 'r3', name: 'Phòng 103', building: 'A', capacity: 40, floor: 1 },
  { id: 'r4', name: 'Phòng 201', building: 'A', capacity: 38, floor: 2 },
  { id: 'r5', name: 'Phòng 202', building: 'B', capacity: 35, floor: 2 },
  { id: 'r6', name: 'Phòng 203', building: 'B', capacity: 40, floor: 2 },
  { id: 'r7', name: 'Phòng 301', building: 'B', capacity: 32, floor: 3 },
];

// ============================
// CLASSES
// ============================
export const CLASSES: ClassInfo[] = [
  {
    id: 'c1',
    code: 'T10A',
    name: 'Toán 10A',
    subject: 'Toán học',
    teacherId: 't1',
    roomId: 'r1',
    schedules: [
      { dayOfWeek: 2, startTime: '07:00', endTime: '09:00' },
      { dayOfWeek: 4, startTime: '07:00', endTime: '09:00' },
      { dayOfWeek: 6, startTime: '07:00', endTime: '09:00' },
    ],
    expectedStudents: 30,
    grade: '10',
  },
  {
    id: 'c2',
    code: 'V11B',
    name: 'Văn 11B',
    subject: 'Ngữ văn',
    teacherId: 't2',
    roomId: 'r2',
    schedules: [
      { dayOfWeek: 3, startTime: '09:00', endTime: '11:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '11:00' },
    ],
    expectedStudents: 28,
    grade: '11',
  },
  {
    id: 'c3',
    code: 'L12C',
    name: 'Lý 12C',
    subject: 'Vật lý',
    teacherId: 't3',
    roomId: 'r3',
    schedules: [
      { dayOfWeek: 2, startTime: '13:00', endTime: '15:00' },
      { dayOfWeek: 4, startTime: '13:00', endTime: '15:00' },
    ],
    expectedStudents: 32,
    grade: '12',
  },
  {
    id: 'c4',
    code: 'T10B',
    name: 'Toán 10B',
    subject: 'Toán học',
    teacherId: 't1',
    roomId: 'r4',
    schedules: [
      { dayOfWeek: 3, startTime: '07:00', endTime: '09:00' },
      { dayOfWeek: 5, startTime: '07:00', endTime: '09:00' },
      { dayOfWeek: 7, startTime: '07:00', endTime: '09:00' },
    ],
    expectedStudents: 30,
    grade: '10',
  },
  {
    id: 'c5',
    code: 'H11A',
    name: 'Hóa 11A',
    subject: 'Hóa học',
    teacherId: 't4',
    roomId: 'r5',
    schedules: [
      { dayOfWeek: 2, startTime: '09:00', endTime: '11:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '11:00' },
      { dayOfWeek: 6, startTime: '09:00', endTime: '11:00' },
    ],
    expectedStudents: 30,
    grade: '11',
  },
  {
    id: 'c6',
    code: 'S11A',
    name: 'Sinh 11A',
    subject: 'Sinh học',
    teacherId: 't5',
    roomId: 'r6',
    schedules: [
      { dayOfWeek: 3, startTime: '13:00', endTime: '15:00' },
      { dayOfWeek: 5, startTime: '13:00', endTime: '15:00' },
    ],
    expectedStudents: 25,
    grade: '11',
  },
  {
    id: 'c7',
    code: 'A12A',
    name: 'Anh 12A',
    subject: 'Tiếng Anh',
    teacherId: 't6',
    roomId: 'r7',
    schedules: [
      { dayOfWeek: 2, startTime: '15:00', endTime: '17:00' },
      { dayOfWeek: 4, startTime: '15:00', endTime: '17:00' },
      { dayOfWeek: 6, startTime: '15:00', endTime: '17:00' },
    ],
    expectedStudents: 32,
    grade: '12',
  },
];

// ============================
// LIVE DATA (mock "current" data)
// ============================
function generateHistory(base: number, variance: number, points = 15): { time: string; value: number }[] {
  const now = new Date();
  return Array.from({ length: points }, (_, i) => {
    const t = new Date(now.getTime() - (points - 1 - i) * 2 * 60 * 1000);
    const val = Math.max(0, Math.min(100, base + (Math.random() - 0.5) * variance * 2));
    return { time: `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`, value: Math.round(val) };
  });
}

export const LIVE_DATA: LiveData[] = [
  {
    classId: 'c1',
    isActive: true,
    currentStudents: 27,
    concentrationLevel: 78,
    sessionStart: '07:00',
    alertStatus: 'normal',
    last30MinConcentration: generateHistory(78, 8),
    last30MinStudents: generateHistory(27, 2),
  },
  {
    classId: 'c2',
    isActive: true,
    currentStudents: 25,
    concentrationLevel: 82,
    sessionStart: '09:00',
    alertStatus: 'normal',
    last30MinConcentration: generateHistory(82, 6),
    last30MinStudents: generateHistory(25, 1),
  },
  {
    classId: 'c3',
    isActive: true,
    currentStudents: 18,
    concentrationLevel: 54,
    sessionStart: '13:00',
    alertStatus: 'low_concentration',
    last30MinConcentration: generateHistory(54, 12),
    last30MinStudents: generateHistory(18, 3),
  },
  {
    classId: 'c4',
    isActive: false,
    currentStudents: 0,
    concentrationLevel: 0,
    sessionStart: '',
    alertStatus: 'normal',
    last30MinConcentration: [],
    last30MinStudents: [],
  },
  {
    classId: 'c5',
    isActive: true,
    currentStudents: 30,
    concentrationLevel: 90,
    sessionStart: '09:00',
    alertStatus: 'normal',
    last30MinConcentration: generateHistory(90, 5),
    last30MinStudents: generateHistory(30, 0),
  },
  {
    classId: 'c6',
    isActive: true,
    currentStudents: 22,
    concentrationLevel: 71,
    sessionStart: '13:00',
    alertStatus: 'normal',
    last30MinConcentration: generateHistory(71, 9),
    last30MinStudents: generateHistory(22, 2),
  },
  {
    classId: 'c7',
    isActive: true,
    currentStudents: 15,
    concentrationLevel: 45,
    sessionStart: '15:00',
    alertStatus: 'low_attendance',
    last30MinConcentration: generateHistory(45, 15),
    last30MinStudents: generateHistory(15, 4),
  },
];

// ============================
// SESSION REPORTS (past 2 weeks)
// ============================
const classIds = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'];
const sessions: SessionReport[] = [];
let sid = 1;

// Generate 14 days of session data
for (let d = 13; d >= 0; d--) {
  const date = new Date(2026, 3, 8 - d); // April 8, 2026 minus d days
  const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

  classIds.forEach((cid, ci) => {
    if (Math.random() > 0.3) {
      const baseConc = [78, 82, 54, 80, 90, 71, 45][ci];
      const avgStudents = [27, 25, 18, 28, 30, 22, 15][ci];
      const expected = [30, 28, 32, 30, 30, 25, 32][ci];
      const startTimes = ['07:00', '09:00', '13:00', '07:00', '09:00', '13:00', '15:00'];
      const endTimes = ['09:00', '11:00', '15:00', '09:00', '11:00', '15:00', '17:00'];
      sessions.push({
        id: `s${sid++}`,
        classId: cid,
        date: dateStr,
        startTime: startTimes[ci],
        endTime: endTimes[ci],
        avgStudents: Math.round(avgStudents + (Math.random() - 0.5) * 4),
        peakStudents: Math.round(Math.min(expected, avgStudents + Math.random() * 4)),
        minStudents: Math.round(Math.max(0, avgStudents - Math.random() * 5)),
        avgConcentration: Math.round(Math.max(30, Math.min(100, baseConc + (Math.random() - 0.5) * 20))),
        peakConcentrationTime: `${startTimes[ci].split(':')[0]}:${30 + Math.floor(Math.random() * 20)}`,
        lowConcentrationTime: `${(parseInt(startTimes[ci].split(':')[0]) + 1).toString().padStart(2, '0')}:${10 + Math.floor(Math.random() * 30)}`,
        duration: 120,
      });
    }
  });
}

export const SESSION_REPORTS: SessionReport[] = sessions;

// ============================
// NOTIFICATIONS
// ============================
export const NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    title: 'Cảnh báo: Lớp Anh 12A mức tập trung thấp',
    content: 'Lớp Anh 12A (Phòng 301) có mức tập trung chỉ đạt 45%, cần theo dõi thêm.',
    date: '08/04/2026',
    time: '15:30',
    type: 'alert',
    classId: 'c7',
  },
  {
    id: 'n2',
    title: 'Lớp Lý 12C sĩ số thấp bất thường',
    content: 'Lớp Lý 12C (Phòng 103) hiện chỉ có 18/32 học sinh, thấp hơn 40% so với dự kiến.',
    date: '08/04/2026',
    time: '14:15',
    type: 'warning',
    classId: 'c3',
  },
  {
    id: 'n3',
    title: 'Lớp Hóa 11A đạt hiệu quả cao',
    content: 'Lớp Hóa 11A đạt mức tập trung 90% trong buổi học sáng nay. Xuất sắc!',
    date: '08/04/2026',
    time: '11:00',
    type: 'success',
    classId: 'c5',
  },
  {
    id: 'n4',
    title: 'Lịch học tuần tới đã được cập nhật',
    content: 'Lịch học từ ngày 13/04/2026 đến 18/04/2026 đã được cập nhật. Vui lòng kiểm tra.',
    date: '07/04/2026',
    time: '17:00',
    type: 'info',
  },
  {
    id: 'n5',
    title: 'Báo cáo tháng 3 sẵn sàng',
    content: 'Báo cáo thống kê tháng 3/2026 đã được tổng hợp và sẵn sàng để xem.',
    date: '01/04/2026',
    time: '08:00',
    type: 'info',
  },
];

export const STUDENTS: StudentProfile[] = [
  { id: 'st1', name: 'Nguyễn Minh Khôi', classId: 'c1', parentUserId: 'u4' },
  { id: 'st2', name: 'Nguyễn Thu Hà', classId: 'c4', parentUserId: 'u4' },
  { id: 'st3', name: 'Trần Gia Bảo', classId: 'c2', parentUserId: 'u4' },
];

export const STUDENT_DAILY_STATUS: StudentDailyStatus[] = [
  {
    studentId: 'st1',
    date: '08/04/2026',
    attendance: 'present',
    checkInTime: '06:55',
    concentrationScore: 83,
    participationScore: 80,
    behavior: 'good',
    note: 'Tập trung tốt, hoàn thành đầy đủ bài tập trên lớp.',
  },
  {
    studentId: 'st2',
    date: '08/04/2026',
    attendance: 'late',
    checkInTime: '07:10',
    concentrationScore: 62,
    participationScore: 58,
    behavior: 'needs_attention',
    note: 'Đi học muộn 10 phút, cần chủ động phát biểu hơn.',
  },
];

export const TEACHER_FEEDBACKS: TeacherFeedback[] = [
  {
    id: 'tf1',
    studentId: 'st1',
    classId: 'c1',
    teacherId: 't1',
    date: '08/04/2026',
    category: 'praise',
    title: 'Khen ngợi tinh thần học tập',
    content: 'Em chủ động làm bài và hỗ trợ bạn trong hoạt động nhóm.',
    readByParent: false,
    replyRequested: false,
    replies: [],
  },
  {
    id: 'tf2',
    studentId: 'st2',
    classId: 'c4',
    teacherId: 't1',
    date: '08/04/2026',
    category: 'discipline',
    title: 'Nhắc nhở nề nếp',
    content: 'Em nói chuyện riêng trong giờ, cần tập trung hơn để theo kịp bài học.',
    readByParent: false,
    replyRequested: true,
    replies: [],
  },
  {
    id: 'tf3',
    studentId: 'st2',
    classId: 'c4',
    teacherId: 't1',
    date: '07/04/2026',
    category: 'reminder',
    title: 'Nhắc chuẩn bị bài',
    content: 'Em chưa hoàn thành bài tập về nhà, phụ huynh phối hợp nhắc em chuẩn bị đầy đủ.',
    readByParent: true,
    replyRequested: true,
    replies: [
      {
        id: 'r1',
        fromRole: 'parent',
        authorName: 'Phụ Huynh A',
        date: '07/04/2026',
        content: 'Cảm ơn cô, gia đình đã nhắc cháu hoàn thành bài tập đầy đủ.',
      },
    ],
  },
];

export const ASSIGNMENTS: Assignment[] = [
  {
    id: 'as1',
    classId: 'c1',
    title: 'Bài tập hàm số bậc nhất',
    description: 'Hoàn thành bài 12-18 trang 45.',
    dueDate: '09/04/2026',
    assignedDate: '08/04/2026',
    target: 'class',
  },
  {
    id: 'as2',
    classId: 'c4',
    title: 'Phiếu luyện tập hình học',
    description: 'Nộp phiếu kèm hình vẽ chi tiết.',
    dueDate: '10/04/2026',
    assignedDate: '08/04/2026',
    target: 'group',
  },
];

export const ASSIGNMENT_SUBMISSIONS: AssignmentSubmission[] = [
  { id: 'sb1', assignmentId: 'as1', studentId: 'st1', submittedAt: '08/04/2026 20:10', status: 'submitted' },
  { id: 'sb2', assignmentId: 'as2', studentId: 'st2', status: 'pending' },
];

export const LEARNING_PROFILES: LearningProfile[] = [
  {
    studentId: 'st1',
    weekLabels: ['W1', 'W2', 'W3', 'W4'],
    concentrationTrend: [72, 76, 80, 84],
    participationTrend: [68, 71, 78, 82],
    completionTrend: [70, 74, 85, 90],
    strengths: ['Tư duy logic tốt', 'Chủ động làm bài'],
    weaknesses: ['Cần phát biểu nhiều hơn ở phần thảo luận'],
    suggestedIntervention: 'Khuyến khích trình bày lời giải trước lớp 1 lần/buổi.',
  },
  {
    studentId: 'st2',
    weekLabels: ['W1', 'W2', 'W3', 'W4'],
    concentrationTrend: [70, 68, 64, 62],
    participationTrend: [65, 62, 60, 58],
    completionTrend: [72, 70, 66, 61],
    strengths: ['Nắm chắc kiến thức cơ bản'],
    weaknesses: ['Đi học muộn', 'Chưa hoàn thành bài tập đều'],
    suggestedIntervention: 'Phối hợp phụ huynh theo dõi giờ ngủ và checklist bài tập mỗi tối.',
  },
];

// ============================
// HELPERS
// ============================
export function getTeacher(id: string): Teacher | undefined {
  return TEACHERS.find(t => t.id === id);
}

export function getRoom(id: string): Room | undefined {
  return ROOMS.find(r => r.id === id);
}

export function getClass(id: string): ClassInfo | undefined {
  return CLASSES.find(c => c.id === id);
}

export function getStudent(id: string): StudentProfile | undefined {
  return STUDENTS.find(s => s.id === id);
}

export function getLiveData(classId: string): LiveData | undefined {
  return LIVE_DATA.find(l => l.classId === classId);
}

export function getConcentrationColor(level: number): string {
  if (level >= 80) return '#16a34a';
  if (level >= 60) return '#d97706';
  return '#dc2626';
}

export function getConcentrationBg(level: number): string {
  if (level >= 80) return 'bg-green-100 text-green-800';
  if (level >= 60) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

export function getConcentrationLabel(level: number): string {
  if (level >= 80) return 'Tốt';
  if (level >= 60) return 'Trung bình';
  return 'Thấp';
}

export function getAlertLabel(status: LiveData['alertStatus']): string {
  switch (status) {
    case 'normal': return 'Bình thường';
    case 'low_concentration': return 'Giảm tập trung';
    case 'low_attendance': return 'Sĩ số thấp';
    case 'late_start': return 'Chưa bắt đầu';
  }
}

export function getAlertStyle(status: LiveData['alertStatus']): string {
  switch (status) {
    case 'normal': return 'bg-green-100 text-green-700';
    case 'low_concentration': return 'bg-amber-100 text-amber-700';
    case 'low_attendance': return 'bg-red-100 text-red-700';
    case 'late_start': return 'bg-gray-100 text-gray-700';
  }
}

export const DAY_NAMES = ['', 'CN', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'];
export const DAY_NAMES_FULL = ['', 'Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
