import test from 'node:test';
import assert from 'node:assert/strict';
import { getAlertStatus } from '../services/monitoringService.js';

test('returns low_attendance when attendance below 70%', () => {
  assert.equal(getAlertStatus(90, 20, 40), 'low_attendance');
});

test('returns low_concentration when concentration below threshold', () => {
  assert.equal(getAlertStatus(55, 35, 40), 'low_concentration');
});

test('returns normal when class is healthy', () => {
  assert.equal(getAlertStatus(80, 35, 40), 'normal');
});
