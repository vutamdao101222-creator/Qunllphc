import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

/** Bỏ prefix data URL của ảnh base64 */
export function stripDataUrlBase64(raw) {
  const s = String(raw || '').trim();
  const i = s.indexOf('base64,');
  if (i !== -1) return s.slice(i + 7);
  return s;
}

/**
 * @param {{ inferenceBaseUrl: string; workspace: string; workflowId: string; inferWorkflowUrlOverride?: string }} o
 */
function buildWorkflowCandidateUrls(o) {
  const inferWorkflowUrlOverride = o.inferWorkflowUrlOverride?.trim();
  if (inferWorkflowUrlOverride) {
    return [inferWorkflowUrlOverride.replace(/\/$/, '')];
  }
  const b = o.inferenceBaseUrl.replace(/\/$/, '');
  const w = encodeURIComponent(o.workspace);
  const id = encodeURIComponent(o.workflowId);
  return [
    `${b}/infer/workflows/${w}/${id}`,
    `${b}/workflows/${w}/${id}`,
    `${b}/infer/${w}/${id}`,
  ];
}

function normalizeHost(urlStr) {
  try {
    return new URL(urlStr.startsWith('http') ? urlStr : `http://${urlStr}`).host.toLowerCase();
  } catch {
    return '';
  }
}

/** Node fetch thường chỉ báo \"fetch failed\" — gom nguyên nhân từ cause / AggregateError */
function fetchErrorDetail(err) {
  if (!err) return '';
  const parts = [String(err.message || err)];
  let c = err.cause;
  let depth = 0;
  while (c != null && depth < 6) {
    if (typeof c === 'object' && c.code) parts.push(`code=${c.code}`);
    if (c?.message) parts.push(String(c.message));
    if (Array.isArray(c?.errors)) {
      for (const sub of c.errors) {
        parts.push(sub?.message || String(sub));
      }
    }
    c = c.cause ?? null;
    depth += 1;
  }
  return [...new Set(parts.filter(Boolean))].join(' | ');
}

/** Kết quả giả lập — chỉ để demo UI khi chưa có Inference / key (không phân tích ảnh thật). */
function buildMockFocusWorkflowPayload(jpegBuffer) {
  const a = jpegBuffer[0] ?? 0;
  const b = jpegBuffer[Math.min(50, jpegBuffer.length - 1)] ?? 0;
  const estimatedPresent = 14 + (a % 8); // ~ một lớp học thực tế
  const focusedRatio = 0.55 + ((a + b) % 35) / 100;
  const focused = Math.max(0, Math.min(estimatedPresent, Math.round(estimatedPresent * focusedRatio)));
  const cols = 5;
  const rows = Math.ceil(estimatedPresent / cols);
  const boxes = [];
  for (let i = 0; i < estimatedPresent; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const jx = ((a + i * 11) % 23) / 600;
    const jy = ((b + i * 13) % 19) / 600;
    const w = 0.085 + ((a + i) % 5) / 240;
    const h = 0.16 + ((b + i) % 4) / 240;
    const baseX = 0.07 + col * (0.84 / cols);
    const baseY = 0.32 + row * (0.5 / Math.max(1, rows));
    const x = clamp01(baseX + jx);
    const y = clamp01(baseY + jy);
    const trangThai = i < focused ? 'tap_trung' : 'kem_tap_trung';
    boxes.push({
      x,
      y,
      w: clamp01(w),
      h: clamp01(h),
      label: 'person',
      score: Math.round((0.78 + ((a + i * 3) % 18) / 100) * 100) / 100,
      trangThai,
    });
  }
  const pct = estimatedPresent ? Math.round((focused / estimatedPresent) * 100) : 0;
  return {
    mock: true,
    canhBao:
      'Đây là dữ liệu DEMO (ROBOFLOW_MOCK_FOCUS=true). Không dùng cho đánh giá thật. Muốn nhận diện thật: bật Inference local, hoặc serverless + API key.',
    tomTat: {
      uocLuongSoNguoiTrongKhung: estimatedPresent,
      uocLuongDangTapTrung: focused,
      uocLuongKhongTapTrung: estimatedPresent - focused,
    },
    overlay: { version: 1, boxes },
    phanTichChuyenNghiep: {
      tomTatDieuHanh: `Phát hiện ${estimatedPresent} thành viên trong khung hình; ${focused} tư thế/ hướng mặt gợi ý tập trung tốt, ${estimatedPresent - focused} cần quan sát thêm (demo).`,
      chiSoTapTrungUocLuong: pct,
      ruiRo:
        estimatedPresent > 12
          ? 'Mật độ người trong khung cao — cần camera góc rộng hơn hoặc chia khu vực phân tích.'
          : 'Không phát hiện rủi ro sĩ số bất thường trong khung demo.',
      khuyenNghi:
        'Ưu tiên tương tác nhóm trung tâm; xen kẽ hoạt động ngắn 3–5 phút để duy trì tập trung; khi triển khai thật hãy dùng workflow Roboflow có bbox + pose.',
    },
    goiYMoHinhThat: [
      'Thu ảnh lớp học, gán nhãn (tap_trung / khong_tap_trung hoặc bbox người + pose).',
      'Huấn luyện trên Roboflow (Classification / Object Detection + Workflow kết hợp pose).',
      'Triển khai Workflow rồi đặt ROBOFLOW_WORKFLOW_ID và gọi qua Inference hoặc serverless.roboflow.com.',
    ],
  };
}

