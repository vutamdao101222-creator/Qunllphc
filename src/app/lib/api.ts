const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

export interface ApiUser {
  maTaiKhoan: string;
  tenDangNhap: string;
  hoTen: string;
  email?: string;
  role: 'admin' | 'teacher' | 'parent';
  laQuanTri: boolean;
  laGiaoVien: boolean;
  laPhuHuynh: boolean;
}

function getToken() {
  return localStorage.getItem('edu_access_token');
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('edu_access_token', accessToken);
  localStorage.setItem('edu_refresh_token', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('edu_access_token');
  localStorage.removeItem('edu_refresh_token');
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'API request failed';
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      // ignore json parsing error
    }
    throw new Error(message);
  }

  if (response.headers.get('Content-Type')?.includes('text/csv')) {
    return response.text();
  }
  return response.json();
}

export async function login(tenDangNhap: string, matKhau: string) {
  const data = await request('/auth/dang-nhap', {
    method: 'POST',
    body: JSON.stringify({ tenDangNhap, matKhau }),
  });
  setTokens(data.accessToken, data.refreshToken);
  return data.user as ApiUser;
}

export async function me() {
  const data = await request('/auth/toi');
  return data.user as ApiUser;
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

export async function fetchAiPredictions() {
  return request('/ai/du-doan');
}

export function getCsvExportUrl() {
  return `${API_BASE_URL}/bao-cao/xuat-csv`;
}
