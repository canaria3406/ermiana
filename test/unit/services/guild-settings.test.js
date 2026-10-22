import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import {
  DEFAULT_GUILD_CONFIG,
  GuildDatabaseEmptyError,
  GuildSettingsStore,
} from '../../../src/services/guild-settings.js';

class FakeRedisClient extends EventEmitter {
  constructor(values) {
    super();
    this.values = values;
    this.scanCalls = 0;
    this.isReady = true;
  }

  async *scanIterator({ MATCH: pattern }) {
    this.scanCalls += 1;
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

test('rebuild refuses an empty SQLite database before changing Redis Guild settings', async (t) => {
  const { store, redis } = createFixture(t);
  redis.values.set(redis.key('guild:v1:123'), JSON.stringify({ disabledPreviews: ['twitter'] }));
  redis.values.set(redis.key('guild-cache:v1:ready'), JSON.stringify({ version: 1 }));
  const before = new Map(redis.values);

  await assert.rejects(
    store.rebuildGuildCache({ force: true }),
    GuildDatabaseEmptyError,
  );
  assert.deepEqual(redis.values, before);
});

test('rebuild accepts a new installation with an empty SQLite database and Redis', async (t) => {
  const { store, redis } = createFixture(t);

  await store.rebuildGuildCache({ force: true });
  assert.equal((await redis.get('guild-cache:v1:ready')).records, 0);
});

class FakeRedisBackend {
  constructor(prefix = 'test') {
    this.prefix = prefix;
    this.values = new Map();
    this.client = new FakeRedisClient(this.values);
    this.failWrites = false;
    this.failReads = false;
    this.getCalls = 0;
  }

  key(key) {
    return `${this.prefix}:${key}`;
  }

  async get(key) {
    this.getCalls += 1;
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

function createFixture(
  t,
  providerIds = ['twitter', 'bahamut', 'pixiv'],
  { cacheOwner = true, rebuildWaitMs, onDatabaseEmpty } = {},
) {
  const directory = mkdtempSync(join(tmpdir(), 'ermiana-guild-settings-'));
  const databasePath = join(directory, 'guilds.db');
  const redis = new FakeRedisBackend();
  const errors = [];
  const fatals = [];
  const infos = [];
  const store = new GuildSettingsStore({
    databasePath,
    redis,
    providerIds,
    cacheOwner,
    rebuildWaitMs,
    onDatabaseEmpty,
    logger: {
      info(...args) { infos.push(args); },
      warn() {},
      error(details) { errors.push(details); },
      fatal(...args) { fatals.push(args); },
    },
  });
  t.after(() => {
    if (!store.closed) store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return { store, redis, errors, fatals, infos, databasePath };
}

test('stores only customized Guilds and deletes the row after restoring every preview', async (t) => {
  const { store, redis } = createFixture(t);
  await store.rebuildGuildCache({ force: true });

  const disabled = await store.togglePreview('guild', 'twitter');
  assert.equal(disabled.disabled, true);
  assert.equal(disabled.cacheUpdated, true);
  assert.deepEqual(
    store.readCustomConfig('guild'),
    { disabledPreviews: ['twitter'] },
  );
  assert.deepEqual(
    await store.getGuildConfig('guild'),
    { disabledPreviews: ['twitter'] },
  );
  assert.equal(redis.values.has('test:guild:v1:guild'), true);

  const restored = await store.togglePreview('guild', 'twitter');
  assert.equal(restored.disabled, false);
  assert.equal(store.readCustomConfig('guild'), null);
  assert.equal(redis.values.has('test:guild:v1:guild'), false);
  assert.strictEqual(await store.getGuildConfig('guild'), DEFAULT_GUILD_CONFIG);
});

test('stores explicit old/new Twitter styles and treats a missing style as default', async (t) => {
  const { store, redis } = createFixture(t);
  await store.rebuildGuildCache({ force: true });

  assert.equal((await store.getPreviewSettings('guild', 'twitter')).twitterStyle, 'default');

  const selectedOld = await store.setTwitterStyle('guild', 'old');
  assert.equal(selectedOld.twitterStyle, 'old');
  assert.equal(selectedOld.cacheUpdated, true);
  assert.deepEqual(store.readCustomConfig('guild'), { twitterStyle: 'old' });
  assert.deepEqual(await redis.get('guild:v1:guild'), { twitterStyle: 'old' });
  assert.equal((await store.getPreviewSettings('guild', 'twitter')).twitterStyle, 'old');

  const selectedNew = await store.setTwitterStyle('guild', 'new');
  assert.equal(selectedNew.twitterStyle, 'new');
  assert.equal(selectedNew.cacheUpdated, true);
  assert.deepEqual(store.readCustomConfig('guild'), { twitterStyle: 'new' });
  assert.deepEqual(await redis.get('guild:v1:guild'), { twitterStyle: 'new' });
  assert.equal((await store.getPreviewSettings('guild', 'twitter')).twitterStyle, 'new');

  await store.togglePreview('guild', 'twitter');
  assert.deepEqual(store.readCustomConfig('guild'), {
    disabledPreviews: ['twitter'],
    twitterStyle: 'new',
  });

  const restored = await store.setTwitterStyle('guild', 'default');
  assert.equal(restored.twitterStyle, 'default');
  assert.deepEqual(store.readCustomConfig('guild'), { disabledPreviews: ['twitter'] });
  assert.equal((await store.getPreviewSettings('guild', 'twitter')).twitterStyle, 'default');

  await store.togglePreview('guild', 'twitter');
  await store.setTwitterStyle('guild', 'default');
  assert.equal(store.readCustomConfig('guild'), null);
  assert.equal(redis.values.has('test:guild:v1:guild'), false);
});

test('treats a ready Redis miss as the default without falling back to SQLite', async (t) => {
  const { store, redis } = createFixture(t);
  await store.rebuildGuildCache({ force: true });
  await store.togglePreview('guild', 'pixiv');
  redis.values.delete('test:guild:v1:guild');

  assert.deepEqual(store.readCustomConfig('guild'), { disabledPreviews: ['pixiv'] });
  assert.strictEqual(await store.getGuildConfig('guild'), DEFAULT_GUILD_CONFIG);
});

test('serves guild settings from SQLite while Redis reads fail, then returns to Redis', async (t) => {
  const { store, redis } = createFixture(t);
  await store.rebuildGuildCache({ force: true });
  await store.togglePreview('guild', 'pixiv');

  redis.failReads = true;
  assert.deepEqual(await store.getGuildConfig('guild'), { disabledPreviews: ['pixiv'] });
  assert.strictEqual(await store.getGuildConfig('uncustomized'), DEFAULT_GUILD_CONFIG);
  assert.equal(store.readingFromDatabase, true);
  assert.equal(store.cacheReady, false);

  redis.failReads = false;
  await store.recoverGuildCache();
  assert.deepEqual(await store.getGuildConfig('guild'), { disabledPreviews: ['pixiv'] });
  assert.equal(store.readingFromDatabase, false);
  assert.equal(store.cacheReady, true);
});

test('keeps the committed SQLite setting when Redis update fails and a manager rebuild repairs it', async (t) => {
  const { store, redis, errors } = createFixture(t);
  await store.rebuildGuildCache({ force: true });
  redis.failWrites = true;

  const result = await store.togglePreview('guild', 'bahamut');
  assert.equal(result.cacheUpdated, false);
  assert.deepEqual(store.readCustomConfig('guild'), { disabledPreviews: ['bahamut'] });
  assert.equal(errors.length > 0, true);

  redis.failWrites = false;
  await store.recoverGuildCache({ forceRebuild: true });
  assert.deepEqual(await store.getGuildConfig('guild'), { disabledPreviews: ['bahamut'] });
});

test('preload removes stale Guild keys and rebuilds only SQLite custom rows', async (t) => {
  const { store, redis } = createFixture(t);
  await store.rebuildGuildCache({ force: true });
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

test('manager startup always rebuilds even when a ready marker already exists', async (t) => {
  const { store, redis, infos } = createFixture(t);
  await store.rebuildGuildCache({ force: true });
  await store.togglePreview('guild', 'twitter');
  redis.values.set('test:guild:v1:guild', JSON.stringify({ disabledPreviews: ['pixiv'] }));

  await store.rebuildGuildCache({ force: true });
  assert.deepEqual(await redis.get('guild:v1:guild'), { disabledPreviews: ['twitter'] });
  assert.equal(infos.filter((entry) => entry.at(-1) === 'guild cache rebuilt from SQLite').length, 2);
});

test('shard reads SQLite for a missing marker without starting any rebuild', async (t) => {
  const { store, redis } = createFixture(t, undefined, { cacheOwner: false });
  store.database.prepare('INSERT INTO guilds (guild_id, data, updated_at) VALUES (?, ?, ?)')
    .run('guild', JSON.stringify({ disabledPreviews: ['twitter'] }), Date.now());
  let rebuilds = 0;
  store.rebuildGuildCache = async () => { rebuilds += 1; };

  assert.deepEqual(await store.getGuildConfig('guild'), { disabledPreviews: ['twitter'] });
  redis.client.emit('ready');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(rebuilds, 0);
});

test('manager periodic check rebuilds after the ready marker is deleted', async (t) => {
  const { store, redis } = createFixture(t);
  store.database.prepare('INSERT INTO guilds (guild_id, data, updated_at) VALUES (?, ?, ?)')
    .run('guild', JSON.stringify({ twitterStyle: 'new' }), Date.now());
  await store.rebuildGuildCache({ force: true });
  await redis.delete('guild-cache:v1:ready');

  assert.equal(store.startCacheMonitor({ intervalMs: 10 }), true);
  assert.equal(store.cacheCheckTimer.hasRef(), false);
  for (let attempts = 0; attempts < 20 && await redis.get('guild-cache:v1:ready') === null; attempts += 1) {
    await delay(10);
  }

  assert.equal((await redis.get('guild-cache:v1:ready')).records, 1);
  assert.deepEqual(await redis.get('guild:v1:guild'), { twitterStyle: 'new' });
});

test('manager logs one recovery error per failure state and reports the first success', async (t) => {
  const { store, redis, errors, infos } = createFixture(t);
  await store.rebuildGuildCache({ force: true });
  infos.length = 0;
  redis.failReads = true;

  assert.equal(await store.recoverGuildCache(), false);
  assert.equal(await store.recoverGuildCache(), false);
  assert.equal(await store.recoverGuildCache(), false);
  assert.equal(errors.length, 1);

  redis.failReads = false;
  assert.equal(await store.recoverGuildCache(), true);
  assert.equal(await store.recoverGuildCache(), true);
  assert.equal(infos.filter((entry) => entry.at(-1) === 'guild cache recovery succeeded').length, 1);
});

test('enables SQLite WAL, FULL synchronous writes, foreign keys, and a busy timeout', (t) => {
  const { store } = createFixture(t);
  assert.equal(store.database.prepare('PRAGMA journal_mode').get().journal_mode, 'wal');
  assert.equal(store.database.prepare('PRAGMA synchronous').get().synchronous, 2);
  assert.equal(store.database.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  assert.equal(store.database.prepare('PRAGMA busy_timeout').get().timeout, 5000);
});
