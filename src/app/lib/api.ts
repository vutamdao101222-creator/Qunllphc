export type ApiUserRole = 'admin' | 'teacher' | 'parent';

export interface ApiUser {
  maTaiKhoan: string;
  tenDangNhap: string;
  hoTen: string;
  email?: string;
  role: ApiUserRole;
  laQuanTri?: boolean;
  laGiaoVien?: boolean;
  laPhuHuynh?: boolean;
  chiDoc?: boolean;
  /** Mã giáo viên (JOIN TaiKhoan.Email = GiaoVien.Email), có trong JWT sau đăng nhập */
  maGiaoVien?: string | null;
}

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

function configuredApiBase(): string {
  if (RAW_API_BASE === undefined || RAW_API_BASE === null || String(RAW_API_BASE).trim() === '') {
    return 'http://localhost:4000/api/v1';
  }
  return String(RAW_API_BASE).trim().replace(/\/$/, '');
}

/**
 * Gốc API cho REST, SSE, CSV.
 * - Tuyệt đối: `http://IP:4000/api/v1` hoặc `https://ten-mien/api/v1`
 * - Tương đối `/api/v1`: dev → Vite proxy (mở trang qua **:5173**); prod http:80 trên LAN → tự thêm **:4000**.
 */
export function resolveApiBaseUrl(): string {
  const base = configuredApiBase();
  if (typeof window === 'undefined') return base;

  // /api/v1 — không gắn http(s)://
  if (base.startsWith('/')) {
    if (import.meta.env.DEV) {
      return base;
    }
    const proto = window.location.protocol;
    const host = window.location.hostname;
    const port = window.location.port;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    if (proto === 'https:') {
      return `${window.location.origin}${base}`.replace(/\/$/, '');
    }
    if (!isLocal && (port === '' || port === '80')) {
      return `http://${host}:4000${base}`.replace(/\/$/, '');
    }
    return base;
  }

  if (!base.startsWith('http://') && !base.startsWith('https://')) return base;

  try {
    const { hostname } = new URL(base);
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') return base;
    const pageHost = window.location.hostname;
    if (pageHost === 'localhost' || pageHost === '127.0.0.1') return base;

    if (window.location.protocol === 'https:') {
      return `${window.location.origin}/api/v1`.replace(/\/$/, '');
    }
    const p = window.location.protocol === 'http:' ? 'http:' : window.location.protocol;
    return `${p}//${pageHost}:4000/api/v1`.replace(/\/$/, '');
  } catch {
    return base;
  }
}

export const API_BASE_URL = resolveApiBaseUrl();

function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${resolveApiBaseUrl()}${p}`;
}

const ACCESS_TOKEN_KEY = 'edu_access_token';
const REFRESH_TOKEN_KEY = 'edu_refresh_token';

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function setTokens(accessToken?: string, refreshToken?: string) {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function request(path: string, init: RequestInit = {}) {
  const token = getAccessToken();
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    // Tránh 304 + body rỗng từ HTTP cache (Chrome có thể cache GET API) → màn hình 0 lớp / JSON null.
    cache: init.cache ?? 'no-store',
    headers,
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    let message = data?.message || `API error: ${response.status}`;
    if (response.status === 404 && typeof message === 'string' && message.startsWith('API error')) {
      message += `. URL API: ${resolveApiBaseUrl()}. Dev: mở http://IP:5173 (npm run dev). Hoặc IIS proxy /api → Node, hoặc VITE_API_BASE_URL=http://IP:4000/api/v1.`;
    }
    throw new Error(message);
  }

  return data;
}

export async function login(username: string, password: string): Promise<ApiUser> {
  const data = await request('/auth/dang-nhap', {
    method: 'POST',
    body: JSON.stringify({ tenDangNhap: username, matKhau: password }),
  });
  setTokens(data?.accessToken, data?.refreshToken);
  return data?.user as ApiUser;
}

export async function me(): Promise<ApiUser> {
  const data = await request('/auth/toi');
  return data?.user || data;
}

export async function fetchDashboardOverview() {
  return request('/dashboard/tong-quan');
}

export async function fetchRealtimeClasses() {
  return request('/monitor/thoi-gian-thuc');
}

export async function fetchRoboflowFocusConfig() {
  return request('/ai/focus/cau-hinh');
}

