import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { createClient } from 'redis';
import { CacheService, MemoryCacheBackend, RedisCacheBackend } from '../../src/core/cache.js';
import { loadConfig } from '../../src/config.js';
import { PreviewService } from '../../src/core/preview-service.js';
import { ProviderRegistry } from '../../src/core/provider-registry.js';
import { blueskyProvider } from '../../src/providers/bluesky.js';
import { twitterProvider } from '../../src/providers/twitter.js';
import { DEFAULT_GUILD_CONFIG, GuildSettingsStore } from '../../src/services/guild-settings.js';
import { createRuntime } from '../../src/runtime.js';

const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379/0';
const prefix = `ermiana:test:${randomUUID()}`;
const clientOptions = {
  url: redisUrl,
  disableOfflineQueue: true,
  socket: { connectTimeout: 5000, reconnectStrategy: false },
};
const firstClient = createClient(clientOptions);
const secondClient = createClient(clientOptions);
firstClient.on('error', () => {});
secondClient.on('error', () => {});
const firstBackend = new RedisCacheBackend(firstClient, prefix);
const secondBackend = new RedisCacheBackend(secondClient, prefix);

test.before(async () => {
  await Promise.all([firstClient.connect(), secondClient.connect()]);
});
test.after(async () => {
  if (firstClient.isOpen) {
    const keys = [];
    for await (const batch of firstClient.scanIterator({ MATCH: `${prefix}:*`, COUNT: 100 })) {
      keys.push(...batch);
    }
    if (keys.length > 0) await firstClient.del(keys);
  }
  await Promise.allSettled([
    firstClient.isOpen ? firstClient.quit() : undefined,
    secondClient.isOpen ? secondClient.quit() : undefined,
  ]);
});

test('connects to Redis 7+ or a compatible Memurai server', async () => {
  assert.equal(await firstClient.ping(), 'PONG');
  const info = await firstClient.info('server');
  const version = /^redis_version:(\d+)\.(\d+)\.(\d+)/m.exec(info);
  assert.ok(version, 'Redis INFO must report its compatible version');
  assert.ok(Number(version[1]) >= 7, 'Redis 7 or newer is required');
});

test('stores JSON with a real Redis TTL', async () => {
  await firstBackend.set('json', { answer: 42 }, 2000);
  assert.deepEqual(await secondBackend.get('json'), { answer: 42 });
  const ttl = await firstClient.pTTL(firstBackend.key('json'));
  assert.ok(ttl > 0 && ttl <= 2000);

  await firstBackend.set('short-lived', 'value', 40);
  await delay(60);
  assert.equal(await secondBackend.get('short-lived'), null);
});

test('coordinates token-safe locks across independent Redis connections', async () => {
  assert.equal(await firstBackend.acquire('lock', 'owner-one', 2000), true);
  assert.equal(await secondBackend.acquire('lock', 'owner-two', 2000), false);
  await secondBackend.release('lock', 'wrong-owner');
  assert.equal(await secondBackend.acquire('lock', 'owner-two', 2000), false);
  await firstBackend.release('lock', 'owner-one');
  assert.equal(await secondBackend.acquire('lock', 'owner-two', 2000), true);
  await secondBackend.release('lock', 'owner-two');
});

test('deduplicates cache fills across independent Redis connections', async () => {
  const firstCache = new CacheService({
    backend: firstBackend,
    fallback: new MemoryCacheBackend(),
    lockTtlMs: 2000,
    waitTimeoutMs: 2000,
  });
  const secondCache = new CacheService({
    backend: secondBackend,
    fallback: new MemoryCacheBackend(),
    lockTtlMs: 2000,
    waitTimeoutMs: 2000,
  });
  let loads = 0;
  const loader = async () => {
    loads += 1;
    await delay(75);
    return { source: 'memurai' };
  };
  const values = await Promise.all([
    firstCache.getOrLoad('integration', 'shared', loader),
    secondCache.getOrLoad('integration', 'shared', loader),
  ]);
  assert.equal(loads, 1);
  assert.deepEqual(values, [{ source: 'memurai' }, { source: 'memurai' }]);
});