function clamp01(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function isLikelyConnectionFailure(detail) {
  const d = String(detail).toLowerCase();
  return (
    d.includes('fetch failed') ||
    d.includes('econnrefused') ||
    d.includes('econnreset') ||
    d.includes('enotfound') ||
    d.includes('etimedout') ||
    d.includes('network') ||
    d.includes(' refused')
  );
}

function parseJsonBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * Thử các URL workflow: JSON rồi multipart.
 * @returns {Promise<{ inferenceUrlUsed: string; transport: string; result: unknown; viaHostedFallback?: boolean } | null>}
 */
async function tryWorkflowUrls(candidates, rf, jpegBuffer, b64, imageName, fetchOpts) {
  let lastDetail = '';

  for (const url of candidates) {
    try {
      const body = {
        inputs: {
          [imageName]: { type: 'base64', value: b64 },
        },
        use_cache: true,
      };
      if (rf.apiKey) body.api_key = rf.apiKey;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        ...fetchOpts,
      });
      const text = await res.text();
      if (res.ok) {
        return {
          inferenceUrlUsed: url,
          transport: 'json',
          result: parseJsonBody(text),
        };
      }
      lastDetail = `JSON ${res.status}: ${text.slice(0, 800)}`;
    } catch (e) {
      lastDetail = `JSON: ${fetchErrorDetail(e)}`;
    }

    try {
      const form = new FormData();
      form.append(imageName, new Blob([jpegBuffer], { type: 'image/jpeg' }), 'frame.jpg');

      /** @type {Record<string, string>} */
      const headers = {};
      if (rf.apiKey) headers.Authorization = `Bearer ${rf.apiKey}`;

      const res = await fetch(url, { method: 'POST', body: form, headers, ...fetchOpts });
      const text = await res.text();
      if (res.ok) {
        return {
          inferenceUrlUsed: url,
          transport: 'multipart',
          result: parseJsonBody(text),
        };
      }
      lastDetail = `${lastDetail} | multipart ${res.status}: ${text.slice(0, 800)}`;
    } catch (e) {
      lastDetail = `${lastDetail} | multipart: ${fetchErrorDetail(e)}`;
    }
  }

  return { fail: true, lastDetail, tried: candidates };
}

/**
 * Gửi ảnh JPEG (buffer) vào Inference Server / workflow Roboflow.
 * Thử JSON (inputs.base64) rồi multipart — vì cổng path khác nhau giữa bản Inference.
 * Tùy chọn: ROBOFLOW_HOSTED_FALLBACK + ROBOFLOW_API_KEY — thử https://serverless.roboflow.com khi local lỗi kết nối.
 */
