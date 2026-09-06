import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CacheService,
  connectRedis,
  MemoryCacheBackend,
  RedisCacheBackend,
} from '../../../src/core/cache.js';

const REDIS_CONFIG = Object.freeze({
  url: 'redis://127.0.0.1:6379/0',
  keyPrefix: 'test',
  required: true,
  retryInitialDelayMs: 1000,
  retryMaxDelayMs: 30000,
  retryBudgetMs: 90000,
});
function createFakeRedis({ failures = 0 } = {}) {
  const clients = [];
  const strategyBeforeConnect = [];
  const createClientImpl = (options) => {
    const client = {
      options,
      isOpen: false,
      on() { return this; },
      async connect() {
        strategyBeforeConnect.push(options.socket.reconnectStrategy(0));
        if (clients.length <= failures) {
          const error = new Error('connect ECONNREFUSED 127.0.0.1:6379');
          error.code = 'ECONNREFUSED';
          throw error;
        }
        this.isOpen = true;
      },
      destroy() {
        if (!this.isOpen) throw new Error('The client is closed');
        this.isOpen = false;
      },
    };
    clients.push(client);
    return client;
  };
  return { createClientImpl, clients, strategyBeforeConnect };
}

function createSleepRecorder() {
  const waits = [];
  let clock = 0;
  return {
    waits,
    now: () => clock,
    sleep: async (ms) => { waits.push(ms); clock += ms; },
  };
}

function withMaximumJitter(t) {
  const random = Math.random;
  Math.random = () => 1;
  t.after(() => { Math.random = random; });
}

test('retries the initial Redis connection with exponential backoff until it succeeds', async (t) => {
  withMaximumJitter(t);
  const { createClientImpl, clients } = createFakeRedis({ failures: 3 });
  const { waits, sleep, now } = createSleepRecorder();

  const backend = await connectRedis(REDIS_CONFIG, undefined, { createClientImpl, sleep, now });

  assert.ok(backend instanceof RedisCacheBackend);
  assert.equal(clients.length, 4);
  assert.deepEqual(waits, [1000, 2000, 4000]);
});

test('caps the initial Redis retry delay and stops at the retry budget', async (t) => {
  withMaximumJitter(t);
  const { createClientImpl, clients } = createFakeRedis({ failures: Number.MAX_SAFE_INTEGER });
  const { waits, sleep, now } = createSleepRecorder();

  await assert.rejects(
    () => connectRedis({ ...REDIS_CONFIG, retryMaxDelayMs: 8000, retryBudgetMs: 30000 }, undefined, { createClientImpl, sleep, now }),
    /ECONNREFUSED/,
  );

  assert.deepEqual(waits, [1000, 2000, 4000, 8000, 8000]);
  assert.equal(clients.length, waits.length + 1);
});

test('a zero retry budget fails the initial Redis connection immediately', async (t) => {
  withMaximumJitter(t);
  const { createClientImpl, clients } = createFakeRedis({ failures: Number.MAX_SAFE_INTEGER });
  const { waits, sleep, now } = createSleepRecorder();

  await assert.rejects(
    () => connectRedis({ ...REDIS_CONFIG, retryBudgetMs: 0 }, undefined, { createClientImpl, sleep, now }),
    /ECONNREFUSED/,
  );

  assert.equal(clients.length, 1);
  assert.deepEqual(waits, []);
});

test('an optional Redis falls back to the process-local cache without retrying', async () => {
  const { createClientImpl, clients } = createFakeRedis({ failures: Number.MAX_SAFE_INTEGER });
  const { waits, sleep, now } = createSleepRecorder();

  const backend = await connectRedis({ ...REDIS_CONFIG, required: false }, undefined, { createClientImpl, sleep, now });

  assert.equal(backend, null);
  assert.equal(clients.length, 1);
  assert.deepEqual(waits, []);
});