test('rebuilds persistent Guild custom settings into non-expiring Redis keys', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ermiana-redis-guild-'));
  const databasePath = join(directory, 'guilds.db');
  let store = new GuildSettingsStore({
    databasePath,
    redis: firstBackend,
    providerIds: ['twitter', 'bahamut'],
  });
  t.after(() => {
    if (!store.closed) store.close();
    rmSync(directory, { recursive: true, force: true });
  });

  await store.initialize({ forceRebuild: true });
  await store.togglePreview('376829040637509652', 'twitter');
  const key = firstBackend.key('guild:v1:376829040637509652');
  assert.equal(await firstClient.pTTL(key), -1);
  assert.deepEqual(JSON.parse(await firstClient.get(key)), { disabledPreviews: ['twitter'] });
  store.close();

  await firstClient.del([key, firstBackend.key('guild-cache:v1:ready')]);
  store = new GuildSettingsStore({
    databasePath,
    redis: secondBackend,
    providerIds: ['twitter', 'bahamut'],
  });
  await store.initialize({ forceRebuild: true });
  assert.deepEqual(
    await store.getGuildConfig('376829040637509652'),
    { disabledPreviews: ['twitter'] },
  );

  await store.togglePreview('376829040637509652', 'twitter');
  assert.equal(store.readCustomConfig('376829040637509652'), null);
  assert.equal(await firstClient.exists(key), 0);
});

test('exposes the initialized Guild settings store to each shard runtime', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ermiana-runtime-guild-'));
  const config = loadConfig({
    DISCORD_TOKEN: 'test',
    REDIS_URL: redisUrl,
    REDIS_REQUIRED: 'true',
    REDIS_KEY_PREFIX: `${prefix}:runtime`,
    GUILD_DATABASE_PATH: join(directory, 'guilds.db'),
  });
  const runtime = await createRuntime(config);
  t.after(async () => {
    await runtime.close();
    rmSync(directory, { recursive: true, force: true });
  });

  assert.ok(runtime.guildSettings instanceof GuildSettingsStore);
  assert.equal(runtime.guildSettings.cacheReady, true);
  assert.strictEqual(await runtime.guildSettings.getGuildConfig('new-guild'), DEFAULT_GUILD_CONFIG);
});

test('persists only previews with a TTL and an equal stale fallback window', async () => {
  const cache = new CacheService({
    backend: firstBackend,
    fallback: new MemoryCacheBackend(),
    lockTtlMs: 2000,
    waitTimeoutMs: 2000,
  });
  let twitterLoads = 0;
  let blueskyLoads = 0;
  const cachedTwitter = {
    ...twitterProvider,
    patterns: [/https:\/\/example\.test\/twitter\/(\d+)/],
    resolve() {
      twitterLoads += 1;
      return { canonicalUrl: 'https://example.test/twitter/42' };
    },
  };
  const directBluesky = {
    ...blueskyProvider,
    patterns: [/https:\/\/example\.test\/bluesky\/(\d+)/],
    resolve() {
      blueskyLoads += 1;
      return { canonicalUrl: 'https://example.test/bluesky/42' };
    },
  };
  const twitterService = new PreviewService({
    registry: new ProviderRegistry([cachedTwitter]),
    cache,
  });
  const blueskyService = new PreviewService({
    registry: new ProviderRegistry([directBluesky]),
    cache,
  });

  await twitterService.resolve(twitterService.match('https://example.test/twitter/42'));
  await twitterService.resolve(twitterService.match('https://example.test/twitter/42'));
  await blueskyService.resolve(blueskyService.match('https://example.test/bluesky/42'));
  await blueskyService.resolve(blueskyService.match('https://example.test/bluesky/42'));

  assert.equal(twitterLoads, 1);
  assert.equal(blueskyLoads, 2);
  const previewKeys = [];
  for await (const batch of firstClient.scanIterator({ MATCH: `${prefix}:cache:preview:*`, COUNT: 100 })) {
    previewKeys.push(...batch);
  }
  assert.equal(previewKeys.length, 1);
  assert.match(previewKeys[0], /:cache:preview:twitter:/);
  const ttl = await firstClient.pTTL(previewKeys[0]);
  assert.ok(ttl > 7190000 && ttl <= 7200000);
  const envelope = JSON.parse(await firstClient.get(previewKeys[0]));
  assert.equal(envelope.staleUntil - envelope.freshUntil, 3600000);
});

