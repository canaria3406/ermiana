import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import {
  BAN_PREVIEW_COMMAND_NAME,
  buildApplicationCommands,
  CHECK_COMMAND_NAME,
  FIX_COMMAND_NAME,
  INFO_COMMAND_NAME,
  PREVIEW_PROVIDER_CHOICES,
  REMOVE_MESSAGE_COMMAND_NAME,
  REMOVE_MESSAGE_NAME_LOCALIZATIONS,
  RESET_PREVIEW_COMMAND_NAME,
  TWITTER_STYLE_CHOICES,
  TWITTER_STYLE_COMMAND_NAME,
} from '../../../src/discord/commands.js';
import { PREVIEW_PROVIDER_IDS } from '../../../src/providers/index.js';

test('builds the public command table with the intended contexts and permissions', () => {
  const commands = buildApplicationCommands();
  const byName = new Map(commands.map((command) => [command.name, command]));
  assert.deepEqual(new Set(byName.keys()), new Set([
    REMOVE_MESSAGE_COMMAND_NAME,
    BAN_PREVIEW_COMMAND_NAME,
    RESET_PREVIEW_COMMAND_NAME,
    TWITTER_STYLE_COMMAND_NAME,
    INFO_COMMAND_NAME,
    CHECK_COMMAND_NAME,
    FIX_COMMAND_NAME,
  ]));

  for (const name of [
    BAN_PREVIEW_COMMAND_NAME,
    RESET_PREVIEW_COMMAND_NAME,
    TWITTER_STYLE_COMMAND_NAME,
    INFO_COMMAND_NAME,
    CHECK_COMMAND_NAME,
  ]) {
    const command = byName.get(name);
    assert.equal(command.type, ApplicationCommandType.ChatInput);
    assert.deepEqual(command.contexts, [InteractionContextType.Guild]);
    assert.deepEqual(command.integration_types, [ApplicationIntegrationType.GuildInstall]);
    assert.equal(command.default_member_permissions, '8');
  }

  const removeMessage = byName.get(REMOVE_MESSAGE_COMMAND_NAME);
  assert.equal(removeMessage.type, ApplicationCommandType.Message);
  assert.deepEqual(removeMessage.name_localizations, REMOVE_MESSAGE_NAME_LOCALIZATIONS);
  assert.deepEqual(removeMessage.contexts, [InteractionContextType.Guild]);

  const fix = byName.get(FIX_COMMAND_NAME);
  assert.deepEqual(fix.integration_types, [
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall,
  ]);
  assert.deepEqual(fix.contexts, [
    InteractionContextType.Guild,
    InteractionContextType.PrivateChannel,
  ]);
  assert.equal(fix.default_member_permissions, undefined);
});

test('builds the command options from the supported providers and Twitter styles', () => {
  const byName = new Map(buildApplicationCommands().map((command) => [command.name, command]));
  const previewOption = byName.get(BAN_PREVIEW_COMMAND_NAME).options[0];
  assert.equal(previewOption.required, true);
  assert.deepEqual(
    previewOption.choices.map(({ name, value }) => ({ name, value })),
    PREVIEW_PROVIDER_CHOICES,
  );
  assert.deepEqual(
    previewOption.choices.map(({ value }) => value).sort(),
    [...PREVIEW_PROVIDER_IDS].sort(),
  );
  assert.deepEqual(
    byName.get(TWITTER_STYLE_COMMAND_NAME).options[0].choices
      .map(({ name, value }) => ({ name, value })),
    TWITTER_STYLE_CHOICES,
  );
  assert.deepEqual(
    byName.get(FIX_COMMAND_NAME).options.map(({ name, required }) => ({ name, required })),
    [{ name: 'url', required: true }],
  );
});
