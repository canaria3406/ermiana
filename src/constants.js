import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REDIS_KEY_PREFIX = 'ermiana';
export const GUILD_DATABASE_PATH = resolve(PROJECT_ROOT, 'data/ermiana.db');
export const REDIS_RETRY_INITIAL_DELAY_MS = 1000;
export const REDIS_RETRY_MAX_DELAY_MS = 30000;
export const REDIS_RETRY_BUDGET_MS = 90000;
export const CACHE_LOCK_TTL_MS = 30000;
export const CACHE_WAIT_TIMEOUT_MS = 16000;
export const HTTP_TIMEOUT_MS = 5000;
export const HTTP_RETRIES = 1;
export const SHARD_SPAWN_TIMEOUT_MS = 120000;
export const PM2_READY_TIMEOUT_MS = 240000;
export const STARTUP_MARGIN_MS = 15000;
