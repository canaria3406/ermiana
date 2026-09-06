import assert from 'node:assert/strict';
import test from 'node:test';
import { CacheService, MemoryCacheBackend } from '../../../../src/core/cache.js';
import { BahaSessionService } from '../../../../src/services/upstream/baha-session.js';

test('Bahamut session is shared through the cache', async () => {
  const cache = new CacheService({ backend: new MemoryCacheBackend() });
  let logins = 0;
  const service = new BahaSessionService({
    cache,
    userId: 'user',
    password: 'pass',
    http: { async postForm() {
      logins += 1;
      return { headers: { getSetCookie() { return ['BAHAENUR=one; Path=/', 'BAHARUNE=two; Path=/']; } } };
    } },
  });
  assert.equal(await service.getCookie(), 'BAHAENUR=one; BAHARUNE=two');
  assert.equal(await service.getCookie(), 'BAHAENUR=one; BAHARUNE=two');
  assert.equal(logins, 1);
});
test('scheduled Bahamut refresh replaces both cookies only after a successful login', async () => {
  const cache = new CacheService({ backend: new MemoryCacheBackend() });
  let shouldFail = false;
  const service = new BahaSessionService({
    cache,
    userId: 'user',
    password: 'pass',
    http: { async postForm() {
      if (shouldFail) throw new Error('login unavailable');
      return { headers: { getSetCookie() { return ['BAHAENUR=old; Path=/', 'BAHARUNE=old; Path=/']; } } };
    } },
  });
  assert.equal(await service.getCookie(), 'BAHAENUR=old; BAHARUNE=old');
  shouldFail = true;
  await assert.rejects(() => service.refresh(), /login unavailable/);
  assert.equal(await service.getCookie(), 'BAHAENUR=old; BAHARUNE=old');
});

test('Bahamut login rejects duplicate cookies when either required cookie is missing', async () => {
  const service = new BahaSessionService({
    cache: new CacheService({ backend: new MemoryCacheBackend() }),
    userId: 'user',
    password: 'pass',
    http: { async postForm() {
      return { headers: { getSetCookie() { return ['BAHAENUR=one; Path=/', 'BAHAENUR=two; Path=/']; } } };
    } },
  });
  await assert.rejects(() => service.getCookie(), /both session cookies/);
});

