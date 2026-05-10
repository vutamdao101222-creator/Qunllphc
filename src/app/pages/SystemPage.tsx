import React, { useEffect, useState } from 'react';
import {
  fetchAuditLog,
  fetchDevices,
  fetchSystemInfo,
  fetchSystemStatus,
  patchMonitoringThresholds,
  patchTenantDisplayName,
  createDeviceApi,
} from '../lib/api';
import { Activity, Database, History, Server, Sliders, Video } from 'lucide-react';

export default function SystemPage() {
  const [info, setInfo] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [tyLe, setTyLe] = useState('0.7');
  const [tapTrung, setTapTrung] = useState('60');
  const [tenant, setTenant] = useState('');
  const [devTen, setDevTen] = useState('Camera lớp demo');
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const [i, s, a, d] = await Promise.all([
        fetchSystemInfo(),
        fetchSystemStatus(),
        fetchAuditLog(1, 25),
        fetchDevices(),
      ]);
      setInfo(i);
      setStatus(s);
      setAudit(a?.items ?? []);
      setDevices(d?.items ?? []);
      const th = i?.thresholds || s?.thresholds;
      if (th) {
        setTyLe(String(th.tyLeThamDuToiThieu ?? 0.7));
        setTapTrung(String(th.nguongTapTrungToiThieu ?? 60));
      }
      setTenant(i?.tenantDisplayName || '');
    } catch (e: any) {
      setMsg(e?.message || 'Không tải được dữ liệu hệ thống.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveThresholds = async () => {
    setMsg('');
    try {
      await patchMonitoringThresholds({
        tyLeThamDuToiThieu: parseFloat(tyLe),
        nguongTapTrungToiThieu: parseInt(tapTrung, 10),
      });
      setMsg('Đã lưu ngưỡng giám sát.');
      load();
    } catch (e: any) {
      setMsg(e?.message || 'Lỗi lưu.');
    }
  };

  const saveTenant = async () => {
    setMsg('');
    try {
      await patchTenantDisplayName(tenant || 'EduMonitor');
      setMsg('Đã cập nhật tên hiển thị.');
      load();
    } catch (e: any) {
      setMsg(e?.message || 'Lỗi.');
    }
  };

  const addDevice = async () => {
    setMsg('');
    try {
      await createDeviceApi({ ten: devTen, trangThai: 'offline' });
      setMsg('Đã thêm thiết bị (stub).');
      load();
    } catch (e: any) {
      setMsg(e?.message || 'Lỗi thêm thiết bị.');
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Vận hành & cấu hình</h1>
        <p className="text-sm text-gray-500 mt-1">Trạng thái API, ngưỡng cảnh báo, nhật ký thao tác, thiết bị giám sát (stub).</p>
      </div>

      {msg && (
        <div className="text-sm rounded-lg px-3 py-2 bg-blue-50 text-blue-800 border border-blue-200">{msg}</div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-800 font-medium mb-3">
            <Server size={18} className="text-blue-600" /> Trạng thái
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-center gap-2">
              <Database size={14} /> DB:{' '}
              <strong>{status?.db ? 'Kết nối' : 'Lỗi'}</strong>
            </li>
            <li>Simulation tick: {status?.simulationTickMs ?? info?.api?.simulationTickMs ?? '—'} ms</li>
            <li>Camera (cấu hình): {info?.cameraMode ?? '—'}</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-800 font-medium mb-3">
            <Sliders size={18} className="text-indigo-600" /> Ngưỡng realtime
          </div>
          <div className="space-y-2 text-sm">
            <label className="block">
              <span className="text-gray-500">Tỷ lệ tham dự tối thiểu (0–1)</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={tyLe}
                onChange={(e) => setTyLe(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-gray-500">Ngưỡng tập trung tối thiểu (0–100)</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={tapTrung}
                onChange={(e) => setTapTrung(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={saveThresholds}
              className="mt-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500"
            >
              Lưu ngưỡng
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-gray-800 font-medium mb-3">
          <Activity size={18} className="text-green-600" /> Tên hiển thị (stub đa cơ sở)
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            placeholder="Tên trường / đơn vị"
          />
          <button
            type="button"
            onClick={saveTenant}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
          >
            Lưu
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-gray-800 font-medium mb-3">
          <Video size={18} className="text-purple-600" /> Thiết bị giám sát (stub — chưa tích hợp luồng thật)
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            value={devTen}
            onChange={(e) => setDevTen(e.target.value)}
          />
          <button
            type="button"
            onClick={addDevice}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
          >
            Thêm thiết bị
          </button>
        </div>
        <ul className="text-sm text-gray-600 divide-y">
          {devices.length === 0 ? <li className="py-2 text-gray-400">Chưa có bản ghi.</li> : null}
          {devices.map((d) => (
            <li key={d.maThietBi} className="py-2 flex justify-between gap-2">
              <span>{d.ten}</span>
              <span className="text-gray-400">{d.trangThai}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-gray-800 font-medium mb-3">
          <History size={18} className="text-amber-600" /> Nhật ký thao tác (mẫu)
        </div>
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="py-2 pr-2">Thời điểm</th>
                <th className="py-2 pr-2">Hành động</th>
                <th className="py-2 pr-2">Đối tượng</th>
                <th className="py-2">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {audit.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-gray-400">
                    Chưa có dữ liệu hoặc bảng chưa migrate.
                  </td>
                </tr>
              ) : (
                audit.map((row) => (
                  <tr key={row.maNhatKy} className="border-b border-gray-50">
                    <td className="py-2 pr-2 whitespace-nowrap">
                      {row.thoiDiem ? new Date(row.thoiDiem).toLocaleString('vi-VN') : ''}
                    </td>
                    <td className="py-2 pr-2">{row.hanhDong}</td>
                    <td className="py-2 pr-2">{row.doiTuong}</td>
                    <td className="py-2 max-w-xs truncate">{row.chiTiet}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
