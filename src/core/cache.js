import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { createClient } from 'redis';

export class MemoryCacheBackend {
  constructor({ maxEntries = 1000 } = {}) {
    this.maxEntries = maxEntries;
    this.values = new Map();
    this.locks = new Map();
  }

  async get(key) {
    const item = this.values.get(key);
    if (!item) return null;
    if (item.expiresAt <= Date.now()) {
      this.values.delete(key);
      return null;
    }
    this.values.delete(key);
    this.values.set(key, item);
    return item.value;
  }

  async set(key, value, ttlMs) {
    if (!this.values.has(key) && this.values.size >= this.maxEntries) {
      this.values.delete(this.values.keys().next().value);
    }
    this.values.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async delete(key) {
    this.values.delete(key);
  }

  async acquire(key, token, ttlMs) {
    const existing = this.locks.get(key);
    if (existing && existing.expiresAt > Date.now()) return false;
    this.locks.set(key, { token, expiresAt: Date.now() + ttlMs });
    return true;
  }

  async release(key, token) {
    if (this.locks.get(key)?.token === token) this.locks.delete(key);
  }

  async ping() {
    return 'PONG';
  }

  async close() {}
}

export class RedisCacheBackend {
  constructor(client, prefix = 'ermiana') {
    this.client = client;
    this.prefix = prefix;
  }

  key(value) {
    return `${this.prefix}:${value}`;
  }

  async get(key) {
    const value = await this.client.get(this.key(key));
    return value ? JSON.parse(value) : null;
  }

  async set(key, value, ttlMs) {
    if (ttlMs === undefined) {
      await this.client.set(this.key(key), JSON.stringify(value));
    } else {
      await this.client.set(this.key(key), JSON.stringify(value), { PX: ttlMs });
    }
  }

  async getMany(keys) {
    const values = await this.client.mGet(keys.map((key) => this.key(key)));
    return values.map((value) => value === null ? null : JSON.parse(value));
  }

  async delete(key) {
    await this.client.del(this.key(key));
  }

  async acquire(key, token, ttlMs) {
    return (await this.client.set(this.key(key), token, { NX: true, PX: ttlMs })) === 'OK';
  }

  async release(key, token) {
    await this.client.eval(
      'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
      { keys: [this.key(key)], arguments: [token] },
    );
  }

  async ping() {
    return this.client.ping();
  }

  async close() {
    if (this.client.isOpen) await this.client.quit();
  }
}

export class CacheBusyError extends Error {
  constructor(key) {
    super(`Timed out waiting for cache fill: ${key}`);
    this.name = 'CacheBusyError';
  }
}

export class CacheService {
  #inflight = new Map();

  constructor({ backend, fallback = new MemoryCacheBackend(), ttlSeconds = 300, staleTtlSeconds = 0, lockTtlMs = 10000, waitTimeoutMs = 6000, logger } = {}) {
    this.backend = backend ?? fallback;
    this.fallback = fallback;
    this.ttlSeconds = ttlSeconds;
    this.staleTtlSeconds = staleTtlSeconds;
    this.lockTtlMs = lockTtlMs;
    this.waitTimeoutMs = waitTimeoutMs;
    this.logger = logger;
  }

  formatKey(namespace, key) {
    return `cache:${namespace}:${key}`;
  }

  async selectBackend(key) {
    try {
      return { backend: this.backend, cached: await this.backend.get(key) };
    } catch (error) {
      this.logger?.warn({ err: error }, 'redis unavailable; using process-local cache');
      return { backend: this.fallback, cached: await this.fallback.get(key) };
    }
  }

  async get(namespace, key) {
    const cacheKey = this.formatKey(namespace, key);
    const selected = await this.selectBackend(cacheKey);
    let cached = selected.cached;
    if (!cached && selected.backend !== this.fallback) cached = await this.fallback.get(cacheKey);
    return cached?.staleUntil > Date.now() ? cached.value : null;
  }

  async set(namespace, key, value, { ttlSeconds = this.ttlSeconds, staleTtlSeconds = 0 } = {}) {
    const cacheKey = this.formatKey(namespace, key);
    const now = Date.now();
    const envelope = {
      value,
      freshUntil: now + ttlSeconds * 1000,
      staleUntil: now + (ttlSeconds + staleTtlSeconds) * 1000,
    };
    try {
      await this.backend.set(cacheKey, envelope, (ttlSeconds + staleTtlSeconds) * 1000);
    } catch (error) {
      this.logger?.warn({ err: error }, 'redis write failed; writing process-local cache');
      await this.fallback.set(cacheKey, envelope, (ttlSeconds + staleTtlSeconds) * 1000);
    }
  }

  async delete(namespace, key) {
    const cacheKey = this.formatKey(namespace, key);
    const results = await Promise.allSettled([this.backend.delete(cacheKey), this.fallback.delete(cacheKey)]);
    for (const result of results) {
      if (result.status === 'rejected') this.logger?.warn({ err: result.reason, namespace }, 'cache delete failed');
    }
  }

