import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../../src/config.js';

test('loads required variables and typed defaults', () => {
  const webhookUrl = `https://discord.com/api/webhooks/12345678901234567/${'a'.repeat(68)}`;
  const config = loadConfig({
    DISCORD_TOKEN: 'token',
    DISCORD_WEBHOOK_URL: webhookUrl,
    NODE_ENV: 'production',
  });
  assert.equal(config.discord.token, 'token');
  assert.equal(config.discord.totalShards, 'auto');
  assert.equal(config.discord.webhookUrl, webhookUrl);
  assert.equal(config.redis.required, true);
  assert.equal(config.redis.retryInitialDelayMs, 1000);
  assert.equal(config.redis.retryMaxDelayMs, 30000);
  assert.equal(config.redis.retryBudgetMs, 90000);
  assert.equal(config.cache.waitTimeoutMs, 13000);
  assert.equal(config.http.retries, 1);
  assert.equal(config.http.userAgent, 'GoogleBot (+https://github.com/)');
  assert.equal(config.guild.databasePath, 'data/ermiana.db');
  assert.equal(config.logLevel, 'error');
});

test('production defaults to error-only logging but honours an explicit LOG_LEVEL', () => {
  assert.equal(loadConfig({ DISCORD_TOKEN: 'x', NODE_ENV: 'development' }).logLevel, 'trace');
  assert.equal(loadConfig({ DISCORD_TOKEN: 'x', NODE_ENV: 'development', LOG_LEVEL: 'debug' }).logLevel, 'debug');
  const productionEnv = {
    DISCORD_TOKEN: 'x',
    NODE_ENV: 'production',
    DISCORD_WEBHOOK_URL: `https://discord.com/api/webhooks/12345678901234567/${'a'.repeat(68)}`,
  };
  assert.equal(loadConfig(productionEnv).logLevel, 'error');
  assert.equal(loadConfig({ ...productionEnv, LOG_LEVEL: 'debug' }).logLevel, 'debug');
  assert.throws(() => loadConfig({ ...productionEnv, LOG_LEVEL: 'verbose' }), /LOG_LEVEL/);
  assert.throws(() => loadConfig({ DISCORD_TOKEN: 'x', NODE_ENV: 'development', LOG_LEVEL: 'verbose' }), /LOG_LEVEL/);
});

test('requires the canonical Discord token name', () => {
  assert.throws(() => loadConfig({ TOKEN: 'wrong-name' }), /DISCORD_TOKEN/);
});

test('validates the optional Discord webhook URL and production requirement', () => {
  const webhookUrl = `https://discord.com/api/webhooks/12345678901234567/${'a'.repeat(68)}`;
  assert.equal(loadConfig({ DISCORD_TOKEN: 'x', DISCORD_WEBHOOK_URL: webhookUrl }).discord.webhookUrl, webhookUrl);
  assert.throws(
    () => loadConfig({ DISCORD_TOKEN: 'x', DISCORD_WEBHOOK_URL: 'https://example.test/webhook' }),
    /DISCORD_WEBHOOK_URL/,
  );
  assert.throws(
    () => loadConfig({ DISCORD_TOKEN: 'x', NODE_ENV: 'production' }),
    /DISCORD_WEBHOOK_URL is required in production/,
  );
});

test('rejects incomplete or invalid configuration', () => {
  assert.throws(() => loadConfig({}), /DISCORD_TOKEN/);
  assert.throws(() => loadConfig({ DISCORD_TOKEN: 'x', BAHA_USER_ID: 'user' }), /configured together/);
  assert.throws(() => loadConfig({ DISCORD_TOKEN: 'x', HTTP_RETRIES: '99' }), /HTTP_RETRIES/);
  assert.throws(() => loadConfig({ DISCORD_TOKEN: 'x', HTTP_RETRIES: '2times' }), /HTTP_RETRIES/);
  assert.throws(() => loadConfig({ DISCORD_TOKEN: 'x', DISCORD_TOTAL_SHARDS: '6.5' }), /DISCORD_TOTAL_SHARDS/);
  assert.equal(loadConfig({ DISCORD_TOKEN: 'x', REDIS_RETRY_BUDGET_MS: '0' }).redis.retryBudgetMs, 0);
  assert.throws(() => loadConfig({ DISCORD_TOKEN: 'x', REDIS_RETRY_BUDGET_MS: '300001' }), /REDIS_RETRY_BUDGET_MS/);
  assert.equal(loadConfig({ DISCORD_TOKEN: 'x' }).runtime.shardSpawnTimeoutMs, 120000);
  assert.throws(
    () => loadConfig({ DISCORD_TOKEN: 'x', REDIS_RETRY_BUDGET_MS: '110000' }),
    /REDIS_RETRY_BUDGET_MS must be at least 15000 ms below SHARD_SPAWN_TIMEOUT_MS \(120000\)/,
  );
  assert.equal(loadConfig({ DISCORD_TOKEN: 'x' }).runtime.readyTimeoutMs, 240000);
  assert.throws(
    () => loadConfig({ DISCORD_TOKEN: 'x', REDIS_RETRY_INITIAL_DELAY_MS: '5000', REDIS_RETRY_MAX_DELAY_MS: '1000' }),
    /REDIS_RETRY_MAX_DELAY_MS/,
  );
});
