import { configureHttp } from './core/configure-http.js';
import {
  Events,
} from 'discord.js';
import { loadConfig } from './config.js';
import { createDiscordClient } from './discord/client.js';
import { createGuildCreateHandler } from './discord/guild-create-handler.js';
import { createInteractionHandler } from './discord/interaction-handler.js';
import { createMessageHandler } from './discord/message-handler.js';
import { DiscordRenderer } from './discord/renderer.js';
import { createEventDrain } from './core/event-drain.js';
import { createLogger, flushLogger } from './core/logger.js';
import { createRuntime } from './runtime.js';

const config = loadConfig();
configureHttp();
const client = createDiscordClient();
const logger = createLogger(config.logLevel, {
  process: 'shard',
  shardIds: client.shard?.ids?.join(',') ?? 'unassigned',
});
let runtime = null;
let stopping = false;
let requestedExitCode = 0;
const eventDrain = createEventDrain({
  onError(error, event) {
    logger.fatal({ err: error, event }, 'unhandled Discord event handler rejection');
    void shutdown('Discord event handler rejection', 1);
  },
});
const EVENT_DRAIN_TIMEOUT_MS = 10000;

async function shutdown(reason, exitCode = 0) {
  requestedExitCode = Math.max(requestedExitCode, exitCode);
  if (stopping) return;
  stopping = true;
  logger.info({ reason, exitCode: requestedExitCode }, 'shard shutdown started');
  client.destroy();
  const drain = await eventDrain.stopAndDrain(EVENT_DRAIN_TIMEOUT_MS);
  if (!drain.drained) {
    logger.warn(
      { pendingHandlers: drain.pending, timeoutMs: EVENT_DRAIN_TIMEOUT_MS },
      'Discord event handlers did not drain before shutdown; leaving runtime resources for process exit',
    );
  } else if (runtime) {
    await runtime.close().catch((error) => logger.warn({ err: error }, 'runtime close failed'));
  }
  logger.info({ exitCode: requestedExitCode }, 'shard shutdown complete');
  await flushLogger(logger).catch((error) => process.stderr.write(`logger flush failed: ${error.stack ?? error}\n`));
  process.exit(requestedExitCode);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('message', (message) => {
  if (message === 'shutdown') void shutdown('manager shutdown message');
});
process.on('disconnect', () => void shutdown('manager IPC disconnected', 1));
process.on('unhandledRejection', (error) => {
  logger.fatal({ err: error }, 'unhandled rejection');
  void shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'uncaught exception');
  void shutdown('uncaughtException', 1);
});
process.on('warning', (warning) => logger.warn({ err: warning }, 'Node.js process warning'));

runtime = await createRuntime(config, logger);
const renderer = new DiscordRenderer({ logger });

client.on(Events.MessageCreate, eventDrain.track('messageCreate', createMessageHandler({
  previewService: runtime.previewService,
  renderer,
  guildSettings: runtime.guildSettings,
  logger,
})));
client.on(Events.InteractionCreate, eventDrain.track('interactionCreate', createInteractionHandler({
  guildSettings: runtime.guildSettings,
  previewService: runtime.previewService,
  renderer,
  logger,
})));
client.once(Events.ClientReady, (readyClient) => {
  logger.info({ user: readyClient.user.tag, guilds: readyClient.guilds.cache.size }, 'Discord shard ready');
});
client.on(Events.Error, (error) => logger.error({ err: error }, 'Discord client error'));
client.on(Events.Warn, (warning) => logger.warn({ warning }, 'Discord client warning'));
client.on(Events.ShardError, (error, shardId) => logger.error({ err: error, shardId }, 'Discord gateway error'));
client.on(Events.ShardReconnecting, (shardId) => logger.warn({ shardId }, 'Discord shard reconnecting'));
client.on(Events.GuildCreate, createGuildCreateHandler({ logger }));
await client.login(config.discord.token);
