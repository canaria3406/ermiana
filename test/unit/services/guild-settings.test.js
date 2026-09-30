import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  DEFAULT_GUILD_CONFIG,
  GuildCacheUnavailableError,
  GuildSettingsStore,
} from '../../../src/services/guild-settings.js';

class FakeRedisClient extends EventEmitter {
  constructor(values) {
    super();
    this.values = values;
  }

  async *scanIterator({ MATCH: pattern }) {
    const prefix = pattern.slice(0, -1);
    yield [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }

  multi() {
    const operations = [];
    return {
      del(key) { operations.push(['delete', key]); return this; },
      set(key, value) { operations.push(['set', key, value]); return this; },
      exec: async () => {
        for (const [operation, key, value] of operations) {
          if (operation === 'delete') this.values.delete(key);
          else this.values.set(key, value);
        }
        return operations.map(() => 'OK');
      },
    };
  }
}

class FakeRedisBackend {
  constructor(prefix = 'test') {
    this.prefix = prefix;
    this.values = new Map();
    this.client = new FakeRedisClient(this.values);
    this.failWrites = false;
    this.failReads = false;
  }

  key(key) {
    return `${this.prefix}:${key}`;
  }

  async get(key) {
    if (this.failReads) throw new Error('Redis read failed');
    const value = this.values.get(this.key(key));
    return value === undefined ? null : JSON.parse(value);
  }

  async getMany(keys) {
    return Promise.all(keys.map((key) => this.get(key)));
  }

  async set(key, value) {
    if (this.failWrites) throw new Error('Redis write failed');
    this.values.set(this.key(key), JSON.stringify(value));
  }

  async delete(key) {
    if (this.failWrites) throw new Error('Redis write failed');
    return this.values.delete(this.key(key));
  }

  async acquire(key, token) {
    const fullKey = this.key(key);
    if (this.values.has(fullKey)) return false;
    this.values.set(fullKey, token);
    return true;
  }