  getOrLoad(namespace, key, loader, options) {
    const inflightKey = this.formatKey(namespace, key);
    const existing = this.#inflight.get(inflightKey);
    if (existing) return existing;

    const promise = this.#getOrLoad(namespace, key, loader, options).finally(() => {
      if (this.#inflight.get(inflightKey) === promise) this.#inflight.delete(inflightKey);
    });
    this.#inflight.set(inflightKey, promise);
    return promise;
  }

  async #getOrLoad(namespace, key, loader, { ttlSeconds = this.ttlSeconds, staleTtlSeconds = this.staleTtlSeconds } = {}) {
    const cacheKey = this.formatKey(namespace, key);
    const lockKey = `lock:${namespace}:${key}`;
    const selected = await this.selectBackend(cacheKey);
    let backend = selected.backend;
    let cached = selected.cached;
    if (!cached && backend !== this.fallback) cached = await this.fallback.get(cacheKey);
    const now = Date.now();
    if (cached?.freshUntil > now) return cached.value;

    const token = randomUUID();
    let acquired;
    try {
      acquired = await backend.acquire(lockKey, token, this.lockTtlMs);
    } catch (error) {
      this.logger?.warn({ err: error }, 'redis lock failed; using process-local cache');
      backend = this.fallback;
      cached = await backend.get(cacheKey);
      if (cached?.freshUntil > Date.now()) return cached.value;
      acquired = await backend.acquire(lockKey, token, this.lockTtlMs);
    }
    if (!acquired) {
      if (cached?.staleUntil > now) return cached.value;
      const deadline = now + this.waitTimeoutMs;
      while (Date.now() < deadline) {
        await delay(75);
        const filled = await backend.get(cacheKey);
        if (filled?.freshUntil > Date.now()) return filled.value;
      }
      throw new CacheBusyError(cacheKey);
    }

    try {
      const value = await loader();
      const writtenAt = Date.now();
      const envelope = {
        value,
        freshUntil: writtenAt + ttlSeconds * 1000,
        staleUntil: writtenAt + (ttlSeconds + staleTtlSeconds) * 1000,
      };
      try {
        await backend.set(cacheKey, envelope, (ttlSeconds + staleTtlSeconds) * 1000);
      } catch (error) {
        this.logger?.warn({ err: error }, 'redis cache fill write failed; using process-local cache');
        await this.fallback.set(cacheKey, envelope, (ttlSeconds + staleTtlSeconds) * 1000);
      }
      return value;
    } catch (error) {
      if (cached?.staleUntil > Date.now()) {
        this.logger?.warn({ namespace, err: error }, 'upstream failed; serving stale preview');
        return cached.value;
      }
      throw error;
    } finally {
      await backend.release(lockKey, token).catch((error) => {
        this.logger?.warn({ err: error }, 'cache lock release failed');
      });
    }
  }

  async ping() {
    return this.backend.ping();
  }

  async close() {
    const results = await Promise.allSettled([this.backend.close(), this.fallback.close()]);
    for (const result of results) {
      if (result.status === 'rejected') this.logger?.warn({ err: result.reason }, 'cache backend close failed');
    }
  }
}

const CONNECT_TIMEOUT_MS = 5000;
const RECONNECT_MAX_DELAY_MS = 3000;

function destroyQuietly(client) {
  try {
    client?.destroy();
  } catch {
    return;
  }
}

function connectRetryDelay(attempt, { retryInitialDelayMs, retryMaxDelayMs }) {
  const target = Math.min(retryInitialDelayMs * (2 ** attempt), retryMaxDelayMs);
  return Math.round(target / 2 + Math.random() * (target / 2));
}

export async function connectRedis(config, logger, { createClientImpl = createClient, sleep = delay, now = Date.now } = {}) {
  const deadline = now() + config.retryBudgetMs;
  for (let attempt = 0; ; attempt += 1) {
    let connected = false;
    let client;
    try {
      client = createClientImpl({
        url: config.url,
        disableOfflineQueue: true,
        socket: {
          connectTimeout: CONNECT_TIMEOUT_MS,
          reconnectStrategy: (retries) => (
            connected ? Math.min(100 * (2 ** retries), RECONNECT_MAX_DELAY_MS) : false
          ),
        },
      });
      client.on('error', (error) => logger?.warn({ err: error }, 'redis client error'));
      await client.connect();
      connected = true;
      logger?.info({ attempts: attempt + 1 }, 'redis connected');
      return new RedisCacheBackend(client, config.keyPrefix);
    } catch (error) {
      destroyQuietly(client);
      if (!config.required) {
        logger?.warn({ err: error }, 'redis connection failed; using process-local cache');
        return null;
      }
      const waitMs = connectRetryDelay(attempt, config);
      if (now() + waitMs >= deadline) {
        logger?.error(
          { err: error, attempts: attempt + 1 },
          'redis connection failed and the retry budget is exhausted; exiting so the supervisor can restart this process',
        );
        throw error;
      }
      logger?.warn({ err: error, attempt: attempt + 1, waitMs }, 'redis connection failed; retrying');
      await sleep(waitMs);
    }
  }
}
