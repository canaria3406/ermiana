import 'dotenv/config';

function readString(env, name, defaultValue = undefined) {
  return env[name]?.trim() || defaultValue;
}

function readInteger(env, name, defaultValue, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = env[name];
  if (raw === undefined || raw === '') return defaultValue;
  const normalized = String(raw).trim();
  const value = /^\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function readBoolean(env, name, defaultValue) {
  const raw = env[name];
  if (raw === undefined || raw === '') return defaultValue;
  if (/^(true|1|yes)$/i.test(raw)) return true;
  if (/^(false|0|no)$/i.test(raw)) return false;
  throw new Error(`${name} must be true or false`);
}

function readLogLevel(env, nodeEnv) {
  const level = readString(env, 'LOG_LEVEL', nodeEnv === 'production' ? 'error' : 'trace');
  if (!['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'].includes(level)) {
    throw new Error('LOG_LEVEL must be trace, debug, info, warn, error, fatal, or silent');
  }
  return level;
}

const STARTUP_MARGIN_MS = 15000;
const READY_TIMEOUT_MS = 240000;

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

function readRedisRetry(env, { shardSpawnTimeoutMs }) {
  const initialDelayMs = readInteger(env, 'REDIS_RETRY_INITIAL_DELAY_MS', 1000, { min: 100, max: 60000 });
  const maxDelayMs = readInteger(env, 'REDIS_RETRY_MAX_DELAY_MS', 30000, { min: 100, max: 120000 });
  if (maxDelayMs < initialDelayMs) {
    throw new Error('REDIS_RETRY_MAX_DELAY_MS must be greater than or equal to REDIS_RETRY_INITIAL_DELAY_MS');
  }
  const budgetMs = readInteger(env, 'REDIS_RETRY_BUDGET_MS', 90000, { min: 0, max: 300000 });
  if (budgetMs > shardSpawnTimeoutMs - STARTUP_MARGIN_MS) {
    throw new Error(
      `REDIS_RETRY_BUDGET_MS must be at least ${STARTUP_MARGIN_MS} ms below `
      + `SHARD_SPAWN_TIMEOUT_MS (${shardSpawnTimeoutMs})`,
    );
  }
  return { initialDelayMs, maxDelayMs, budgetMs };
}

export function loadConfig(env = process.env) {
  const nodeEnv = readString(env, 'NODE_ENV', 'development');
  const shardSpawnTimeoutMs = readInteger(env, 'SHARD_SPAWN_TIMEOUT_MS', 120000, { min: 30000, max: 600000 });
  const redisRetry = readRedisRetry(env, { shardSpawnTimeoutMs });
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
      required: readBoolean(env, 'REDIS_REQUIRED', nodeEnv === 'production'),
      keyPrefix: readString(env, 'REDIS_KEY_PREFIX', 'ermiana'),
      retryInitialDelayMs: redisRetry.initialDelayMs,
      retryMaxDelayMs: redisRetry.maxDelayMs,
      retryBudgetMs: redisRetry.budgetMs,
    }),
    cache: Object.freeze({
      lockTtlMs: readInteger(env, 'CACHE_LOCK_TTL_MS', 30000, { min: 1000, max: 120000 }),
      waitTimeoutMs: readInteger(env, 'CACHE_WAIT_TIMEOUT_MS', 13000, { min: 100, max: 120000 }),
    }),
    http: Object.freeze({
      timeoutMs: readInteger(env, 'HTTP_TIMEOUT_MS', 5000, { min: 250, max: 30000 }),
      retries: readInteger(env, 'HTTP_RETRIES', 1, { min: 0, max: 5 }),
      userAgent: 'GoogleBot (+https://github.com/)',
    }),
    runtime: Object.freeze({
      shardSpawnTimeoutMs,
      readyTimeoutMs: READY_TIMEOUT_MS,
      startupMarginMs: STARTUP_MARGIN_MS,
    }),
    guild: Object.freeze({
      databasePath: readString(env, 'GUILD_DATABASE_PATH', 'data/ermiana.db'),
    }),
    baha: Object.freeze({ userId: bahaUserId, password: bahaPassword }),
  });
}