export async function runRoboflowFocusWorkflow(jpegBuffer) {
  const rf = env.roboflow;
  if (!jpegBuffer?.length) throw new HttpError(400, 'Thieu du lieu anh');

  if (rf.mockFocus) {
    return {
      inferenceUrlUsed: 'mock://local/ROBOFLOW_MOCK_FOCUS',
      transport: 'mock',
      result: buildMockFocusWorkflowPayload(jpegBuffer),
    };
  }

  const imageName = rf.imageInputName || 'image';
  const b64 = jpegBuffer.toString('base64');

  const fetchOpts = {};
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    fetchOpts.signal = AbortSignal.timeout(Number(process.env.ROBOFLOW_FETCH_TIMEOUT_MS || 120000));
  }

  const primary = buildWorkflowCandidateUrls({
    inferenceBaseUrl: rf.inferenceBaseUrl,
    workspace: rf.workspace,
    workflowId: rf.workflowId,
    inferWorkflowUrlOverride: rf.inferWorkflowUrlOverride,
  });

  let attempt = await tryWorkflowUrls(primary, rf, jpegBuffer, b64, imageName, fetchOpts);
  if (!attempt?.fail) {
    return attempt;
  }

  let lastDetail = attempt.lastDetail || '';
  let candidatesTried = [...primary];

  const canHostedFallback =
    rf.hostedFallback &&
    Boolean(rf.apiKey) &&
    isLikelyConnectionFailure(lastDetail) &&
    normalizeHost(rf.serverlessBaseUrl) !== normalizeHost(rf.inferenceBaseUrl);

  if (canHostedFallback) {
    const hostedCandidates = buildWorkflowCandidateUrls({
      inferenceBaseUrl: rf.serverlessBaseUrl,
      workspace: rf.workspace,
      workflowId: rf.workflowId,
      inferWorkflowUrlOverride: '',
    });
    const second = await tryWorkflowUrls(hostedCandidates, rf, jpegBuffer, b64, imageName, fetchOpts);
    candidatesTried = [...candidatesTried, ...hostedCandidates];
    if (!second?.fail) {
      return { ...second, viaHostedFallback: true };
    }
    lastDetail = `${lastDetail} | [Serverless fallback] ${second.lastDetail || ''}`;
  } else if (rf.hostedFallback && !rf.apiKey && isLikelyConnectionFailure(lastDetail)) {
    lastDetail = `${lastDetail} | ROBOFLOW_HOSTED_FALLBACK=true nhưng thiếu ROBOFLOW_API_KEY — không thể gọi serverless.`;
  }

  const baseUrl = rf.inferenceBaseUrl || '';
  const connHint = isLikelyConnectionFailure(lastDetail)
    ? ` Gợi ý kết nối: Backend Node đang gọi ${baseUrl} từ máy CHẠY npm run api (127.0.0.1 = chính máy đó). ` +
      `Cách 1: bật Inference local (vd inference server start --port 9001). ` +
      `Cách 2: ROBOFLOW_INFERENCE_URL=http://IP-MÁY-CÓ-INFERENCE:9001 + firewall. ` +
      `Cách 3 không cần cổng 9001: ROBOFLOW_INFERENCE_URL=${rf.serverlessBaseUrl} + ROBOFLOW_API_KEY, hoặc giữ local URL và bật ROBOFLOW_HOSTED_FALLBACK=true cùng API key.`
    : '';

  throw new HttpError(
    502,
    `Không gọi được Roboflow Inference. Đã thử: ${candidatesTried.join(' · ')}. Chi tiết: ${lastDetail}. ` +
      `Kiểm tra .env: ROBOFLOW_INFERENCE_URL, ROBOFLOW_WORKSPACE, ROBOFLOW_WORKFLOW_ID ` +
      `hoặc ROBOFLOW_INFER_WORKFLOW_URL.${connHint}`,
  );
}
