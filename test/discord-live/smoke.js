import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { config as loadEnv } from 'dotenv';
import { PermissionsBitField } from 'discord.js';
import { CacheService, connectRedis, MemoryCacheBackend } from '../../src/core/cache.js';
import { createDiscordClient } from '../../src/discord/client.js';
import { REMOVE_MESSAGE_COMMAND_NAME } from '../../src/discord/commands.js';
import { createInteractionHandler } from '../../src/discord/interaction-handler.js';
import { DiscordRenderer, PAGINATION_IDS } from '../../src/discord/renderer.js';

const envFile = process.env.DISCORD_ENV_FILE;
loadEnv(envFile ? { path: envFile, override: false, quiet: true } : { quiet: true });
const { loadConfig } = await import('../../src/config.js');
const config = loadConfig();
const interactionErrors = [];
const logger = { debug() {}, info() {}, warn() {}, error(details) { interactionErrors.push(details); } };
const fallback = new MemoryCacheBackend();
const redisBackend = await connectRedis({ ...config.redis, required: true }, logger);
const cache = new CacheService({ backend: redisBackend, fallback, ...config.cache, logger });
const client = createDiscordClient();
let source;
let reply;
let pixivReply;
let bilibiliReply;
let result;
let operationError;

async function findWritableChannel() {
  const required = [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.ReadMessageHistory,
  ];
  for (const guild of client.guilds.cache.values()) {
    const channels = await guild.channels.fetch();
    const channel = channels.find((candidate) => candidate?.isTextBased()
      && !candidate.isDMBased()
      && typeof candidate.send === 'function'
      && candidate.permissionsFor(client.user)?.has(required));
    if (channel) return channel;
  }
  throw new Error('The test bot has no writable guild text channel');
}

async function waitForEmbed(message, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let current = message;
  while (Date.now() < deadline) {
    current = await current.fetch();
    if (current.embeds.length > 0) return current;
    await delay(500);
  }
  return current;
}