  async release(key, token) {
    const fullKey = this.key(key);
    if (this.values.get(fullKey) === token) this.values.delete(fullKey);
  }
}

function createFixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'ermiana-guild-settings-'));
  const databasePath = join(directory, 'guilds.db');
  const redis = new FakeRedisBackend();
  const errors = [];
  const store = new GuildSettingsStore({
    databasePath,
    redis,
    providerIds: ['twitter', 'bahamut', 'pixiv'],
    logger: { info() {}, warn() {}, error(details) { errors.push(details); } },
  });
  t.after(() => {
    if (!store.closed) store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return { store, redis, errors, databasePath };
}

test('stores only customized Guilds and deletes the row after restoring every preview', async (t) => {
  const { store, redis } = createFixture(t);
  await store.initialize({ forceRebuild: true });

  const disabled = await store.togglePreview('376829040637509652', 'twitter');
  assert.equal(disabled.disabled, true);
  assert.equal(disabled.cacheUpdated, true);
  assert.deepEqual(
    store.readCustomConfig('376829040637509652'),
    { disabledPreviews: ['twitter'] },
  );
  assert.deepEqual(
    await store.getGuildConfig('376829040637509652'),
    { disabledPreviews: ['twitter'] },
  );
  assert.equal(redis.values.has('test:guild:v1:376829040637509652'), true);

  const restored = await store.togglePreview('376829040637509652', 'twitter');
  assert.equal(restored.disabled, false);
  assert.equal(store.readCustomConfig('376829040637509652'), null);
  assert.equal(redis.values.has('test:guild:v1:376829040637509652'), false);
  assert.strictEqual(await store.getGuildConfig('376829040637509652'), DEFAULT_GUILD_CONFIG);
});

test('stores explicit Twitter styles and deletes them when restoring the default', async (t) => {
  const { store } = createFixture(t);
  await store.initialize({ forceRebuild: true });

  const old = await store.setTwitterStyle('guild', 'old');
  assert.equal(old.twitterStyle, 'old');
  assert.deepEqual(store.readCustomConfig('guild'), { twitterStyle: 'old' });
  assert.deepEqual(await store.getPreviewSettings('guild', 'twitter'), {
    disabled: false,
    twitterStyle: 'old',
  });

  const result = await store.setTwitterStyle('guild', 'new');
  assert.equal(result.twitterStyle, 'new');
  assert.deepEqual(store.readCustomConfig('guild'), { twitterStyle: 'new' });
  assert.deepEqual(await store.getPreviewSettings('guild', 'twitter'), {
    disabled: false,
    twitterStyle: 'new',
  });

  await store.setTwitterStyle('guild', 'default');
  assert.equal(store.readCustomConfig('guild'), null);
  assert.deepEqual(await store.getPreviewSettings('guild', 'twitter'), {
    disabled: false,
    twitterStyle: 'default',
  });
});

test('resetPreviews deletes every disabled provider from SQLite and Redis', async (t) => {
  const { store, redis } = createFixture(t);
  await store.initialize({ forceRebuild: true });
  await store.togglePreview('guild', 'twitter');
  await store.togglePreview('guild', 'pixiv');

  assert.deepEqual(store.readCustomConfig('guild'), { disabledPreviews: ['pixiv', 'twitter'] });
  assert.equal(redis.values.has('test:guild:v1:guild'), true);

  const result = await store.resetPreviews('guild');
  assert.equal(result.cacheUpdated, true);
  assert.strictEqual(result.config, DEFAULT_GUILD_CONFIG);
  assert.equal(store.readCustomConfig('guild'), null);
  assert.equal(redis.values.has('test:guild:v1:guild'), false);
  assert.strictEqual(await store.getGuildConfig('guild'), DEFAULT_GUILD_CONFIG);
});

test('treats a ready Redis miss as the default without falling back to SQLite', async (t) => {
  const { store, redis } = createFixture(t);
  await store.initialize({ forceRebuild: true });
  await store.togglePreview('guild', 'pixiv');
  redis.values.delete('test:guild:v1:guild');

  assert.deepEqual(store.readCustomConfig('guild'), { disabledPreviews: ['pixiv'] });
  assert.strictEqual(await store.getGuildConfig('guild'), DEFAULT_GUILD_CONFIG);
});

test('a usable cache never touches SQLite, whether the Guild is customized or default', async (t) => {
  const { store } = createFixture(t);
  await store.initialize({ forceRebuild: true });
  await store.togglePreview('guild', 'twitter');

  let databaseReads = 0;
  const readCustomConfig = store.readCustomConfig.bind(store);
  store.readCustomConfig = (...args) => {
    databaseReads += 1;
    return readCustomConfig(...args);
  };

  for (let i = 0; i < 50; i += 1) {
    assert.deepEqual(await store.getGuildConfig('guild'), { disabledPreviews: ['twitter'] });
    assert.strictEqual(await store.getGuildConfig('uncustomized'), DEFAULT_GUILD_CONFIG);
  }

  assert.equal(databaseReads, 0);
});

test('serves guild settings from SQLite while Redis reads fail, then returns to Redis', async (t) => {
  const { store, redis } = createFixture(t);
  await store.initialize({ forceRebuild: true });
  await store.togglePreview('guild', 'pixiv');

  const recoverGuildCache = store.recoverGuildCache.bind(store);
  let recoveries = 0;
  store.recoverGuildCache = async () => { recoveries += 1; };

  redis.failReads = true;
  assert.deepEqual(await store.getGuildConfig('guild'), { disabledPreviews: ['pixiv'] });
  assert.strictEqual(await store.getGuildConfig('uncustomized'), DEFAULT_GUILD_CONFIG);
  assert.equal(store.readingFromDatabase, true);
  assert.equal(store.cacheReady, false);
  assert.equal(recoveries > 0, true);

  redis.failReads = false;
  store.recoverGuildCache = recoverGuildCache;
  await store.recoverGuildCache();
  assert.deepEqual(await store.getGuildConfig('guild'), { disabledPreviews: ['pixiv'] });
  assert.equal(store.readingFromDatabase, false);
  assert.equal(store.cacheReady, true);
});

test('serves guild settings from SQLite when no Redis backend is attached at all', async (t) => {
  const { store } = createFixture(t);
  await store.initialize({ forceRebuild: true });
  await store.togglePreview('guild', 'bahamut');
  store.attachRedis(null);

  assert.deepEqual(await store.getGuildConfig('guild'), { disabledPreviews: ['bahamut'] });
});

test('still reports the cache unavailable when SQLite cannot answer either', async (t) => {
  const { store, redis } = createFixture(t);
  await store.initialize({ forceRebuild: true });
  redis.failReads = true;
  store.close();

  await assert.rejects(() => store.getGuildConfig('guild'), GuildCacheUnavailableError);
});

test('keeps the committed SQLite setting when Redis update fails and repairs it by rebuilding', async (t) => {
  const { store, redis, errors } = createFixture(t);
  await store.initialize({ forceRebuild: true });
  redis.failWrites = true;

  const result = await store.togglePreview('guild', 'bahamut');
  assert.equal(result.cacheUpdated, false);
  assert.deepEqual(store.readCustomConfig('guild'), { disabledPreviews: ['bahamut'] });
  assert.equal(errors.length > 0, true);
  assert.deepEqual(await store.getGuildConfig('guild'), { disabledPreviews: ['bahamut'] });

  redis.failWrites = false;
  await store.recoverGuildCache();
  assert.deepEqual(await store.getGuildConfig('guild'), { disabledPreviews: ['bahamut'] });
});

test('keeps a preview reset committed when Redis fails and removes the stale key after recovery', async (t) => {
  const { store, redis, errors } = createFixture(t);
  await store.initialize({ forceRebuild: true });
  await store.togglePreview('guild', 'twitter');
  const scheduleRecovery = store.scheduleRecovery.bind(store);
  let scheduledRecoveries = 0;
  store.scheduleRecovery = () => { scheduledRecoveries += 1; };
  redis.failWrites = true;

  const result = await store.resetPreviews('guild');
  assert.equal(result.cacheUpdated, false);
  assert.strictEqual(result.config, DEFAULT_GUILD_CONFIG);
  assert.equal(store.readCustomConfig('guild'), null);
  assert.equal(redis.values.has('test:guild:v1:guild'), true);
  assert.equal(errors.length > 0, true);
  assert.strictEqual(await store.getGuildConfig('guild'), DEFAULT_GUILD_CONFIG);
  assert.equal(scheduledRecoveries > 0, true);

  redis.failWrites = false;
  store.scheduleRecovery = scheduleRecovery;
  await store.recoverGuildCache();
  assert.equal(redis.values.has('test:guild:v1:guild'), false);
  assert.strictEqual(await store.getGuildConfig('guild'), DEFAULT_GUILD_CONFIG);
});

test('preload removes stale Guild keys and rebuilds only SQLite custom rows', async (t) => {
  const { store, redis } = createFixture(t);
  await store.initialize({ forceRebuild: true });
  await store.togglePreview('guild', 'twitter');
  redis.values.set('test:guild:v1:stale', JSON.stringify({ disabledPreviews: ['pixiv'] }));
  redis.values.delete('test:guild:v1:guild');

  await store.rebuildGuildCache({ force: true });
  assert.equal(redis.values.has('test:guild:v1:stale'), false);
  assert.deepEqual(await store.getGuildConfig('guild'), { disabledPreviews: ['twitter'] });
  const marker = await redis.get('guild-cache:v1:ready');
  assert.equal(marker.version, 1);
  assert.equal(marker.records, 1);
});

test('reuses a complete Guild cache when the non-expiring ready marker still exists', async (t) => {
  const { store, redis } = createFixture(t);
  await store.initialize({ forceRebuild: true });
  await store.togglePreview('guild', 'twitter');
  let rebuilds = 0;
  const rebuildGuildCache = store.rebuildGuildCache.bind(store);
  store.rebuildGuildCache = (...args) => {
    rebuilds += 1;
    return rebuildGuildCache(...args);
  };

  await store.initialize();
  assert.equal(rebuilds, 0);
  assert.deepEqual(await redis.get('guild:v1:guild'), { disabledPreviews: ['twitter'] });
});

test('does not treat a missing ready marker as a default Guild and rebuilds before resuming', async (t) => {
  const { store, redis } = createFixture(t);
  await store.initialize({ forceRebuild: true });
  await store.togglePreview('guild', 'twitter');
  await redis.delete('guild-cache:v1:ready');

  assert.deepEqual(await store.getGuildConfig('guild'), { disabledPreviews: ['twitter'] });
  await store.recoverGuildCache();
  assert.deepEqual(await store.getGuildConfig('guild'), { disabledPreviews: ['twitter'] });
});

test('passive cache readiness probe reads only the marker and never schedules a rebuild', async (t) => {
  const { store, redis } = createFixture(t);
  await store.initialize({ forceRebuild: true });
  let recoveries = 0;
  store.recoverGuildCache = async () => { recoveries += 1; };

  assert.equal(await store.probeCacheReady(), true);
  await redis.delete('guild-cache:v1:ready');
  assert.equal(await store.probeCacheReady(), false);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(recoveries, 0);
});

test('enables SQLite WAL, FULL synchronous writes, foreign keys, and a busy timeout', (t) => {
  const { store } = createFixture(t);
  assert.equal(store.database.prepare('PRAGMA journal_mode').get().journal_mode, 'wal');
  assert.equal(store.database.prepare('PRAGMA synchronous').get().synchronous, 2);
  assert.equal(store.database.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  assert.equal(store.database.prepare('PRAGMA busy_timeout').get().timeout, 5000);
});
