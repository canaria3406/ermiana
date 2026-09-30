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

test('builds the legacy-compatible message context-menu command', () => {
  const commands = buildApplicationCommands();
  assert.equal(commands.length, 7);
  const removeMessage = commands.find(({ name }) => name === REMOVE_MESSAGE_COMMAND_NAME);
  assert.equal(removeMessage.type, ApplicationCommandType.Message);
  assert.equal(removeMessage.description, undefined);
  assert.deepEqual(removeMessage.name_localizations, REMOVE_MESSAGE_NAME_LOCALIZATIONS);
  assert.deepEqual(removeMessage.integration_types, [ApplicationIntegrationType.GuildInstall]);
  assert.deepEqual(removeMessage.contexts, [InteractionContextType.Guild]);
  assert.equal(removeMessage.dm_permission, undefined);
});

test('builds the administrator-only Guild preview toggle command', () => {
  const command = buildApplicationCommands().find(({ name }) => name === BAN_PREVIEW_COMMAND_NAME);
  assert.equal(command.type, ApplicationCommandType.ChatInput);
  assert.deepEqual(command.contexts, [InteractionContextType.Guild]);
  assert.deepEqual(command.integration_types, [ApplicationIntegrationType.GuildInstall]);
  assert.equal(command.dm_permission, undefined);
  assert.equal(command.default_member_permissions, '8');
  assert.equal(command.options[0].name, 'site');
  assert.equal(command.options[0].required, true);
  assert.deepEqual(
    command.options[0].choices.map(({ name, value }) => ({ name, value })),
    PREVIEW_PROVIDER_CHOICES,
  );
  assert.deepEqual(command.options[0].choices.map(({ name }) => name), [
    'PTT',
    '巴哈姆特',
    '噗浪',
    'Twitter',
    'Pixiv',
    'Facebook',
    'Instagram',
    'Threads',
    'Bluesky',
    'Misskey',
    'Bilibili',
    'TikTok',
    'PChome',
    'ehentai',
    'nhentai',
  ]);
  assert.deepEqual(
    command.options[0].choices.map(({ value }) => value).sort(),
    [...PREVIEW_PROVIDER_IDS].sort(),
  );
});

test('builds the administrator-only Guild preview reset command', () => {
  const command = buildApplicationCommands().find(({ name }) => name === RESET_PREVIEW_COMMAND_NAME);
  assert.equal(command.type, ApplicationCommandType.ChatInput);
  assert.deepEqual(command.contexts, [InteractionContextType.Guild]);
  assert.deepEqual(command.integration_types, [ApplicationIntegrationType.GuildInstall]);
  assert.equal(command.dm_permission, undefined);
  assert.equal(command.default_member_permissions, '8');
  assert.deepEqual(command.options, []);
});

test('builds the administrator-only Twitter style command', () => {
  const command = buildApplicationCommands().find(({ name }) => name === TWITTER_STYLE_COMMAND_NAME);
  assert.equal(command.type, ApplicationCommandType.ChatInput);
  assert.deepEqual(command.contexts, [InteractionContextType.Guild]);
  assert.deepEqual(command.integration_types, [ApplicationIntegrationType.GuildInstall]);
  assert.equal(command.dm_permission, undefined);
  assert.equal(command.default_member_permissions, '8');
  assert.deepEqual(
    command.options[0].choices.map(({ name, value }) => ({ name, value })),
    TWITTER_STYLE_CHOICES,
  );
});

test('builds the administrator-only Guild status command', () => {
  const command = buildApplicationCommands().find(({ name }) => name === INFO_COMMAND_NAME);
  assert.equal(command.type, ApplicationCommandType.ChatInput);
  assert.deepEqual(command.contexts, [InteractionContextType.Guild]);
  assert.deepEqual(command.integration_types, [ApplicationIntegrationType.GuildInstall]);
  assert.equal(command.dm_permission, undefined);
  assert.equal(command.default_member_permissions, '8');
  assert.deepEqual(command.options, []);
});

test('builds the administrator-only Guild permission check command', () => {
  const command = buildApplicationCommands().find(({ name }) => name === CHECK_COMMAND_NAME);
  assert.equal(command.type, ApplicationCommandType.ChatInput);
  assert.deepEqual(command.contexts, [InteractionContextType.Guild]);
  assert.deepEqual(command.integration_types, [ApplicationIntegrationType.GuildInstall]);
  assert.equal(command.dm_permission, undefined);
  assert.equal(command.default_member_permissions, '8');
  assert.deepEqual(command.options, []);
});

test('builds fix for every user in Guild and private-channel contexts', () => {
  const command = buildApplicationCommands().find(({ name }) => name === FIX_COMMAND_NAME);
  assert.equal(command.type, ApplicationCommandType.ChatInput);
  assert.deepEqual(command.integration_types, [
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall,
  ]);
  assert.deepEqual(command.contexts, [
    InteractionContextType.Guild,
    InteractionContextType.PrivateChannel,
  ]);
  assert.equal(command.default_member_permissions, undefined);
  assert.equal(command.dm_permission, undefined);
  assert.deepEqual(command.options.map(({ name, required }) => ({ name, required })), [
    { name: 'url', required: true },
  ]);
});
