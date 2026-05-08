import test from 'node:test';
import assert from 'node:assert/strict';
import { requireRoles, requireSelfOrRoles } from '../middleware/auth.js';

function runMiddleware(mw, req) {
  return new Promise((resolve) => {
    mw(req, {}, (err) => resolve(err));
  });
}

test('requireRoles passes when role is allowed', async () => {
  const err = await runMiddleware(requireRoles(['admin']), { auth: { role: 'admin' } });
  assert.equal(err, undefined);
});

test('requireRoles blocks when role is missing or not allowed', async () => {
  const err1 = await runMiddleware(requireRoles(['admin']), { auth: { role: 'parent' } });
  assert.ok(err1);
  assert.equal(err1.status, 403);

  const err2 = await runMiddleware(requireRoles(['admin']), {});
  assert.ok(err2);
  assert.equal(err2.status, 403);
});

test('requireSelfOrRoles allows admin and self, blocks others', async () => {
  const mw = requireSelfOrRoles((req) => req.params.id, ['admin']);

  const adminErr = await runMiddleware(mw, {
    auth: { role: 'admin', maTaiKhoan: 'x' },
    params: { id: 'y' },
  });
  assert.equal(adminErr, undefined);

  const selfErr = await runMiddleware(mw, {
    auth: { role: 'parent', maTaiKhoan: 'me' },
    params: { id: 'me' },
  });
  assert.equal(selfErr, undefined);

  const blocked = await runMiddleware(mw, {
    auth: { role: 'parent', maTaiKhoan: 'me' },
    params: { id: 'someone-else' },
  });
  assert.ok(blocked);
  assert.equal(blocked.status, 403);

  const noAuth = await runMiddleware(mw, { params: { id: 'me' } });
  assert.ok(noAuth);
  assert.equal(noAuth.status, 401);
});
