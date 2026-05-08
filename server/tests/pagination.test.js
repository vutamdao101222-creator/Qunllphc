import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPageResult, paginationSchema } from '../utils/pagination.js';

test('paginationSchema applies defaults', () => {
  const parsed = paginationSchema.parse({});
  assert.equal(parsed.page, 1);
  assert.equal(parsed.pageSize, 20);
  assert.equal(parsed.order, 'asc');
});

test('paginationSchema coerces strings and rejects bad values', () => {
  const parsed = paginationSchema.parse({ page: '3', pageSize: '50', order: 'desc' });
  assert.equal(parsed.page, 3);
  assert.equal(parsed.pageSize, 50);
  assert.equal(parsed.order, 'desc');

  assert.throws(() => paginationSchema.parse({ page: 0 }));
  assert.throws(() => paginationSchema.parse({ pageSize: 1000 }));
  assert.throws(() => paginationSchema.parse({ order: 'sideways' }));
});

test('buildPageResult computes totals correctly', () => {
  const result = buildPageResult([{ a: 1 }], 25, 2, 10);
  assert.deepEqual(result.pagination, { page: 2, pageSize: 10, total: 25, totalPages: 3 });
  assert.deepEqual(result.items, [{ a: 1 }]);

  const empty = buildPageResult([], 0, 1, 20);
  assert.equal(empty.pagination.totalPages, 1);
});
