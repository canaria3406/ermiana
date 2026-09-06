import assert from 'node:assert/strict';
import test from 'node:test';
import { createDiscordClient } from '../../../src/discord/client.js';

test('Discord client enables preview intents and disables unsolicited mentions', () => {
  const client = createDiscordClient();
  assert.equal(client.options.intents.has('Guilds'), true);
  assert.equal(client.options.intents.has('GuildMessages'), true);
  assert.equal(client.options.intents.has('MessageContent'), true);
  assert.deepEqual(client.options.allowedMentions, { parse: [], repliedUser: false });
  client.destroy();
});
