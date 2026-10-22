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

test('stores expiring JSON and coordinates locks across Redis connections', async () => {
  assert.equal(await firstClient.ping(), 'PONG');
  await firstBackend.set('json', { answer: 42 }, 2000);
  assert.deepEqual(await secondBackend.get('json'), { answer: 42 });
  const ttl = await firstClient.pTTL(firstBackend.key('json'));
  assert.ok(ttl > 0 && ttl <= 2000);

  await firstBackend.set('short-lived', 'value', 40);
  await delay(60);
  assert.equal(await secondBackend.get('short-lived'), null);

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
    cacheOwner: true,
  });
  t.after(() => {
    if (!store.closed) store.close();
    rmSync(directory, { recursive: true, force: true });
  });

  await store.rebuildGuildCache({ force: true });
  await store.togglePreview('guild', 'twitter');
  const key = firstBackend.key('guild:v1:guild');
  assert.equal(await firstClient.pTTL(key), -1);
  assert.deepEqual(JSON.parse(await firstClient.get(key)), { disabledPreviews: ['twitter'] });
  store.close();

  await firstClient.del([key, firstBackend.key('guild-cache:v1:ready')]);
  store = new GuildSettingsStore({
    databasePath,
    redis: secondBackend,
    providerIds: ['twitter', 'bahamut'],
    cacheOwner: true,
  });
  await store.rebuildGuildCache({ force: true });
  assert.deepEqual(
    await store.getGuildConfig('guild'),
    { disabledPreviews: ['twitter'] },
  );

  await store.togglePreview('guild', 'twitter');
  assert.equal(store.readCustomConfig('guild'), null);
  assert.equal(await firstClient.exists(key), 0);
});

test('exposes a read-only Guild settings cache to each shard runtime', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ermiana-runtime-guild-'));
  const databasePath = join(directory, 'guilds.db');
  const runtimePrefix = `${prefix}:runtime`;
  const baseConfig = loadConfig({ DISCORD_TOKEN: 'test' });
  const config = {
    ...baseConfig,
    redis: { ...baseConfig.redis, url: redisUrl, required: true, keyPrefix: runtimePrefix },
    guild: { databasePath },
  };
  const managerStore = new GuildSettingsStore({
    databasePath,
    redis: new RedisCacheBackend(firstClient, runtimePrefix),
    providerIds: ['twitter', 'bahamut'],
    cacheOwner: true,
  });
  await managerStore.rebuildGuildCache({ force: true });
  const runtime = await createRuntime(config);
  t.after(async () => {
    await runtime.close();
    managerStore.close();
    rmSync(directory, { recursive: true, force: true });
  });

  assert.ok(runtime.guildSettings instanceof GuildSettingsStore);
  assert.strictEqual(await runtime.guildSettings.getGuildConfig('new-guild'), DEFAULT_GUILD_CONFIG);
  assert.equal(runtime.guildSettings.cacheReady, true);
  await assert.rejects(
    runtime.guildSettings.rebuildGuildCache({ force: true }),
    /Only the manager process may rebuild/,
  );
});