try {
  await client.login(config.discord.token);
  const channel = await findWritableChannel();
  source = await channel.send({
    content: 'ermiana automated pagination smoke test (temporary)',
    allowedMentions: { parse: [] },
  });
  const renderer = new DiscordRenderer({ cache, logger });
  bilibiliReply = await renderer.send(source, {
    canonicalUrl: 'https://www.bilibili.com/video/BV1UmK36aED9',
    content: 'https://www.vxbilibili.com/video/BV1UmK36aED9?p=1',
    suppressOriginal: false,
  });
  bilibiliReply = await waitForEmbed(bilibiliReply);
  reply = await renderer.send(source, {
    embed: {
      title: 'ermiana smoke test',
      description: 'This temporary message verifies stateless Discord button URL storage and pagination edits.',
      url: 'https://docs.discord.com/developers/intro',
    },
    images: [
      'https://cdn.discordapp.com/embed/avatars/0.png',
      'https://cdn.discordapp.com/embed/avatars/1.png',
    ],
    suppressOriginal: false,
  });

  const stored = await cache.get('interaction', reply.id);
  const handler = createInteractionHandler({ logger });
  const genericMessage = {
    embeds: reply.embeds,
    components: reply.components,
    async edit(payload) {
      const edited = await reply.edit(payload);
      this.embeds = edited.embeds;
      this.components = edited.components;
      return edited;
    },
  };
  await handler({
    id: 'local-smoke-interaction',
    customId: PAGINATION_IDS.cycle,
    message: genericMessage,
    isButton() { return true; },
    isMessageContextMenuCommand() { return false; },
    async deferUpdate() {},
    async followUp() {},
  });

  pixivReply = await renderer.send(source, {
    canonicalUrl: 'https://www.pixiv.net/artworks/42',
    embed: {
      title: 'ermiana Pixiv button smoke test',
      description: 'This temporary message verifies all stateless Pixiv direction buttons.',
      url: 'https://www.pixiv.net/artworks/42',
    },
    images: ['https://pixiv.canaria.cc/img/42_p0.jpg'],
    pagination: { type: 'pixiv-url', totalPages: 4 },
    suppressOriginal: false,
  }, { spoiler: true });
  const pixivStored = await cache.get('interaction', pixivReply.id);
  const pixivMessage = {
    embeds: pixivReply.embeds,
    components: pixivReply.components,
    async edit(payload) {
      const edited = await pixivReply.edit(payload);
      this.embeds = edited.embeds;
      this.components = edited.components;
      return edited;
    },
  };
  async function clickPixiv(customId) {
    await handler({
      id: `local-smoke-${customId}`,
      customId,
      message: pixivMessage,
      isButton() { return true; },
      isMessageContextMenuCommand() { return false; },
      async deferUpdate() {},
      async followUp() {},
    });
    return pixivMessage.embeds[0]?.image?.url;
  }
  const pixivPages = [
    await clickPixiv(PAGINATION_IDS.next),
    await clickPixiv(PAGINATION_IDS.last),
    await clickPixiv(PAGINATION_IDS.first),
  ];

  const commandEvents = [];
  await handler({
    id: 'local-smoke-remove-message',
    commandName: REMOVE_MESSAGE_COMMAND_NAME,
    locale: 'zh-TW',
    client,
    targetMessage: reply,
    isButton() { return false; },
    isMessageContextMenuCommand() { return true; },
    async deferReply(payload) { commandEvents.push({ type: 'defer', payload }); },
    async editReply(payload) { commandEvents.push({ type: 'edit', payload }); },
  });
  result = {
    gatewayReady: client.isReady(),
    guilds: client.guilds.cache.size,
    bilibiliProxyEmbed: bilibiliReply.embeds.length > 0,
    redisPaginationStateAbsent: stored === null && pixivStored === null,
    embedSent: reply.embeds.length === 1,
    buttonsStoredUrls: reply.components[0]?.components.length === 2
      && reply.components[0].components[0].label === '更多圖片'
      && reply.components[0].components[1].url === 'https://cdn.discordapp.com/embed/avatars/1.png',
    secondPageEdited: genericMessage.embeds[0]?.image?.url === 'https://cdn.discordapp.com/embed/avatars/1.png',
    pixivFiveButtonDesign: pixivMessage.components[0]?.components.length === 5
      && pixivMessage.components[0].components[2].label === '1/4',
    pixivSpoilerContent: pixivReply.content === '||https://www.pixiv.net/artworks/42||',
    pixivDirectionsEdited: JSON.stringify(pixivPages) === JSON.stringify([
      'https://pixiv.canaria.cc/img/42_p1.jpg',
      'https://pixiv.canaria.cc/img/42_p3.jpg',
      'https://pixiv.canaria.cc/img/42_p0.jpg',
    ]),
    removeMessageDeletedBotReply: commandEvents[0]?.type === 'defer'
      && commandEvents[0].payload.flags === undefined
      && commandEvents[1]?.payload.content === '成功刪除訊息。',
    interactionErrorsAbsent: interactionErrors.length === 0,
  };
} catch (error) {
  operationError = error;
}

const cleanup = {};
const cleanupErrors = [];
if (bilibiliReply && !bilibiliReply.deleted) {
  try {
    await bilibiliReply.delete();
    cleanup.bilibiliReplyDeleted = true;
  } catch (error) {
    cleanupErrors.push(error);
  }
}
if (pixivReply && !pixivReply.deleted) {
  try {
    await pixivReply.delete();
    cleanup.pixivReplyDeleted = true;
  } catch (error) {
    cleanupErrors.push(error);
  }
}
if (result?.removeMessageDeletedBotReply) cleanup.replyDeletedByCommand = true;
else if (reply) {
  try {
    await reply.delete();
    cleanup.replyDeletedDuringCleanup = true;
  } catch (error) {
    cleanupErrors.push(error);
  }
}
if (source) {
  try {
    await source.delete();
    cleanup.sourceDeleted = true;
  } catch (error) {
    cleanupErrors.push(error);
  }
}
client.destroy();
try {
  await cache.close();
} catch (error) {
  cleanupErrors.push(error);
}

if (operationError) throw operationError;
if (cleanupErrors.length > 0) throw new AggregateError(cleanupErrors, 'Discord smoke-test cleanup failed');
const failedChecks = Object.entries(result).filter(([, value]) => value === false).map(([name]) => name);
if (failedChecks.length > 0) {
  throw new Error(`Discord smoke checks failed: ${failedChecks.join(', ')}; result=${JSON.stringify(result)}`);
}
console.log(JSON.stringify({ ...result, ...cleanup }, null, 2));
