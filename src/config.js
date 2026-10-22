import 'dotenv/config';
import {
  CACHE_LOCK_TTL_MS,
  CACHE_WAIT_TIMEOUT_MS,
  GUILD_DATABASE_PATH,
  HTTP_RETRIES,
  HTTP_TIMEOUT_MS,
  PM2_READY_TIMEOUT_MS,
  REDIS_KEY_PREFIX,
  REDIS_RETRY_BUDGET_MS,
  REDIS_RETRY_INITIAL_DELAY_MS,
  REDIS_RETRY_MAX_DELAY_MS,
  SHARD_SPAWN_TIMEOUT_MS,
  STARTUP_MARGIN_MS,
} from './constants.js';

function readString(env, name, defaultValue = undefined) {
  return env[name]?.trim() || defaultValue;
}

function readLogLevel(env, nodeEnv) {
  const level = readString(env, 'LOG_LEVEL', nodeEnv === 'production' ? 'error' : 'trace');
  if (!['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'].includes(level)) {
    throw new Error('LOG_LEVEL must be trace, debug, info, warn, error, fatal, or silent');
  }
  return level;
}

function readShards(env) {
  const raw = readString(env, 'DISCORD_TOTAL_SHARDS', 'auto');
  if (raw === 'auto') return 'auto';
  const value = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error('DISCORD_TOTAL_SHARDS must be "auto" or a positive integer');
  }
  return value;
}

function readDiscordWebhookUrl(env) {
  const value = readString(env, 'DISCORD_WEBHOOK_URL');
  if (!value) return undefined;
  const discordWebhookPattern = /^https:\/\/(?:ptb\.|canary\.)?discord\.com\/api(?:\/v\d{1,2})?\/webhooks\/\d{17,19}\/[\w-]{68}(?:[/?#].*)?$/i;
  if (!discordWebhookPattern.test(value)) {
    throw new Error('DISCORD_WEBHOOK_URL must be an HTTPS Discord webhook URL');
  }
  return value;
}

export function loadConfig(env = process.env) {
  const nodeEnv = readString(env, 'NODE_ENV', 'development');
  const discordToken = readString(env, 'DISCORD_TOKEN');
  const discordClientId = readString(env, 'DISCORD_CLIENT_ID');
  const discordWebhookUrl = readDiscordWebhookUrl(env);
  const bahaUserId = readString(env, 'BAHA_USER_ID');
  const bahaPassword = readString(env, 'BAHA_PASSWORD');

  const errors = [];
  if (!discordToken) errors.push('DISCORD_TOKEN is required');
  if (nodeEnv === 'production' && !discordWebhookUrl) {
    errors.push('DISCORD_WEBHOOK_URL is required in production');
  }
  if ((bahaUserId && !bahaPassword) || (!bahaUserId && bahaPassword)) {
    errors.push('BAHA_USER_ID and BAHA_PASSWORD must be configured together');
  }
  if (errors.length > 0) throw new Error(errors.join('; '));

  return Object.freeze({
    nodeEnv,
    logLevel: readLogLevel(env, nodeEnv),
    discord: Object.freeze({
      token: discordToken,
      clientId: discordClientId,
      totalShards: readShards(env),
      webhookUrl: discordWebhookUrl,
    }),
    redis: Object.freeze({
      url: readString(env, 'REDIS_URL', 'redis://127.0.0.1:6379/0'),
      required: nodeEnv === 'production',
      keyPrefix: REDIS_KEY_PREFIX,
      retryInitialDelayMs: REDIS_RETRY_INITIAL_DELAY_MS,
      retryMaxDelayMs: REDIS_RETRY_MAX_DELAY_MS,
      retryBudgetMs: REDIS_RETRY_BUDGET_MS,
    }),
    cache: Object.freeze({
      lockTtlMs: CACHE_LOCK_TTL_MS,
      waitTimeoutMs: CACHE_WAIT_TIMEOUT_MS,
    }),
    http: Object.freeze({
      timeoutMs: HTTP_TIMEOUT_MS,
      retries: HTTP_RETRIES,
      userAgent: 'GoogleBot (+https://github.com/)',
    }),
    runtime: Object.freeze({
      shardSpawnTimeoutMs: SHARD_SPAWN_TIMEOUT_MS,
      readyTimeoutMs: PM2_READY_TIMEOUT_MS,
      startupMarginMs: STARTUP_MARGIN_MS,
    }),
    guild: Object.freeze({
      databasePath: GUILD_DATABASE_PATH,
    }),
    baha: Object.freeze({ userId: bahaUserId, password: bahaPassword }),
  });
}
