import { createNotification } from './notificationService.js';

let lastMorningKey = '';

/**
 * Nhắc lịch tối thiểu: một thông báo / ngày trong khung giờ sáng (theo giờ máy chủ).
 */
export async function runScheduleRemindersIfNeeded() {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10);
  const h = now.getHours();
  const m = now.getMinutes();
  const inMorningWindow = (h === 6 && m >= 45) || (h === 7 && m <= 30);
  if (!inMorningWindow) return;

  const key = `morning-${ymd}`;
  if (lastMorningKey === key) return;
  lastMorningKey = key;

  try {
    await createNotification({
      tieuDe: `Nhắc lịch học — ${ymd}`,
      noiDung:
        'Kiểm tra lịch giảng dạy, thiết bị lớp và mở buổi học (Buổi học) trước khi vào ca.',
      loai: 'reminder',
    });
  } catch {
    lastMorningKey = '';
  }
}
