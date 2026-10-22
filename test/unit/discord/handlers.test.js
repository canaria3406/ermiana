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

test('message handler skips a provider disabled by the Guild setting', async () => {
  let resolveCalls = 0;
  let debugLog;
  const handler = createMessageHandler({
    previewService: {
      match() { return { provider: { id: 'twitter' }, index: 0 }; },
      async resolve() { resolveCalls += 1; },
    },
    guildSettings: {
      async getPreviewSettings(guildId, providerId) {
        assert.equal(guildId, 'guild');
        assert.equal(providerId, 'twitter');
        return { disabled: true, twitterStyle: 'default' };
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
      redisUpdated: true,
    }],
    ['reply', '已恢復此伺服器的所有網站預覽。'],
  ]);
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

test('check publicly reports readable channels and missing permissions', async () => {
  let reply;
  const botMember = { id: 'bot' };
  const allRequired = [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.SendMessagesInThreads,
    PermissionsBitField.Flags.ManageMessages,
    PermissionsBitField.Flags.EmbedLinks,
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
    '- 讀取訊息歷史：1 個頻道缺少 (<#1002>)',
  ].join('\n'));
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
