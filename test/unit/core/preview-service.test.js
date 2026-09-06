import assert from 'node:assert/strict';
import test from 'node:test';
import { CacheBusyError, CacheService, MemoryCacheBackend } from '../../../src/core/cache.js';
import { PreviewService } from '../../../src/core/preview-service.js';
import { ProviderRegistry } from '../../../src/core/provider-registry.js';

test('keeps stale previews for one provider TTL by default', async () => {
  const writes = [];
  const backend = {
    async get() { return null; },
    async acquire() { return true; },
    async set(key, value, ttlMs) { writes.push({ key, value, ttlMs }); },
    async release() {},
  };
  const provider = {
    id: 'cached',
    patterns: [/https:\/\/example\.test\/(\d+)/],
    ttlSeconds: 3600,
    cacheKey: (match) => match[1],
    resolve() { return { canonicalUrl: 'https://example.test/42' }; },
  };
  const service = new PreviewService({
    registry: new ProviderRegistry([provider]),
    cache: new CacheService({ backend }),
  });

  await service.resolve(service.match('https://example.test/42'));

  assert.equal(writes.length, 1);
  assert.equal(writes[0].ttlMs, 7200000);
  assert.equal(writes[0].value.staleUntil - writes[0].value.freshUntil, 3600000);
});

test('shares a failed fill with every process-local waiter', async () => {
  let calls = 0;
  let failUpstream;
  let markStarted;
  const started = new Promise((resolve) => { markStarted = resolve; });
  const upstream = new Promise((_resolve, reject) => { failUpstream = reject; });
  const provider = {
    id: 'failing',
    patterns: [/https:\/\/example\.test\/(\d+)/],
    ttlSeconds: 60,
    async resolve() {
      calls += 1;
      markStarted();
      return upstream;
    },
  };
  const backend = new MemoryCacheBackend();
  const cache = new CacheService({ backend, lockTtlMs: 1000, waitTimeoutMs: 150 });
  const service = new PreviewService({
    registry: new ProviderRegistry([provider]),
    cache,
  });
  const candidate = service.match('https://example.test/42');
  const requests = Array.from({ length: 6 }, () => service.resolve(candidate));
  await started;
  failUpstream(new Error('upstream unavailable'));
  const results = await Promise.allSettled(requests);

  assert.equal(calls, 1);
  assert.equal(results.filter(({ status }) => status === 'rejected').length, 6);
  assert.equal(results.filter(({ reason }) => reason?.message === 'upstream unavailable').length, 6);
  assert.equal(results.filter(({ reason }) => reason instanceof CacheBusyError).length, 0);
  assert.equal(backend.values.size, 0);

  await assert.rejects(service.resolve(candidate), /upstream unavailable/);
  assert.equal(calls, 2);
});

test('bypasses every cache operation when a provider has no TTL', async () => {
  let cacheCalls = 0;
  let resolveCalls = 0;
  const provider = {
    id: 'direct-link',
    patterns: [/https:\/\/example\.test\/(\d+)/],
    resolve({ match }) {
      resolveCalls += 1;
      return { canonicalUrl: match[0], content: `https://preview.test/${match[1]}` };
    },
  };
  const cache = {
    async get() { cacheCalls += 1; throw new Error('cache must not be read'); },
    async getOrLoad() { cacheCalls += 1; throw new Error('cache must not be written'); },
    async set() { cacheCalls += 1; throw new Error('cache must not be written'); },
  };
  const service = new PreviewService({ registry: new ProviderRegistry([provider]), cache });
  const candidate = service.match('https://example.test/42');
  assert.equal((await service.resolve(candidate)).content, 'https://preview.test/42');
  assert.equal((await service.resolve(candidate)).content, 'https://preview.test/42');
  assert.equal(resolveCalls, 2);
  assert.equal(cacheCalls, 0);
});

test('propagates an intentional no-preview result without cache access', async () => {
  let cacheCalls = 0;
  const provider = {
    id: 'optional-direct-link',
    patterns: [/https:\/\/example\.test\/skip/],
    resolve() { return null; },
  };
  const cache = {
    async get() { cacheCalls += 1; },
    async getOrLoad() { cacheCalls += 1; },
    async set() { cacheCalls += 1; },
  };
  const service = new PreviewService({ registry: new ProviderRegistry([provider]), cache });
  assert.equal(await service.resolve(service.match('https://example.test/skip')), null);
  assert.equal(cacheCalls, 0);
});

test('a cached provider that declines a preview returns no preview', async () => {
  const provider = {
    id: 'optional-cached',
    patterns: [/https:\/\/example\.test\/(skip)/],
    ttlSeconds: 60,
    cacheKey: (match) => match[1],
    resolve() { return null; },
  };
  const cache = new CacheService({ backend: new MemoryCacheBackend(), fallback: new MemoryCacheBackend() });
  const service = new PreviewService({ registry: new ProviderRegistry([provider]), cache });

  assert.equal(await service.resolve(service.match('https://example.test/skip')), null);
  assert.equal(await service.resolve(service.match('https://example.test/skip')), null);
});
