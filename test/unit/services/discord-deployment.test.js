import assert from 'node:assert/strict';
import test from 'node:test';
import { discordStartupChecks } from '../../../src/services/discord-deployment.js';

const fixture = {
  bot: { bot: true },
  application: { id: 'app', flags: 1 << 18 },
  gateway: { shards: 6, session_start_limit: { remaining: 1000 } },
  clientId: 'app',
};

test('accepts a valid Discord deployment preflight', () => {
  assert.ok(Object.values(discordStartupChecks(fixture)).every(Boolean));
});

test('rejects missing message access, client ID, or Identify capacity', () => {
  assert.equal(discordStartupChecks({ ...fixture, application: { id: 'app', flags: 0 } }).messageContentAccess, false);
  assert.equal(discordStartupChecks({ ...fixture, clientId: 'other' }).configuredClientIdMatches, false);
  assert.equal(discordStartupChecks({
    ...fixture,
    gateway: { shards: 6, session_start_limit: { remaining: 5 } },
  }).sessionStartsAvailable, false);
});