export async function postRoboflowFocusWorkflow(body: {
  maLop?: string;
  source?: 'webcam' | 'image_upload' | 'video_upload' | 'stream_http' | 'rtsp' | 'unknown';
  imageBase64?: string;
}) {
  return request('/ai/focus/workflow', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** SSE endpoint (no auth) — cùng gốc với các request API */
export function getMonitorStreamUrl() {
  return apiUrl('/monitor/stream');
}

/** URL endpoint MJPEG cầu nối RTSP. Đặt vào <img src> hoặc bind monitor. */
export function buildRtspMjpegUrl(rtspUrl: string, opts: { fps?: number; q?: number; w?: number } = {}) {
  const u = new URL(apiUrl('/rtsp/mjpeg'), window.location.origin);
  u.searchParams.set('url', rtspUrl);
  if (opts.fps) u.searchParams.set('fps', String(opts.fps));
  if (opts.q) u.searchParams.set('q', String(opts.q));
  if (opts.w) u.searchParams.set('w', String(opts.w));
  return u.toString();
}

/** Probe trạng thái ffmpeg trên server. Không cần auth. */
export async function probeRtspFfmpeg(): Promise<{ ok: boolean; bin?: string; version?: string; error?: string }> {
  try {
    const resp = await fetch(apiUrl('/rtsp/probe'), { cache: 'no-store' });
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
    return await resp.json();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Chụp 1 ảnh test từ RTSP — trả `{ ok, blobUrl }` (object URL của JPEG) hoặc `{ ok:false, message, stderr }`. */
export async function captureRtspTestSnapshot(rtspUrl: string, opts: { w?: number; timeoutMs?: number } = {}): Promise<
  | { ok: true; blobUrl: string }
  | { ok: false; message: string; stderr?: string | null }
> {
  const u = new URL(apiUrl('/rtsp/snapshot'), window.location.origin);
  u.searchParams.set('url', rtspUrl);
  if (opts.w) u.searchParams.set('w', String(opts.w));
  if (opts.timeoutMs) u.searchParams.set('timeoutMs', String(opts.timeoutMs));
  try {
    const resp = await fetch(u.toString(), { cache: 'no-store' });
    if (!resp.ok) {
      try {
        const j = await resp.json();
        return { ok: false, message: j?.message || `HTTP ${resp.status}`, stderr: j?.stderr ?? null };
      } catch {
        return { ok: false, message: `HTTP ${resp.status}` };
      }
    }
    const blob = await resp.blob();
    return { ok: true, blobUrl: URL.createObjectURL(blob) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchReportSummary() {
  return request('/bao-cao/tong-hop');
}

export async function fetchParentOverview() {
  return request('/phu-huynh/tong-quan');
}

export async function fetchMyParentLinks() {
  return request('/phu-huynh/lien-ket');
}

export async function listParentAccounts(params: { q?: string; page?: number; pageSize?: number } = {}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 200;
  const q = params.q ? `&q=${encodeURIComponent(params.q)}` : '';
  return request(`/tai-khoan?page=${page}&pageSize=${pageSize}&role=parent${q}`);
}

export async function createParentAccount(input: { name: string; username: string; password: string; email?: string }) {
  return request('/tai-khoan', {
    method: 'POST',
    body: JSON.stringify({
      tenDangNhap: input.username,
      matKhau: input.password,
      hoTen: input.name,
      email: input.email || undefined,
      role: 'parent',
    }),
  });
}

export async function listParentStudentLinks() {
  return request('/admin/parent-links');
}

export async function createParentStudentLink(input: {
  parentId: string;
  studentId: string;
  relationship: 'father' | 'mother' | 'guardian';
}) {
  return request('/admin/parent-links', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteParentStudentLink(linkId: string) {
  return request(`/admin/parent-links/${encodeURIComponent(linkId)}`, { method: 'DELETE' });
}

export async function listScheduleAdjustments(classId?: string) {
  const qs = classId ? `?classId=${encodeURIComponent(classId)}` : '';
  return request(`/lich-hoc/dieu-chinh${qs}`);
}

export async function upsertScheduleAdjustment(input: {
  classId: string;
  schedules: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  reason: string;
  updatedBy: string;
}) {
  return request(`/lop-hoc/${encodeURIComponent(input.classId)}/lich-hoc/dieu-chinh`, {
    method: 'PUT',
    body: JSON.stringify({
      schedules: input.schedules,
      reason: input.reason,
      updatedBy: input.updatedBy,
    }),
  });
}

export async function resetScheduleAdjustment(classId: string) {
  return request(`/lop-hoc/${encodeURIComponent(classId)}/lich-hoc/dieu-chinh`, { method: 'DELETE' });
}

export interface ApiTeacher {
  maGiaoVien: string;
  hoTen: string;
  monHoc: string;
  soDienThoai?: string | null;
  email?: string | null;
}

export async function listTeachers(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: 'maGiaoVien' | 'hoTen' | 'monHoc' | 'email';
  order?: 'asc' | 'desc';
} = {}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;
  const q = params.q ? `&q=${encodeURIComponent(params.q)}` : '';
  const sort = params.sort ? `&sort=${encodeURIComponent(params.sort)}` : '';
  const order = params.order ? `&order=${encodeURIComponent(params.order)}` : '';
  return request(`/giao-vien?page=${page}&pageSize=${pageSize}${q}${sort}${order}`);
}

export async function createTeacher(input: ApiTeacher) {
  return request('/giao-vien', {
    method: 'POST',
    body: JSON.stringify({
      maGiaoVien: input.maGiaoVien,
      hoTen: input.hoTen,
      monHoc: input.monHoc,
      soDienThoai: input.soDienThoai || undefined,
      email: input.email || undefined,
    }),
  });
}

export async function updateTeacher(maGiaoVien: string, input: Partial<Omit<ApiTeacher, 'maGiaoVien'>>) {
  return request(`/giao-vien/${encodeURIComponent(maGiaoVien)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      hoTen: input.hoTen,
      monHoc: input.monHoc,
      soDienThoai: input.soDienThoai ?? undefined,
      email: input.email ?? undefined,
    }),
  });
}

export async function deleteTeacher(maGiaoVien: string) {
  return request(`/giao-vien/${encodeURIComponent(maGiaoVien)}`, { method: 'DELETE' });
}

export async function fetchClass(maLop: string) {
  return request(`/lop-hoc/${encodeURIComponent(maLop)}`);
}

export async function fetchClassSuggestedStudentCodes(maLop: string): Promise<string[]> {
  const data = await request(`/lop-hoc/${encodeURIComponent(maLop)}/goi-y-ma-hoc-sinh`);
  return (data.items ?? []) as string[];
}

export async function fetchClassParentTeacherExchange(maLop: string, maHocSinh?: string) {
  const qs = maHocSinh ? `?maHocSinh=${encodeURIComponent(maHocSinh)}` : '';
  const data = await request(`/lop-hoc/${encodeURIComponent(maLop)}/trao-doi${qs}`);
  return data.items ?? [];
}

export async function postClassParentTeacherExchange(
  maLop: string,
  body: {
    maHocSinh?: string | null;
    tieuDe?: string;
    noiDung: string;
    thoiDiem?: string;
  },
) {
  return request(`/lop-hoc/${encodeURIComponent(maLop)}/trao-doi`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchClassStudentAttendanceRecords(
  maLop: string,
  params?: { maHocSinh?: string; from?: string; to?: string },
) {
  const sp = new URLSearchParams();
  if (params?.maHocSinh) sp.set('maHocSinh', params.maHocSinh);
  if (params?.from) sp.set('from', params.from);
  if (params?.to) sp.set('to', params.to);
  const qs = sp.toString();
  const data = await request(
    `/lop-hoc/${encodeURIComponent(maLop)}/diem-danh-hoc-sinh${qs ? `?${qs}` : ''}`,
  );
  return data.items ?? [];
}

export async function postClassStudentAttendanceRecord(
  maLop: string,
  body: {
    maHocSinh: string;
    trangThai: 'present' | 'late' | 'absent';
    thoiDiem?: string;
    ghiChu?: string;
  },
) {
  return request(`/lop-hoc/${encodeURIComponent(maLop)}/diem-danh-hoc-sinh`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchParentParentTeacherExchange() {
  const data = await request('/phu-huynh/trao-doi');
  return data.items ?? [];
}

export async function postParentParentTeacherExchange(body: {
  maLop: string;
  maHocSinh: string;
  tieuDe?: string;
  noiDung: string;
  thoiDiem?: string;
}) {
  return request('/phu-huynh/trao-doi', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchParentStudentAttendanceRecords(params?: {
  from?: string;
  to?: string;
  maHocSinh?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.from) sp.set('from', params.from);
  if (params?.to) sp.set('to', params.to);
  if (params?.maHocSinh) sp.set('maHocSinh', params.maHocSinh);
  const qs = sp.toString();
  const data = await request(`/phu-huynh/diem-danh-hoc-sinh${qs ? `?${qs}` : ''}`);
  return data.items ?? [];
}

export async function fetchClassesPage(params: { page?: number; pageSize?: number; q?: string } = {}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;
  const q = params.q ? `&q=${encodeURIComponent(params.q)}` : '';
  return request(`/lop-hoc?page=${page}&pageSize=${pageSize}${q}`);
}

export async function fetchMyNotifications(page = 1, pageSize = 30) {
  return request(`/thong-bao/cua-toi?page=${page}&pageSize=${pageSize}`);
}

export async function markNotificationReadApi(maThongBao: string) {
  return request(`/thong-bao/${encodeURIComponent(maThongBao)}/da-doc`, { method: 'POST' });
}

export async function fetchSystemInfo() {
  return request('/he-thong/thong-tin');
}

export async function fetchSystemStatus() {
  return request('/he-thong/trang-thai');
}

export async function patchMonitoringThresholds(input: {
  tyLeThamDuToiThieu?: number;
  nguongTapTrungToiThieu?: number;
}) {
  return request('/he-thong/nguong-giam-sat', { method: 'PATCH', body: JSON.stringify(input) });
}

export async function patchTenantDisplayName(tenHienThi: string) {
  return request('/he-thong/ten-hien-thi', { method: 'PATCH', body: JSON.stringify({ tenHienThi }) });
}

export async function fetchAuditLog(page = 1, pageSize = 40) {
  return request(`/he-thong/nhat-ky?page=${page}&pageSize=${pageSize}`);
}

export async function fetchDevices() {
  return request('/he-thong/thiet-bi');
}

export async function createDeviceApi(input: {
  ten: string;
  maLop?: string | null;
  urlKetNoi?: string | null;
  trangThai?: string;
  ghiChu?: string | null;
}) {
  return request('/he-thong/thiet-bi', { method: 'POST', body: JSON.stringify(input) });
}

export async function persistFocusMetrics(input: {
  maLop: string;
  concentrationLevel: number;
  presentCount: number;
  expectedStudents?: number;
  summary?: string;
  source?: 'browser_ai' | 'roboflow' | 'manual';
  phanTich?: {
    tomTatDieuHanh?: string;
    chiSoTapTrungUocLuong?: number;
    ruiRo?: string;
    khuyenNghi?: string;
    hanhVi?: Record<string, number>;
  };
  behaviorCounts?: Record<string, number>;
}) {
  return request('/monitor/ai/chi-so', { method: 'POST', body: JSON.stringify(input) });
}

export type BluetoothSpeakerRecord = {
  maLoa: string;
  ten: string;
  maLop: string | null;
  tenLop?: string | null;
  bluetoothId: string | null;
  bluetoothName: string | null;
  trangThai: string;
  batThongBao: boolean;
  amLuong: number;
  ghiChu?: string | null;
  ngayTao?: string;
};

export async function fetchBluetoothSpeakers(maLop?: string) {
  const q = maLop ? `?maLop=${encodeURIComponent(maLop)}` : '';
  return request(`/he-thong/loa-bluetooth${q}`) as Promise<{ items: BluetoothSpeakerRecord[] }>;
}

export async function createBluetoothSpeaker(input: {
  ten: string;
  maLop?: string | null;
  bluetoothId?: string | null;
  bluetoothName?: string | null;
  trangThai?: string;
  batThongBao?: boolean;
  amLuong?: number;
  ghiChu?: string | null;
}) {
  return request('/he-thong/loa-bluetooth', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateBluetoothSpeaker(
  maLoa: string,
  input: Partial<{
    ten: string;
    maLop: string | null;
    bluetoothId: string | null;
    bluetoothName: string | null;
    trangThai: string;
    batThongBao: boolean;
    amLuong: number;
    ghiChu: string | null;
  }>,
) {
  return request(`/he-thong/loa-bluetooth/${maLoa}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function deleteBluetoothSpeaker(maLoa: string) {
  return request(`/he-thong/loa-bluetooth/${maLoa}`, { method: 'DELETE' });
}

export async function fetchParentSummary(fromIso: string, toIso: string) {
  return request(
    `/phu-huynh/bao-cao-tom-tat?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
  );
}

export function getCsvExportUrl() {
  return apiUrl('/bao-cao/xuat-csv');
}
