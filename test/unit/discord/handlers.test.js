import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
} from 'discord.js';
import { createInteractionHandler } from '../../../src/discord/interaction-handler.js';
import { createMessageHandler } from '../../../src/discord/message-handler.js';
import {
  createNhentaiPaginationRow,
  createPaginationRow,
  createUrlStorageRow,
  NHENTAI_PAGINATION_IDS,
  PAGINATION_IDS,
} from '../../../src/discord/renderer.js';

function interactionComponents(row) {
  return [{
    components: row.toJSON().components.map((button) => ({
      customId: button.custom_id,
      label: button.label,
      url: button.url ?? null,
      disabled: button.disabled,
    })),
  }];
}

function applyMessageEdit(message, payload) {
  message.embeds = payload.embeds.map((embed) => embed.toJSON());
  message.components = interactionComponents(payload.components[0]);
}

test('fix resolves a supported URL and renders its preview in Guilds without consulting settings', async () => {
  const events = [];
  const candidate = { provider: { id: 'twitter' }, index: 7 };
  const preview = { provider: 'twitter', content: 'https://fxtwitter.com/example/status/1' };
  const handler = createInteractionHandler({
    guildSettings: { async isPreviewDisabled() { throw new Error('must not inspect Guild settings'); } },
    previewService: {
      match(content) {
        events.push(['match', content]);
        return candidate;
      },
      async resolve(value) {
        events.push(['resolve', value]);
        return preview;
      },
    },
    renderer: {
      async send(target, value) {
        events.push(['render', target.content, value]);
        assert.equal(target.guildId, 'guild');
        assert.equal(target.channelId, 'channel');
        assert.equal(target.deletable, false);
        await target.reply({ content: value.content, components: [{ type: 1 }] });
        await target.channel.send({ content: 'media follow-up' });
      },
    },
  });
  await handler({
    id: 'fix-guild',
    commandName: 'fix',
    guildId: 'guild',
    channelId: 'channel',
    options: { getString(name, required) {
      assert.equal(name, 'url');
      assert.equal(required, true);
      return 'prefix https://x.com/example/status/1';
    } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async deferReply(payload) { events.push(['defer', payload]); },
    async editReply(payload) { events.push(['edit', payload]); },
    async followUp(payload) { events.push(['follow-up', payload]); },
  });
  assert.deepEqual(events, [
    ['match', 'prefix https://x.com/example/status/1'],
    ['defer', {}],
    ['resolve', candidate],
    ['render', 'prefix https://x.com/example/status/1', preview],
    ['edit', { content: preview.content }],
    ['follow-up', { content: 'media follow-up' }],
  ]);
});

test('fix returns an ephemeral response when no current provider matches', async () => {
  let reply;
  const handler = createInteractionHandler({
    previewService: { match() { return null; } },
    renderer: { async send() { throw new Error('must not render'); } },
  });
  await handler({
    id: 'fix-unsupported',
    commandName: 'fix',
    guildId: null,
    channelId: 'private-channel',
    options: { getString() { return 'https://example.test/unsupported'; } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async reply(payload) { reply = payload; },
  });
  assert.equal(reply.content, '不支援的連結。');
  assert.equal(reply.flags, MessageFlags.Ephemeral);
});

test('fix completes a deferred response when a supported provider declines its preview', async () => {
  let edit;
  const handler = createInteractionHandler({
    previewService: {
      match() { return { provider: { id: 'tiktok' }, index: 0 }; },
      async resolve() { return null; },
    },
    renderer: { async send() { throw new Error('must not render'); } },
  });
  await handler({
    id: 'fix-no-preview',
    commandName: 'fix',
    guildId: null,
    channelId: 'private-channel',
    options: { getString() { return 'https://www.tiktok.com/@example/video/1'; } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async deferReply(payload) { assert.deepEqual(payload, {}); },
    async editReply(payload) { edit = payload; },
  });
  assert.equal(edit.content, '目前無法產生此連結的預覽。');
});

test('message handler requires every permission needed for a reply with an embed', async () => {
  let requested;
  const handler = createMessageHandler({
    previewService: { match() { return { provider: { id: 'fixture' }, index: 0 }; } },
    renderer: {},
  });
  await handler({
    author: { bot: false },
    content: 'https://example.test',
    inGuild() { return true; },
    client: { user: { id: 'bot' } },
    channel: {
      isThread() { return false; },
      permissionsFor() { return { has(flags) { requested = flags; return false; } }; },
    },
  });
  assert.ok(requested.includes(PermissionsBitField.Flags.ViewChannel));
  assert.ok(requested.includes(PermissionsBitField.Flags.SendMessages));
  assert.ok(!requested.includes(PermissionsBitField.Flags.SendMessagesInThreads));
  assert.ok(requested.includes(PermissionsBitField.Flags.EmbedLinks));
  assert.ok(requested.includes(PermissionsBitField.Flags.ReadMessageHistory));
});

test('message handler requires the dedicated send permission inside threads', async () => {
  let requested;
  const handler = createMessageHandler({
    previewService: { match() { return { provider: { id: 'fixture' }, index: 0 }; } },
    renderer: {},
  });
  await handler({
    author: { bot: false },
    content: 'https://example.test',
    inGuild() { return true; },
    client: { user: { id: 'bot' } },
    channel: {
      isThread() { return true; },
      permissionsFor() { return { has(flags) { requested = flags; return false; } }; },
    },
  });
  assert.ok(requested.includes(PermissionsBitField.Flags.SendMessagesInThreads));
  assert.ok(!requested.includes(PermissionsBitField.Flags.SendMessages));
});

test('message handler treats Discord channel permission rejection as an expected skip', async () => {
  const logs = [];
  const handler = createMessageHandler({
    previewService: {
      match() { return { provider: { id: 'threads' }, index: 0 }; },
      async resolve() { return { content: 'https://threads.example/post/1' }; },
    },
    renderer: {
      async send() { throw Object.assign(new Error('Missing Permissions'), { code: 50013 }); },
    },
    logger: {
      warn(details, message) { logs.push(['warn', details, message]); },
      error(details, message) { logs.push(['error', details, message]); },
    },
  });
  await handler({
    id: 'message',
    guildId: 'guild',
    channelId: 'thread',
    author: { bot: false },
    content: 'https://threads.example/post/1',
    inGuild() { return true; },
    client: { user: { id: 'bot' } },
    channel: {
      isThread() { return true; },
      permissionsFor() { return { has() { return true; } }; },
    },
  });

  assert.equal(logs.length, 1);
  assert.equal(logs[0][0], 'warn');
  assert.equal(logs[0][1].err.code, 50013);
  assert.equal(logs[0][2], 'preview skipped because Discord denied channel access');
});

test('message handler performs no Discord action for an intentional no-preview result', async () => {
  let typingCalls = 0;
  let renderCalls = 0;
  const handler = createMessageHandler({
    previewService: {
      match() { return { provider: { id: 'tiktok' }, index: 0 }; },
      async resolve() { return null; },
    },
    renderer: { async send() { renderCalls += 1; } },
  });
  await handler({
    author: { bot: false },
    content: 'https://www.tiktok.com/@example/video/123',
    inGuild() { return true; },
    client: { user: { id: 'bot' } },
    channel: {
      permissionsFor() { return { has() { return true; } }; },
      async sendTyping() { typingCalls += 1; },
    },
  });
  assert.equal(typingCalls, 0);
  assert.equal(renderCalls, 0);
});

test('message handler skips a provider disabled by the Guild setting', async () => {
  let resolveCalls = 0;
  let debugLog;
  const handler = createMessageHandler({
    previewService: {
      match() { return { provider: { id: 'twitter' }, index: 0 }; },
      async resolve() { resolveCalls += 1; },
    },
    guildSettings: {
      async isPreviewDisabled(guildId, providerId) {
        assert.equal(guildId, 'guild');
        assert.equal(providerId, 'twitter');
        return true;
      },
    },
    renderer: { async send() { throw new Error('must not render'); } },
    logger: { debug(details, message) { debugLog = { details, message }; } },
  });
  await handler({
    author: { bot: false },
    guildId: 'guild',
    channelId: 'channel',
    id: 'message',
    content: 'https://x.com/example/status/1',
    inGuild() { return true; },
    client: { user: { id: 'bot' } },
    channel: { permissionsFor() { return { has() { return true; } }; } },
  });
  assert.equal(resolveCalls, 0);
  assert.equal(debugLog.message, 'preview skipped by Guild setting');
  assert.deepEqual(debugLog.details, {
    provider: 'twitter',
    guildId: 'guild',
    channelId: 'channel',
    messageId: 'message',
  });
});

test('banpreview lets a Guild administrator toggle one provider', async () => {
  const events = [];
  const handler = createInteractionHandler({
    guildSettings: {
      async togglePreview(guildId, providerId) {
        events.push(['toggle', guildId, providerId]);
        return { disabled: true, cacheUpdated: true };
      },
    },
    logger: {
      info(details, message) {
        events.push(['log', message, details]);
      },
    },
  });
  await handler({
    id: 'ban-preview',
    commandName: 'banpreview',
    guildId: 'guild',
    guild: { name: 'Test Guild' },
    user: { id: 'administrator', username: 'test-admin' },
    inGuild() { return true; },
    memberPermissions: { has(permission) { return permission === PermissionsBitField.Flags.Administrator; } },
    options: { getString(name, required) { assert.equal(name, 'site'); assert.equal(required, true); return 'twitter'; } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async deferReply(payload) { events.push(['defer', payload.flags]); },
    async editReply(payload) { events.push(['reply', payload.content]); },
  });
  assert.deepEqual(events, [
    ['defer', undefined],
    ['toggle', 'guild', 'twitter'],
    ['log', 'Guild preview setting changed', {
      command: 'banpreview',
      guildId: 'guild',
      guildName: 'Test Guild',
      userId: 'administrator',
      userName: 'test-admin',
      provider: 'twitter',
      previewDisabled: true,
      redisUpdated: true,
    }],
    ['reply', '已停用此伺服器的 Twitter 預覽。'],
  ]);
});

test('banpreview rejects a non-administrator without changing settings', async () => {
  let reply;
  const handler = createInteractionHandler({
    guildSettings: { async togglePreview() { throw new Error('must not toggle'); } },
  });
  await handler({
    id: 'ban-preview-denied',
    commandName: 'banpreview',
    inGuild() { return true; },
    memberPermissions: { has() { return false; } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async reply(payload) { reply = payload; },
  });
  assert.match(reply.content, /管理員/);
  assert.equal('flags' in reply, false);
});

test('resetpreview lets a Guild administrator restore every provider', async () => {
  const events = [];
  const handler = createInteractionHandler({
    guildSettings: {
      async resetPreviews(guildId) {
        events.push(['reset', guildId]);
        return { cacheUpdated: true };
      },
    },
    logger: {
      info(details, message) {
        events.push(['log', message, details]);
      },
    },
  });
  await handler({
    id: 'reset-preview',
    commandName: 'resetpreview',
    guildId: 'guild',
    guild: { name: 'Test Guild' },
    user: { id: 'administrator', username: 'test-admin' },
    inGuild() { return true; },
    memberPermissions: { has(permission) { return permission === PermissionsBitField.Flags.Administrator; } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async deferReply(payload) { events.push(['defer', payload.flags]); },
    async editReply(payload) { events.push(['reply', payload.content]); },
  });
  assert.deepEqual(events, [
    ['defer', undefined],
    ['reset', 'guild'],
    ['log', 'Guild preview settings reset', {
      command: 'resetpreview',
      guildId: 'guild',
      guildName: 'Test Guild',
      userId: 'administrator',
      userName: 'test-admin',
      redisUpdated: true,
    }],
    ['reply', '已恢復此伺服器的所有網站預覽。'],
  ]);
});

test('resetpreview rejects a non-administrator with a public response', async () => {
  let reply;
  const handler = createInteractionHandler({
    guildSettings: { async resetPreviews() { throw new Error('must not reset'); } },
  });
  await handler({
    id: 'reset-preview-denied',
    commandName: 'resetpreview',
    inGuild() { return true; },
    memberPermissions: { has() { return false; } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async reply(payload) { reply = payload; },
  });
  assert.match(reply.content, /管理員/);
  assert.equal('flags' in reply, false);
});

test('resetpreview reports failures publicly', async () => {
  let reply;
  const handler = createInteractionHandler({
    guildSettings: { async resetPreviews() { throw new Error('reset failed'); } },
    logger: { error() {} },
  });
  const interaction = {
    id: 'reset-preview-failed',
    commandName: 'resetpreview',
    guildId: 'guild',
    user: { id: 'administrator' },
    deferred: false,
    replied: false,
    inGuild() { return true; },
    memberPermissions: { has() { return true; } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async deferReply(payload) {
      assert.equal('flags' in payload, false);
      this.deferred = true;
    },
    async editReply(payload) { reply = payload; },
  };
  await handler(interaction);
  assert.equal(reply.content, '處理時發生錯誤。');
  assert.equal('flags' in reply, false);
});

test('info publicly reports the service status and Guild shard to an administrator', async () => {
  let reply;
  let deferred;
  const handler = createInteractionHandler({
    guildSettings: { async probeCacheReady() { return true; } },
  });
  await handler({
    id: 'info',
    commandName: 'info',
    guildId: 'guild',
    guild: { shardId: 4 },
    user: { id: 'administrator' },
    inGuild() { return true; },
    memberPermissions: { has(permission) { return permission === PermissionsBitField.Flags.Administrator; } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async deferReply(payload) { deferred = payload; },
    async editReply(payload) { reply = payload; },
  });
  assert.deepEqual(deferred, {});
  assert.equal(reply.content, [
    'ermiana 正常運作中。',
    'Cache 狀態：正常。',
    '目前正在 Shard 4 運作中。',
  ].join('\n'));
  assert.equal('flags' in reply, false);
});

test('administrator commands report pre-acknowledgement failures publicly', async () => {
  let reply;
  const handler = createInteractionHandler({ logger: { error() {} } });
  await handler({
    id: 'admin-command-pre-ack-failed',
    commandName: 'resetpreview',
    guildId: 'guild',
    user: { id: 'administrator' },
    replied: false,
    deferred: false,
    inGuild() { return true; },
    memberPermissions: { has() { return true; } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async reply(payload) { reply = payload; },
  });
  assert.equal(reply.content, '處理時發生錯誤。');
  assert.equal('flags' in reply, false);
});

test('administrator commands use a public follow-up after an earlier acknowledgement', async () => {
  let followUp;
  const handler = createInteractionHandler({ logger: { error() {} } });
  await handler({
    id: 'admin-command-post-ack-failed',
    commandName: 'resetpreview',
    guildId: 'guild',
    user: { id: 'administrator' },
    replied: true,
    deferred: false,
    inGuild() { return true; },
    memberPermissions: { has() { return true; } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async followUp(payload) { followUp = payload; },
  });
  assert.equal(followUp.content, '處理時發生錯誤。');
  assert.equal('flags' in followUp, false);
});

test('info reports degraded SQLite reads when the Guild cache is unavailable', async () => {
  let reply;
  const handler = createInteractionHandler({
    guildSettings: { async probeCacheReady() { return false; } },
  });
  await handler({
    id: 'info-cache-unavailable',
    commandName: 'info',
    guildId: 'guild',
    guild: { shardId: 2 },
    user: { id: 'administrator' },
    inGuild() { return true; },
    memberPermissions: { has() { return true; } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async deferReply(payload) { assert.deepEqual(payload, {}); },
    async editReply(payload) { reply = payload; },
  });
  assert.equal(reply.content, [
    'ermiana 降級運作中。',
    'Cache 狀態：未就緒，暫時直接自資料庫讀取伺服器設定。',
    '目前正在 Shard 2 運作中。',
  ].join('\n'));
  assert.equal('flags' in reply, false);
});

test('info rejects a non-administrator with a public response', async () => {
  let reply;
  const handler = createInteractionHandler();
  await handler({
    id: 'info-denied',
    commandName: 'info',
    guildId: 'guild',
    guild: { shardId: 4 },
    user: { id: 'member' },
    inGuild() { return true; },
    memberPermissions: { has() { return false; } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async reply(payload) { reply = payload; },
  });
  assert.match(reply.content, /管理員/);
  assert.equal('flags' in reply, false);
});

test('check publicly reports readable channels and missing permissions', async () => {
  let reply;
  const botMember = { id: 'bot' };
  const allRequired = [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.SendMessagesInThreads,
    PermissionsBitField.Flags.ManageMessages,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.AttachFiles,
    PermissionsBitField.Flags.ReadMessageHistory,
  ];
  const channel = (id, permissions, type = ChannelType.GuildText) => ({
    id,
    type,
    permissionsFor(member) {
      assert.strictEqual(member, botMember);
      return new PermissionsBitField(permissions);
    },
  });
  const handler = createInteractionHandler();
  await handler({
    id: 'check',
    commandName: 'check',
    guildId: 'guild',
    guild: {
      members: { me: botMember },
      channels: { cache: new Map([
        ['complete', channel('1001', allRequired)],
        ['partial', channel('1002', [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.EmbedLinks,
        ], ChannelType.GuildAnnouncement)],
        ['hidden', channel('1003', allRequired.filter((flag) => flag !== PermissionsBitField.Flags.ViewChannel))],
        ['forum', channel(
          '1004',
          allRequired.filter((flag) => flag !== PermissionsBitField.Flags.SendMessages),
          ChannelType.GuildForum,
        )],
        ['media', channel(
          '1005',
          allRequired.filter((flag) => flag !== PermissionsBitField.Flags.SendMessages),
          ChannelType.GuildMedia,
        )],
        ['voice', channel('1006', allRequired, ChannelType.GuildVoice)],
        ['thread', channel('1007', allRequired, ChannelType.PublicThread)],
      ]) },
    },
    user: { id: 'administrator' },
    inGuild() { return true; },
    memberPermissions: { has(permission) { return permission === PermissionsBitField.Flags.Administrator; } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async reply(payload) { reply = payload; },
  });
  assert.equal(reply.content, [
    '可讀取頻道：4 / 5 個。',
    '未開放「檢視頻道」權限：1 個。',
    '可讀取頻道的 Bot 權限設定異常：',
    '- 在討論串中傳送訊息：1 個頻道缺少 (<#1002>)',
    '- 管理訊息：1 個頻道缺少 (<#1002>)',
    '- 附加檔案：1 個頻道缺少 (<#1002>)',
    '- 讀取訊息歷史：1 個頻道缺少 (<#1002>)',
  ].join('\n'));
  assert.equal('flags' in reply, false);
});

test('check reports normal permissions when every channel has all required flags', async () => {
  let reply;
  const permissions = new PermissionsBitField([
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.SendMessagesInThreads,
    PermissionsBitField.Flags.ManageMessages,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.AttachFiles,
    PermissionsBitField.Flags.ReadMessageHistory,
  ]);
  const handler = createInteractionHandler();
  await handler({
    id: 'check-normal',
    commandName: 'check',
    guildId: 'guild',
    guild: {
      members: { me: { id: 'bot' } },
      channels: { cache: new Map([
        ['one', {
          type: ChannelType.GuildText,
          permissionsFor() { return permissions; },
        }],
        ['two', {
          type: ChannelType.GuildAnnouncement,
          permissionsFor() { return permissions; },
        }],
      ]) },
    },
    user: { id: 'administrator' },
    inGuild() { return true; },
    memberPermissions: { has() { return true; } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async reply(payload) { reply = payload; },
  });
  assert.equal(
    reply.content,
    '可讀取頻道：2 / 2 個。\n可讀取頻道中未發現其他權限缺失。',
  );
  assert.equal('flags' in reply, false);
});

test('check limits channel mentions so its public response stays within Discord limits', async () => {
  let reply;
  const channelIds = Array.from({ length: 12 }, (_, index) => `9000000000000000${index.toString().padStart(2, '0')}`);
  const channels = new Map(channelIds.map((id) => [id, {
    id,
    type: ChannelType.GuildText,
    permissionsFor() {
      return new PermissionsBitField([PermissionsBitField.Flags.ViewChannel]);
    },
  }]));
  const handler = createInteractionHandler();
  await handler({
    id: 'check-many-missing',
    commandName: 'check',
    guildId: 'guild',
    guild: {
      members: { me: { id: 'bot' } },
      channels: { cache: channels },
    },
    user: { id: 'administrator' },
    inGuild() { return true; },
    memberPermissions: { has() { return true; } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async reply(payload) { reply = payload; },
  });
  assert.match(
    reply.content,
    new RegExp(`- 發送訊息：12 個頻道缺少 \\(<#${channelIds[0]}>.*，另 2 個\\)`),
  );
  assert.equal(reply.content.includes(`<#${channelIds[10]}>`), false);
  assert.ok(reply.content.length <= 2_000);
});

test('check rejects a non-administrator before reading the channel cache', async () => {
  let reply;
  const handler = createInteractionHandler();
  await handler({
    id: 'check-denied',
    commandName: 'check',
    guildId: 'guild',
    guild: { get channels() { throw new Error('must not inspect channels'); } },
    user: { id: 'member' },
    inGuild() { return true; },
    memberPermissions: { has() { return false; } },
    isButton() { return false; },
    isChatInputCommand() { return true; },
    isMessageContextMenuCommand() { return false; },
    async reply(payload) { reply = payload; },
  });
  assert.match(reply.content, /管理員/);
  assert.equal('flags' in reply, false);
});

test('message handler recognizes the legacy ||URL|| spoiler form', async () => {
  const contents = [
    '作品：||https://www.pixiv.net/artworks/143435883||',
    '||[https://www.pixiv.net/artworks/143435883||](https://www.pixiv.net/artworks/143435883||)',
  ];
  const renderOptions = [];
  const handler = createMessageHandler({
    previewService: {
      match(value) {
        return {
          provider: { id: 'pixiv' },
          index: value.indexOf('https://'),
        };
      },
      async resolve() {
        return { canonicalUrl: 'https://www.pixiv.net/artworks/143435883' };
      },
    },
    renderer: { async send(_message, _preview, options) { renderOptions.push(options); } },
  });
  for (const content of contents) {
    await handler({
      author: { bot: false },
      content,
      inGuild() { return true; },
      client: { user: { id: 'bot' } },
      channel: {
        permissionsFor() { return { has() { return true; } }; },
        async sendTyping() {},
      },
    });
  }
  assert.deepEqual(renderOptions.map(({ spoiler }) => spoiler), [true, true]);
});

test('message removal acknowledges the interaction before deleting', async () => {
  const events = [];
  const handler = createInteractionHandler({ cache: {} });
  await handler({
    id: 'interaction',
    commandName: 'removeMessage',
    locale: 'en-US',
    isButton() { return false; },
    isMessageContextMenuCommand() { return true; },
    client: { user: { id: 'bot' } },
    targetMessage: {
      author: { id: 'bot' },
      deletable: true,
      async delete() { events.push('delete'); },
    },
    async deferReply(payload) {
      events.push('defer');
      assert.equal(payload.flags, MessageFlags.Ephemeral);
    },
    async editReply() { events.push('edit'); },
  });
  assert.deepEqual(events, ['defer', 'delete', 'edit']);
});

test('message removal rejects messages from other authors without deleting', async () => {
  let reply;
  const handler = createInteractionHandler();
  await handler({
    id: 'not-mine',
    commandName: 'removeMessage',
    locale: 'zh-TW',
    isButton() { return false; },
    isMessageContextMenuCommand() { return true; },
    client: { user: { id: 'bot' } },
    targetMessage: { author: { id: 'someone-else' }, deletable: true },
    async reply(payload) { reply = payload; },
  });
  assert.equal(reply.content, '我只能刪除由我自己發送的訊息喔。');
  assert.equal(reply.flags, MessageFlags.Ephemeral);
});

test('message removal preserves the legacy public success for preview replies', async () => {
  const events = [];
  const handler = createInteractionHandler();
  await handler({
    id: 'public-success',
    commandName: 'removeMessage',
    locale: 'en-US',
    isButton() { return false; },
    isMessageContextMenuCommand() { return true; },
    client: { user: { id: 'bot' } },
    targetMessage: {
      author: { id: 'bot' },
      deletable: true,
      reference: { messageId: 'source' },
      async delete() { events.push('delete'); },
    },
    async deferReply(payload) {
      events.push('defer');
      assert.deepEqual(payload, {});
    },
    async editReply(payload) {
      events.push('edit');
      assert.equal(payload.content, 'Message deleted successfully.');
    },
  });
  assert.deepEqual(events, ['defer', 'delete', 'edit']);
});

test('message removal preserves the legacy no-permission response', async () => {
  let reply;
  const handler = createInteractionHandler();
  await handler({
    id: 'not-deletable',
    commandName: 'removeMessage',
    locale: 'en-GB',
    isButton() { return false; },
    isMessageContextMenuCommand() { return true; },
    client: { user: { id: 'bot' } },
    targetMessage: { author: { id: 'bot' }, deletable: false },
    async reply(payload) { reply = payload; },
  });
  assert.match(reply.content, /^I cannot delete this message/);
  assert.equal(reply.flags, MessageFlags.Ephemeral);
});

test('message removal reports a Discord deletion failure after acknowledgement', async () => {
  const events = [];
  let warning;
  const handler = createInteractionHandler({ logger: { warn(details) { warning = details; }, error() {} } });
  await handler({
    id: 'delete-failed',
    commandName: 'removeMessage',
    locale: 'ja',
    isButton() { return false; },
    isMessageContextMenuCommand() { return true; },
    client: { user: { id: 'bot' } },
    targetMessage: {
      id: 'target',
      author: { id: 'bot' },
      deletable: true,
      async delete() { events.push('delete'); throw new Error('Discord rejected deletion'); },
    },
    async deferReply(payload) {
      events.push('defer');
      assert.equal(payload.flags, MessageFlags.Ephemeral);
    },
    async editReply(payload) {
      events.push('edit');
      assert.equal(payload.content, 'メッセージの削除に失敗しました。');
    },
  });
  assert.deepEqual(events, ['defer', 'delete', 'edit']);
  assert.equal(warning.targetMessageId, 'target');
});

test('message removal converts a deferred public response to an ephemeral failure', async () => {
  const events = [];
  const handler = createInteractionHandler({ logger: { warn() {}, error() {} } });
  await handler({
    id: 'public-delete-failed',
    commandName: 'removeMessage',
    locale: 'en-US',
    isButton() { return false; },
    isMessageContextMenuCommand() { return true; },
    client: { user: { id: 'bot' } },
    targetMessage: {
      id: 'target',
      author: { id: 'bot' },
      deletable: true,
      reference: { messageId: 'source' },
      async delete() { events.push('delete'); throw new Error('Discord rejected deletion'); },
    },
    async deferReply(payload) { events.push('defer'); assert.deepEqual(payload, {}); },
    async deleteReply() { events.push('delete-reply'); },
    async followUp(payload) {
      events.push('follow-up');
      assert.equal(payload.content, 'Failed to delete the message.');
      assert.equal(payload.flags, MessageFlags.Ephemeral);
    },
  });
  assert.deepEqual(events, ['defer', 'delete', 'delete-reply', 'follow-up']);
});

test('cycles arbitrary images using only URLs stored in Discord components', async () => {
  let edited;
  const handler = createInteractionHandler();
  await handler({
    id: 'cycle',
    customId: PAGINATION_IDS.cycle,
    isButton() { return true; },
    isMessageContextMenuCommand() { return false; },
    async deferUpdate() {},
    message: {
      embeds: [new EmbedBuilder().setImage('https://example.test/1.jpg').toJSON()],
      components: [{ components: [
        { customId: PAGINATION_IDS.cycle, label: '更多圖片', url: null },
        { customId: null, label: '2', url: 'https://example.test/2.jpg' },
      ] }],
      async edit(payload) { edited = payload; },
    },
  });
  assert.equal(edited.embeds[0].toJSON().image.url, 'https://example.test/2.jpg');
  assert.equal(edited.components[0].toJSON().components[1].custom_id, PAGINATION_IDS.cycle);
  assert.equal(edited.components[0].toJSON().components[1].label, '更多圖片');
});

test('cycles all four legacy generic-image positions and wraps to the first', async () => {
  const images = Array.from({ length: 4 }, (_, index) => `https://example.test/${index + 1}.jpg`);
  const message = {
    embeds: [new EmbedBuilder().setImage(images[0]).toJSON()],
    components: interactionComponents(createUrlStorageRow(images)),
    async edit(payload) { applyMessageEdit(this, payload); },
  };
  const handler = createInteractionHandler();
  const visited = [];
  for (let click = 0; click < 4; click += 1) {
    await handler({
      id: `cycle-${click}`,
      customId: PAGINATION_IDS.cycle,
      isButton() { return true; },
      isMessageContextMenuCommand() { return false; },
      async deferUpdate() {},
      message,
    });
    visited.push(message.embeds[0].image.url);
  }
  assert.deepEqual(visited, [images[1], images[2], images[3], images[0]]);
});

test('removes malformed pagination controls before reporting the legacy-style error', async () => {
  const events = [];
  const handler = createInteractionHandler();
  await handler({
    id: 'malformed-pagination',
    customId: PAGINATION_IDS.cycle,
    isButton() { return true; },
    isMessageContextMenuCommand() { return false; },
    async deferUpdate() { events.push('defer'); },
    async followUp(payload) {
      events.push('follow-up');
      assert.equal(payload.flags, MessageFlags.Ephemeral);
    },
    message: {
      embeds: [new EmbedBuilder().setImage('https://example.test/1.jpg').toJSON()],
      components: [{ components: Array.from({ length: 5 }, () => ({
        customId: PAGINATION_IDS.cycle,
        url: null,
      })) }],
      async edit(payload) {
        events.push('clear');
        assert.deepEqual(payload.components, []);
      },
    },
  });
  assert.deepEqual(events, ['defer', 'clear', 'follow-up']);
});

test('derives Pixiv pages from the Discord embed URL and page label', async () => {
  let edited;
  const handler = createInteractionHandler();
  await handler({
    id: 'pixiv-next',
    customId: PAGINATION_IDS.next,
    isButton() { return true; },
    isMessageContextMenuCommand() { return false; },
    async deferUpdate() {},
    message: {
      embeds: [new EmbedBuilder().setImage('https://pixiv.canaria.cc/img/42_p0.jpg').toJSON()],
      components: [{ components: [
        { label: '<<' }, { label: '<' }, { label: '1/3' }, { label: '>' }, { label: '>>' },
      ] }],
      async edit(payload) { edited = payload; },
    },
  });
  assert.equal(edited.embeds[0].toJSON().image.url, 'https://pixiv.canaria.cc/img/42_p1.jpg');
  assert.equal(edited.components[0].toJSON().components[2].label, '2/3');
});

test('derives nHentai pages from sequential gallery image URLs', async () => {
  const message = {
    embeds: [new EmbedBuilder().setImage('https://i2.nhentai.net/galleries/3816046/1.webp').toJSON()],
    components: interactionComponents(createNhentaiPaginationRow(1, 188)),
    async edit(payload) { applyMessageEdit(this, payload); },
  };
  const handler = createInteractionHandler();
  for (const [customId, expectedPage] of [
    [NHENTAI_PAGINATION_IDS.next, 2],
    [NHENTAI_PAGINATION_IDS.last, 188],
    [NHENTAI_PAGINATION_IDS.previous, 187],
    [NHENTAI_PAGINATION_IDS.first, 1],
  ]) {
    await handler({
      id: `nhentai-${customId}`,
      customId,
      isButton() { return true; },
      isMessageContextMenuCommand() { return false; },
      async deferUpdate() {},
      message,
    });
    assert.equal(message.embeds[0].image.url, `https://i2.nhentai.net/galleries/3816046/${expectedPage}.webp`);
    assert.equal(message.components[0].components[2].label, `${expectedPage}/188`);
  }
});

test('keeps Pixiv and nHentai URL handlers isolated by their button IDs', async () => {
  const handler = createInteractionHandler();
  for (const [customId, row, imageUrl] of [
    [
      NHENTAI_PAGINATION_IDS.next,
      createNhentaiPaginationRow(1, 3),
      'https://pixiv.canaria.cc/img/42_p0.jpg',
    ],
    [
      PAGINATION_IDS.next,
      createPaginationRow(1, 3),
      'https://i.nhentai.net/galleries/7/1.webp',
    ],
  ]) {
    const events = [];
    await handler({
      id: `isolated-${customId}`,
      customId,
      isButton() { return true; },
      isMessageContextMenuCommand() { return false; },
      async deferUpdate() { events.push('defer'); },
      async followUp(payload) {
        events.push('follow-up');
        assert.equal(payload.flags, MessageFlags.Ephemeral);
      },
      message: {
        embeds: [new EmbedBuilder().setImage(imageUrl).toJSON()],
        components: interactionComponents(row),
        async edit(payload) {
          events.push('clear');
          assert.deepEqual(payload.components, []);
        },
      },
    });
    assert.deepEqual(events, ['defer', 'clear', 'follow-up']);
  }
});

test('supports every Pixiv direction and keeps boundary clicks as no-ops', async () => {
  const message = {
    embeds: [new EmbedBuilder().setImage('https://pixiv.canaria.cc/img/42_p1.jpg').toJSON()],
    components: interactionComponents(createPaginationRow(2, 4)),
    edits: 0,
    async edit(payload) {
      this.edits += 1;
      applyMessageEdit(this, payload);
    },
  };
  const handler = createInteractionHandler();
  async function click(customId) {
    await handler({
      id: customId,
      customId,
      isButton() { return true; },
      isMessageContextMenuCommand() { return false; },
      async deferUpdate() {},
      message,
    });
  }

  await click(PAGINATION_IDS.first);
  assert.equal(message.embeds[0].image.url, 'https://pixiv.canaria.cc/img/42_p0.jpg');
  await click(PAGINATION_IDS.first);
  assert.equal(message.edits, 1);
  await click(PAGINATION_IDS.next);
  assert.equal(message.embeds[0].image.url, 'https://pixiv.canaria.cc/img/42_p1.jpg');
  await click(PAGINATION_IDS.last);
  assert.equal(message.embeds[0].image.url, 'https://pixiv.canaria.cc/img/42_p3.jpg');
  await click(PAGINATION_IDS.last);
  assert.equal(message.edits, 3);
  await click(PAGINATION_IDS.previous);
  assert.equal(message.embeds[0].image.url, 'https://pixiv.canaria.cc/img/42_p2.jpg');
});
