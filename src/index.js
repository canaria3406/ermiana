import { configureHttp } from './core/configure-http.js';
import { fileURLToPath } from 'node:url';
import { ShardingManager } from 'discord.js';
import { CacheService, connectRedis, MemoryCacheBackend } from './core/cache.js';
import { loadConfig } from './config.js';
import { createLogger, flushLogger } from './core/logger.js';
import { GuildSettingsStore } from './services/guild-settings.js';
import { PREVIEW_PROVIDER_IDS } from './providers/index.js';
import {
  collectDiscordStats,
  DiscordWebhookNotifier,
  isGuildJoinWebhookMessage,
  webhookErrorDetails,
} from './services/webhook-notifier.js';

const config = loadConfig();
configureHttp();
const logger = createLogger(config.logLevel, { process: 'manager' });

const startupDeadline = Date.now() + config.runtime.readyTimeoutMs - config.runtime.startupMarginMs;

function beforeStartupDeadline(promise, step) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(
      `${step} did not finish within the ${config.runtime.readyTimeoutMs} ms PM2 ready window`,
    )), Math.max(1, startupDeadline - Date.now()));
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}
const fallback = new MemoryCacheBackend();
const guildSettings = new GuildSettingsStore({
  databasePath: config.guild.databasePath,
  redis: null,
  providerIds: PREVIEW_PROVIDER_IDS,
  logger,
});
let redisBackend;
try {
  redisBackend = await connectRedis(config.redis, logger);
} catch (error) {
  guildSettings.close();
  throw error;
}
guildSettings.attachRedis(redisBackend);
if (redisBackend) await guildSettings.initialize();
const cache = new CacheService({ backend: redisBackend ?? fallback, fallback, ...config.cache, logger });
const webhookNotifier = new DiscordWebhookNotifier({ url: config.discord.webhookUrl });
const manager = new ShardingManager(fileURLToPath(new URL('./bot.js', import.meta.url)), {
  token: config.discord.token,
  totalShards: config.discord.totalShards,
  respawn: true,
  mode: 'process',
});
let stopping = false;
let requestedExitCode = 0;

manager.on('shardCreate', (shard) => {
  logger.info({ shardId: shard.id }, 'shard created');
  shard.on('death', (child) => {
    const details = { shardId: shard.id, exitCode: child?.exitCode, signalCode: child?.signalCode };
    if (stopping) logger.info(details, 'shard exited during shutdown');
    else logger.error(details, 'shard exited unexpectedly; discord.js will respawn it');
  });
  shard.on('error', (error) => logger.error({ shardId: shard.id, err: error }, 'shard process error'));
  shard.on('message', (message) => {
    if (!isGuildJoinWebhookMessage(message)) return;
    void webhookNotifier.notifyGuildJoin(message.guild).catch((error) => {
      logger.warn({ shardId: shard.id, error: webhookErrorDetails(error) }, 'guild webhook notification failed');
    });
  });
});

async function stopShards() {
  manager.respawn = false;
  const shards = [...manager.shards.values()];
  const results = await Promise.allSettled(shards.map(async (shard) => {
    if (!shard.process && !shard.worker) return;
    let timer;
    const died = new Promise((resolve) => {
      timer = setTimeout(resolve, 15000);
      shard.once('death', resolve);
    });
    await shard.send('shutdown').catch((error) => {
      logger.warn({ shardId: shard.id, err: error }, 'could not request graceful shard shutdown');
    });
    await died;
    clearTimeout(timer);
    if (shard.process || shard.worker) shard.kill();
  }));
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.warn({ shardId: shards[index].id, err: result.reason }, 'shard shutdown failed');
    }
  });
}

async function shutdown(reason, exitCode = 0) {
  requestedExitCode = Math.max(requestedExitCode, exitCode);
  if (stopping) return;
  stopping = true;
  logger.info({ reason, exitCode: requestedExitCode }, 'graceful shutdown started');
  await stopShards();
  webhookNotifier.close();
  guildSettings.close();
  await cache.close();
  logger.info({ exitCode: requestedExitCode }, 'graceful shutdown complete');
  await flushLogger(logger).catch((error) => process.stderr.write(`logger flush failed: ${error.stack ?? error}\n`));
  process.exit(requestedExitCode);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('message', (message) => {
  if (message === 'shutdown') void shutdown('PM2 shutdown message');
});
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'uncaught exception');
  void shutdown('uncaughtException', 1);
});
process.on('unhandledRejection', (error) => {
  logger.fatal({ err: error }, 'unhandled rejection');
  void shutdown('unhandledRejection', 1);
});
process.on('warning', (warning) => logger.warn({ err: warning }, 'Node.js process warning'));

await beforeStartupDeadline(
  manager.spawn({ delay: 5500, timeout: config.runtime.shardSpawnTimeoutMs }),
  'Discord shard spawn',
);
logger.info({ shards: manager.shards.size }, 'all Discord shards ready');
process.send?.('ready');
if (webhookNotifier.enabled) {
  try {
    const stats = await collectDiscordStats(manager);
    await webhookNotifier.notifyRestart(stats);
    logger.info({ guilds: stats.guildCount, members: stats.memberCount }, 'restart webhook notification sent');
  } catch (error) {
    logger.warn({ error: webhookErrorDetails(error) }, 'restart webhook notification failed');
  }
}