test('node-redis must not retry the first connection itself, only later drops', async (t) => {
  withMaximumJitter(t);
  const { createClientImpl, clients, strategyBeforeConnect } = createFakeRedis({ failures: 1 });
  const { sleep, now } = createSleepRecorder();

  await connectRedis(REDIS_CONFIG, undefined, { createClientImpl, sleep, now });

  assert.deepEqual(strategyBeforeConnect, [false, false]);
  const { reconnectStrategy } = clients.at(-1).options.socket;
  assert.equal(reconnectStrategy(0), 100);
  assert.equal(reconnectStrategy(99), 3000);
});

test('process-local fallback cache is bounded', async () => {
  const backend = new MemoryCacheBackend({ maxEntries: 2 });
  await backend.set('first', 1, 1000);
  await backend.set('second', 2, 1000);
  await backend.set('third', 3, 1000);
  assert.equal(await backend.get('first'), null);
  assert.equal(await backend.get('second'), 2);
  assert.equal(await backend.get('third'), 3);
});

test('deduplicates concurrent cache fills', async () => {
  const cache = new CacheService({
    backend: new MemoryCacheBackend(),
    ttlSeconds: 30,
    staleTtlSeconds: 30,
    waitTimeoutMs: 1000,
  });
  let loads = 0;
  const loader = async () => {
    loads += 1;
    await new Promise((resolve) => setTimeout(resolve, 25));
    return { ok: true };
  };
  const results = await Promise.all(Array.from(
    { length: 6 },
    () => cache.getOrLoad('provider', 'same', loader),
  ));
  assert.equal(loads, 1);
  assert.deepEqual(results, Array.from({ length: 6 }, () => ({ ok: true })));
});

test('serves stale values when an upstream refresh fails', async () => {
  const backend = new MemoryCacheBackend();
  const cache = new CacheService({ backend, ttlSeconds: 1, staleTtlSeconds: 10 });
  const now = Date.now();
  await backend.set('cache:provider:item', {
    value: 'stale-value',
    freshUntil: now - 1,
    staleUntil: now + 10000,
  }, 10000);
  const value = await cache.getOrLoad('provider', 'item', async () => {
    throw new Error('upstream down');
  });
  assert.equal(value, 'stale-value');
});

test('Redis backend prefixes and serializes values', async () => {
  const values = new Map();
  const fakeClient = {
    isOpen: true,
    async get(key) { return values.get(key) ?? null; },
    async mGet(keys) { return keys.map((key) => values.get(key) ?? null); },
    async set(key, value, options) {
      if (options?.NX && values.has(key)) return null;
      values.set(key, value);
      return 'OK';
    },
    async del(key) { return values.delete(key) ? 1 : 0; },
    async eval(_script, { keys, arguments: args }) {
      if (values.get(keys[0]) === args[0]) return this.del(keys[0]);
      return 0;
    },
    async ping() { return 'PONG'; },
    async quit() { this.isOpen = false; },
  };
  const backend = new RedisCacheBackend(fakeClient, 'test');
  await backend.set('key', { answer: 42 }, 1000);
  await backend.set('persistent', { enabled: true });
  assert.deepEqual(await backend.get('key'), { answer: 42 });
  assert.deepEqual(await backend.getMany(['key', 'persistent', 'missing']), [
    { answer: 42 },
    { enabled: true },
    null,
  ]);
  assert.equal(await backend.acquire('lock', 'one', 1000), true);
  assert.equal(await backend.acquire('lock', 'two', 1000), false);
  await backend.release('lock', 'one');
  assert.equal(await backend.acquire('lock', 'two', 1000), true);
});

test('falls back to local cache if Redis fails while acquiring a lock', async () => {
  const failingBackend = {
    async get() { return null; },
    async acquire() { throw new Error('Redis disconnected'); },
    async delete() {},
    async close() {},
    async ping() { throw new Error('Redis disconnected'); },
  };
  const fallback = new MemoryCacheBackend();
  const cache = new CacheService({ backend: failingBackend, fallback });
  assert.equal(await cache.getOrLoad('provider', 'item', async () => 'loaded'), 'loaded');
  assert.equal(await cache.get('provider', 'item'), 'loaded');
});

