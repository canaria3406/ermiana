import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as delay } from 'node:timers/promises';

const GUILD_KEY_PREFIX = 'guild:v1:';
const READY_KEY = 'guild-cache:v1:ready';
const REBUILD_LOCK_KEY = 'guild-cache:v1:rebuild-lock';
const REBUILD_LOCK_TTL_MS = 15000;
const REBUILD_WAIT_MS = 20000;

export const DEFAULT_GUILD_CONFIG = Object.freeze({
  disabledPreviews: Object.freeze([]),
});

export const DEFAULT_TWITTER_STYLE = 'default';

export class GuildCacheUnavailableError extends Error {
  constructor(message = 'Guild configuration cache is not ready', options) {
    super(message, options);
    this.name = 'GuildCacheUnavailableError';
  }
}

function guildKey(guildId) {
  return `${GUILD_KEY_PREFIX}${guildId}`;
}

function parseJson(value, context) {
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (error) {
    throw new Error(`Invalid JSON in ${context}`, { cause: error });
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeCustomConfig(value, providerIds, context) {
  const parsed = parseJson(value, context);
  if (!isObject(parsed)) throw new Error(`${context} must contain a JSON object`);
  const normalized = { ...parsed };
  if (parsed.disabledPreviews !== undefined) {
    if (!Array.isArray(parsed.disabledPreviews)) {
      throw new Error(`${context}.disabledPreviews must be an array`);
    }
    normalized.disabledPreviews = [...new Set(parsed.disabledPreviews)]
      .filter((providerId) => providerIds.has(providerId))
      .sort();
    if (normalized.disabledPreviews.length === 0) delete normalized.disabledPreviews;
  }
  if (parsed.twitterStyle !== undefined
    && parsed.twitterStyle !== 'old'
    && parsed.twitterStyle !== 'new') {
    delete normalized.twitterStyle;
  }
  return normalized;
}

function effectiveConfig(customConfig) {
  return {
    ...DEFAULT_GUILD_CONFIG,
    ...customConfig,
    disabledPreviews: Object.freeze([...(customConfig?.disabledPreviews ?? [])]),
  };
}

export class GuildSettingsStore {
  constructor({ databasePath, redis, providerIds, logger }) {
    this.databasePath = databasePath === ':memory:' ? databasePath : resolve(databasePath);
    this.redis = null;
    this.providerIds = new Set(providerIds);
    this.logger = logger;
    this.cacheReady = false;
    this.needsRebuild = false;
    this.rebuildPromise = null;
    this.readingFromDatabase = false;
    this.closed = false;

    if (this.databasePath !== ':memory:') mkdirSync(dirname(this.databasePath), { recursive: true });
    this.database = new DatabaseSync(this.databasePath);
    this.database.exec('PRAGMA journal_mode = WAL');
    this.database.exec('PRAGMA synchronous = FULL');
    this.database.exec('PRAGMA foreign_keys = ON');
    this.database.exec('PRAGMA busy_timeout = 5000');
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS guilds (
        guild_id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    this.selectOne = this.database.prepare('SELECT data FROM guilds WHERE guild_id = ?');
    this.selectAll = this.database.prepare('SELECT guild_id, data FROM guilds ORDER BY guild_id');
    this.upsertOne = this.database.prepare(`
      INSERT INTO guilds (guild_id, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `);
    this.deleteOne = this.database.prepare('DELETE FROM guilds WHERE guild_id = ?');

    this.onRedisUnavailable = () => {
      this.cacheReady = false;
    };
    this.onRedisReady = () => {
      if (!this.closed) void this.recoverGuildCache();
    };
    this.attachRedis(redis);
  }

  attachRedis(redis) {
    this.redis?.client?.off('error', this.onRedisUnavailable);
    this.redis?.client?.off('end', this.onRedisUnavailable);
    this.redis?.client?.off('reconnecting', this.onRedisUnavailable);
    this.redis?.client?.off('ready', this.onRedisReady);
    this.redis = redis;
    this.cacheReady = false;
    this.redis?.client?.on('error', this.onRedisUnavailable);
    this.redis?.client?.on('end', this.onRedisUnavailable);
    this.redis?.client?.on('reconnecting', this.onRedisUnavailable);
    this.redis?.client?.on('ready', this.onRedisReady);
  }

  readCustomConfig(guildId) {
    const row = this.selectOne.get(String(guildId));
    return row ? normalizeCustomConfig(row.data, this.providerIds, `SQLite guild ${guildId}`) : null;
  }

  readAllCustomConfigs() {
    return this.selectAll.all().map((row) => {
      const data = normalizeCustomConfig(row.data, this.providerIds, `SQLite guild ${row.guild_id}`);
      if (Object.keys(data).length === 0) {
        throw new Error(`SQLite guild ${row.guild_id} contains an empty custom configuration`);
      }
      return { guildId: String(row.guild_id), data };
    });
  }

  async initialize({ forceRebuild = false } = {}) {
    if (forceRebuild) return this.rebuildGuildCache({ force: true });
    const recovered = await this.recoverGuildCache();
    if (!recovered) throw new GuildCacheUnavailableError();
    return recovered;
  }

  async recoverGuildCache() {
    if (!this.redis || this.closed) {
      this.cacheReady = false;
      return false;
    }
    try {
      if (this.needsRebuild) return await this.rebuildGuildCache({ force: true });
      const marker = await this.redis.get(READY_KEY);
      if (marker?.version === 1) {
        this.cacheReady = true;
        this.logger?.debug?.({ rebuiltAt: marker.rebuiltAt }, 'Guild cache found in Redis; rebuild skipped');
        return true;
      }
      return await this.rebuildGuildCache({ force: this.needsRebuild });
    } catch (error) {
      this.cacheReady = false;
      this.needsRebuild = true;
      this.logger?.error({ err: error }, 'guild cache recovery failed');
      return false;
    }
  }

  async rebuildGuildCache({ force = false } = {}) {
    if (!this.redis) throw new GuildCacheUnavailableError('Redis is unavailable for guild cache rebuild');
    if (this.rebuildPromise) return this.rebuildPromise;
    this.rebuildPromise = this.#rebuildGuildCache(force).finally(() => {
      this.rebuildPromise = null;
    });
    return this.rebuildPromise;
  }

  async #rebuildGuildCache(force) {
    const rebuildStartedAt = Date.now();
    if (!force) {
      const marker = await this.redis.get(READY_KEY);
      if (marker?.version === 1) {
        this.cacheReady = true;
        return true;
      }
    }

    const token = randomUUID();
    let acquired = await this.redis.acquire(REBUILD_LOCK_KEY, token, REBUILD_LOCK_TTL_MS);
    if (!acquired) {
      const deadline = Date.now() + REBUILD_WAIT_MS;
      while (Date.now() < deadline) {
        await delay(100);
        const marker = await this.redis.get(READY_KEY);
        if (marker?.version === 1 && (!force || marker.rebuiltAt >= rebuildStartedAt)) {
          this.cacheReady = true;
          this.needsRebuild = false;
          return true;
        }
        acquired = await this.redis.acquire(REBUILD_LOCK_KEY, token, REBUILD_LOCK_TTL_MS);
        if (acquired) break;
      }
      if (!acquired) throw new GuildCacheUnavailableError('Timed out waiting for guild cache rebuild');
    }

    this.cacheReady = false;
    try {
      await this.redis.delete(READY_KEY);
      const guilds = this.readAllCustomConfigs();
      const existingKeys = [];
      for await (const batch of this.redis.client.scanIterator({
        MATCH: this.redis.key(`${GUILD_KEY_PREFIX}*`),
        COUNT: 500,
      })) {
        existingKeys.push(...batch);
      }

      const transaction = this.redis.client.multi();
      for (const key of existingKeys) transaction.del(key);
      for (const guild of guilds) {
        transaction.set(this.redis.key(guildKey(guild.guildId)), JSON.stringify(guild.data));
      }
      transaction.set(this.redis.key(READY_KEY), JSON.stringify({
        version: 1,
        records: guilds.length,
        rebuiltAt: Date.now(),
      }));
      const results = await transaction.exec();
      const commandError = results.find((result) => result instanceof Error);
      if (commandError) throw commandError;
      this.needsRebuild = false;
      this.cacheReady = true;
      this.logger?.info({ records: guilds.length }, 'guild cache rebuilt from SQLite');
      return true;
    } finally {
      await this.redis.release(REBUILD_LOCK_KEY, token).catch((error) => {
        this.logger?.warn({ err: error }, 'guild cache rebuild lock release failed');
      });
    }
  }

  scheduleRecovery() {
    if (this.closed || this.rebuildPromise) return;
    void this.recoverGuildCache();
  }

  async probeCacheReady() {
    if (!this.redis || this.closed) return false;
    try {
      const marker = await this.redis.get(READY_KEY);
      return this.cacheReady && !this.needsRebuild && marker?.version === 1;
    } catch {
      return false;
    }
  }

  async invalidateReadyMarker() {
    this.cacheReady = false;
    this.needsRebuild = true;
    await this.redis.delete(READY_KEY).catch((deleteError) => {
      this.logger?.warn({ err: deleteError }, 'could not invalidate the Guild cache ready marker');
    });
    this.scheduleRecovery();
  }

  configWithoutCache(guildId, reason, cause) {
    let customConfig;
    try {
      customConfig = this.readCustomConfig(guildId);
    } catch (databaseError) {
      throw new GuildCacheUnavailableError(reason, { cause: cause ?? databaseError });
    }
    if (!this.readingFromDatabase) {
      this.readingFromDatabase = true;
      this.logger?.warn({ err: cause, reason }, 'guild cache unusable; serving guild settings from SQLite until Redis recovers');
    }
    return customConfig === null ? DEFAULT_GUILD_CONFIG : effectiveConfig(customConfig);
  }

  noteCacheServedFromRedis() {
    if (!this.readingFromDatabase) return;
    this.readingFromDatabase = false;
    this.logger?.info('guild cache usable again; guild settings are served from Redis');
  }

  async getGuildConfig(guildId) {
    if (!this.redis) {
      return this.configWithoutCache(guildId, 'Redis is unavailable for guild configuration reads');
    }

    let marker;
    let customConfig;
    try {
      [marker, customConfig] = await this.redis.getMany([READY_KEY, guildKey(guildId)]);
    } catch (error) {
      await this.invalidateReadyMarker();
      return this.configWithoutCache(guildId, 'Could not read guild configuration from Redis', error);
    }

    if (marker?.version !== 1 || this.needsRebuild) {
      this.cacheReady = false;
      this.scheduleRecovery();
      return this.configWithoutCache(guildId, 'Guild configuration cache is not ready');
    }

    this.cacheReady = true;
    if (customConfig === null) {
      this.noteCacheServedFromRedis();
      return DEFAULT_GUILD_CONFIG;
    }
    let config;
    try {
      config = effectiveConfig(normalizeCustomConfig(customConfig, this.providerIds, `Redis guild ${guildId}`));
    } catch (error) {
      await this.invalidateReadyMarker();
      return this.configWithoutCache(guildId, 'Guild configuration in Redis is malformed', error);
    }
    this.noteCacheServedFromRedis();
    return config;
  }

  async isPreviewDisabled(guildId, providerId) {
    const config = await this.getGuildConfig(guildId);
    return config.disabledPreviews.includes(providerId);
  }

  async getPreviewSettings(guildId, providerId) {
    const config = await this.getGuildConfig(guildId);
    return {
      disabled: config.disabledPreviews.includes(providerId),
      twitterStyle: config.twitterStyle === 'old' || config.twitterStyle === 'new'
        ? config.twitterStyle
        : DEFAULT_TWITTER_STYLE,
    };
  }

  async #syncGuildCache(guildId, customConfig, errorDetails = {}) {
    if (!this.redis) return false;
    try {
      const markerBeforeUpdate = await this.redis.get(READY_KEY);
      if (markerBeforeUpdate?.version !== 1) {
        await this.rebuildGuildCache();
      }
      if (customConfig === null) await this.redis.delete(guildKey(guildId));
      else await this.redis.set(guildKey(guildId), customConfig);
      const marker = await this.redis.get(READY_KEY);
      const cacheUpdated = marker?.version === 1;
      this.cacheReady = cacheUpdated;
      this.needsRebuild = !cacheUpdated;
      if (!cacheUpdated) this.scheduleRecovery();
      return cacheUpdated;
    } catch (error) {
      this.cacheReady = false;
      this.needsRebuild = true;
      this.logger?.error(
        { err: error, guildId, ...errorDetails },
        'SQLite guild setting committed but Redis update failed',
      );
      await this.redis.delete(READY_KEY).catch((deleteError) => {
        this.logger?.warn({ err: deleteError }, 'could not invalidate the Guild cache ready marker');
      });
      this.scheduleRecovery();
      return false;
    }
  }

  async togglePreview(guildId, providerId) {
    if (!this.providerIds.has(providerId)) throw new Error(`Unknown preview provider: ${providerId}`);
    let disabled;
    let next;
    let hasCustomConfig;
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const current = this.readCustomConfig(guildId) ?? {};
      const disabledPreviews = new Set(current.disabledPreviews ?? []);
      disabled = !disabledPreviews.has(providerId);
      if (disabled) disabledPreviews.add(providerId);
      else disabledPreviews.delete(providerId);

      next = { ...current };
      if (disabledPreviews.size > 0) next.disabledPreviews = [...disabledPreviews].sort();
      else delete next.disabledPreviews;

      hasCustomConfig = Object.keys(next).length > 0;
      if (hasCustomConfig) {
        this.upsertOne.run(String(guildId), JSON.stringify(next), Date.now());
      } else {
        this.deleteOne.run(String(guildId));
      }
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }

    const cacheUpdated = await this.#syncGuildCache(
      guildId,
      hasCustomConfig ? next : null,
      { providerId },
    );

    return { disabled, cacheUpdated, config: effectiveConfig(next) };
  }

  async setTwitterStyle(guildId, style) {
    if (style !== 'old' && style !== 'default' && style !== 'new') {
      throw new Error(`Unknown Twitter style: ${style}`);
    }

    let next;
    let hasCustomConfig;
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const current = this.readCustomConfig(guildId) ?? {};
      next = { ...current };
      if (style === 'default') delete next.twitterStyle;
      else next.twitterStyle = style;

      hasCustomConfig = Object.keys(next).length > 0;
      if (hasCustomConfig) this.upsertOne.run(String(guildId), JSON.stringify(next), Date.now());
      else this.deleteOne.run(String(guildId));
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }

    const cacheUpdated = await this.#syncGuildCache(
      guildId,
      hasCustomConfig ? next : null,
      { setting: 'twitterStyle', twitterStyle: style },
    );

    return { twitterStyle: style, cacheUpdated, config: effectiveConfig(next) };
  }

  async resetPreviews(guildId) {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      this.deleteOne.run(String(guildId));
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }

    const cacheUpdated = await this.#syncGuildCache(guildId, null);

    return { cacheUpdated, config: DEFAULT_GUILD_CONFIG };
  }

  close() {
    this.closed = true;
    this.redis?.client?.off('error', this.onRedisUnavailable);
    this.redis?.client?.off('end', this.onRedisUnavailable);
    this.redis?.client?.off('reconnecting', this.onRedisUnavailable);
    this.redis?.client?.off('ready', this.onRedisReady);
    this.database.close();
  }
}
