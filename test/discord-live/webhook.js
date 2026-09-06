import { config as loadDotenv } from 'dotenv';
import { WebhookClient } from 'discord.js';
import { DiscordWebhookNotifier } from '../../src/services/webhook-notifier.js';

loadDotenv({
  path: process.env.DISCORD_ENV_FILE || '.env',
  override: false,
  quiet: true,
});

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
if (!webhookUrl) throw new Error('DISCORD_WEBHOOK_URL is required (or set DISCORD_ENV_FILE)');

const webhookClient = new WebhookClient({ url: webhookUrl }, { allowedMentions: { parse: [] } });
const notifier = new DiscordWebhookNotifier({ webhookClient });
const createdMessages = [];
let operationError;

try {
  createdMessages.push(await notifier.notifyRestart({ guildCount: 1, memberCount: 1 }));
  createdMessages.push(await notifier.notifyGuildJoin({
    id: '00000000000000000',
    name: '[TEST] ermiana webhook smoke test',
    memberCount: 1,
    ownerId: '00000000000000000',
    ownerDisplayName: 'Automated smoke test',
    ownerUsername: 'smoke-test',
  }));
} catch (error) {
  operationError = error;
}

const cleanup = await Promise.allSettled(
  createdMessages.filter(Boolean).map((message) => webhookClient.deleteMessage(message.id)),
);
webhookClient.destroy();

if (operationError) throw operationError;
const cleanupFailures = cleanup.filter((result) => result.status === 'rejected');
if (cleanupFailures.length > 0) {
  throw new AggregateError(cleanupFailures.map((result) => result.reason), 'webhook smoke-test cleanup failed');
}
console.log(`webhook smoke test passed; sent and deleted ${createdMessages.length} messages`);
