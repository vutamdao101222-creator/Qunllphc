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
}

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');
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

export async function fetchReportSummary() {
  return request('/bao-cao/tong-hop');
}

export async function fetchParentOverview() {
  return request('/phu-huynh/tong-quan');
}

export function getCsvExportUrl() {
  return `${API_BASE_URL}/bao-cao/xuat-csv`;
}
