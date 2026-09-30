import assert from 'node:assert/strict';
import test from 'node:test';
import { createGuildCreateHandler } from '../../../src/discord/guild-create-handler.js';
import {
  collectDiscordStats,
  createGuildJoinWebhookPayload,
  createRestartWebhookPayload,
  DiscordWebhookNotifier,
  GUILD_JOIN_WEBHOOK_IPC_TYPE,
  isGuildJoinWebhookMessage,
  webhookErrorDetails,
} from '../../../src/services/webhook-notifier.js';

const timestamp = new Date('2026-08-09T12:34:56.000Z');

test('builds restart and Guild join webhook payloads without mentions', () => {
  const restart = createRestartWebhookPayload({ guildCount: 2, memberCount: 3, timestamp });
  const join = createGuildJoinWebhookPayload({
    id: 'guild-id',
    name: 'Guild',
    memberCount: 4,
    iconUrl: 'https://cdn.discordapp.com/icon.png',
  }, { timestamp });
  assert.deepEqual(restart.allowedMentions, { parse: [] });
  assert.deepEqual(join.allowedMentions, { parse: [] });
  assert.equal(restart.embeds[0].toJSON().timestamp, timestamp.toISOString());
  assert.equal(join.embeds[0].toJSON().thumbnail.url, 'https://cdn.discordapp.com/icon.png');
});

test('collects Discord statistics across shards', async () => {
  const stats = await collectDiscordStats({
    async broadcastEval() {
      return [
        { guildCount: 2, memberCount: 3, botAvatarUrl: 'avatar' },
        { guildCount: 4, memberCount: 5, botAvatarUrl: null },
      ];
    },
  });
  assert.deepEqual(stats, { guildCount: 6, memberCount: 8, botAvatarUrl: 'avatar' });
});

test('sends restart and Guild join notifications through one injected webhook client', async () => {
  const sent = [];
  const notifier = new DiscordWebhookNotifier({
    webhookClient: { async send(payload) { sent.push(payload); return { id: sent.length }; } },
  });
  assert.equal(notifier.enabled, true);
  await notifier.notifyRestart({ guildCount: 1, memberCount: 2 });
  await notifier.notifyGuildJoin({ id: 'guild', name: 'Guild', memberCount: 3 });
  assert.equal(sent.length, 2);
});

test('creates a validated Guild join IPC message and redacts webhook URLs', async () => {
  let sent;
  const handler = createGuildCreateHandler({ send(message) { sent = message; } });
  const guild = {
    id: 'guild-id',
    name: 'Guild',
    memberCount: 1,
    shardId: 0,
    client: {
      guilds: { cache: { size: 1 } },
      user: { displayAvatarURL: () => 'avatar' },
    },
    iconURL: () => null,
  };
  assert.equal(await handler(guild), true);
  assert.equal(sent.type, GUILD_JOIN_WEBHOOK_IPC_TYPE);
  assert.equal(isGuildJoinWebhookMessage(sent), true);
  const secret = `https://discord.com/api/webhooks/12345678901234567/${'s'.repeat(68)}`;
  assert.doesNotMatch(webhookErrorDetails(new Error(secret)).message, /s{68}/);
});
