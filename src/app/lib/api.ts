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

export const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');
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

  const response = await fetch(`${API_BASE_URL}${path}`, {
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
    const message = data?.message || `API error: ${response.status}`;
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

/** SSE endpoint (no auth) — same origin as API_BASE_URL */
export function getMonitorStreamUrl() {
  return `${API_BASE_URL}/monitor/stream`;
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

export async function fetchParentSummary(fromIso: string, toIso: string) {
  return request(
    `/phu-huynh/bao-cao-tom-tat?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
  );
}

export function getCsvExportUrl() {
  return `${API_BASE_URL}/bao-cao/xuat-csv`;
}
