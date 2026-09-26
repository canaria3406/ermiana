import {
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import {
  BAN_PREVIEW_COMMAND_NAME,
  CHECK_COMMAND_NAME,
  FIX_COMMAND_NAME,
  INFO_COMMAND_NAME,
  PREVIEW_PROVIDER_CHOICES,
  REMOVE_MESSAGE_COMMAND_NAME,
  RESET_PREVIEW_COMMAND_NAME,
  TWITTER_STYLE_CHOICES,
  TWITTER_STYLE_COMMAND_NAME,
} from './commands.js';
import {
  createNhentaiPaginationRow,
  createPaginationRow,
  createUrlStorageRow,
  NHENTAI_PAGINATION_IDS,
  PAGINATION_IDS,
} from './renderer.js';

const PAGINATION_HANDLERS = new Map([
  [PAGINATION_IDS.cycle, handleUrlStoragePagination],
  [PAGINATION_IDS.first, handleTemplatePagination],
  [PAGINATION_IDS.previous, handleTemplatePagination],
  [PAGINATION_IDS.next, handleTemplatePagination],
  [PAGINATION_IDS.last, handleTemplatePagination],
  [NHENTAI_PAGINATION_IDS.first, handleNhentaiPagination],
  [NHENTAI_PAGINATION_IDS.previous, handleNhentaiPagination],
  [NHENTAI_PAGINATION_IDS.next, handleNhentaiPagination],
  [NHENTAI_PAGINATION_IDS.last, handleNhentaiPagination],
]);

const CHECKED_CHANNEL_TYPES = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
]);

const VIEW_CHANNEL_PERMISSION = Object.freeze({
  flag: PermissionFlagsBits.ViewChannel,
  label: '檢視頻道',
});

const CHANNEL_PERMISSION_CHECKS = Object.freeze([
  { flag: PermissionFlagsBits.SendMessages, label: '發送訊息' },
  { flag: PermissionFlagsBits.SendMessagesInThreads, label: '在討論串中傳送訊息' },
  { flag: PermissionFlagsBits.ManageMessages, label: '管理訊息' },
  { flag: PermissionFlagsBits.EmbedLinks, label: '嵌入連結' },
  { flag: PermissionFlagsBits.AttachFiles, label: '附加檔案' },
  { flag: PermissionFlagsBits.ReadMessageHistory, label: '讀取訊息歷史' },
]);

const DIRECT_MESSAGE_CHANNEL_TYPES = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
]);

const MAX_MENTIONED_CHANNELS_PER_PERMISSION = 10;

const MESSAGES = {
  success: {
    'en-US': 'Message deleted successfully.',
    'en-GB': 'Message deleted successfully.',
    'zh-TW': '成功刪除訊息。',
    'zh-CN': '成功删除信息。',
    ja: 'メッセージを削除しました。',
  },
  failed: {
    'en-US': 'Failed to delete the message.',
    'en-GB': 'Failed to delete the message.',
    'zh-TW': '刪除訊息時發生錯誤。',
    'zh-CN': '删除信息时发生错误。',
    ja: 'メッセージの削除に失敗しました。',
  },
  noPermission: {
    'en-US': 'I cannot delete this message. Please contact the server administrator to grant me the necessary permissions.',
    'en-GB': 'I cannot delete this message. Please contact the server administrator to grant me the necessary permissions.',
    'zh-TW': '我無法刪除這個訊息，請聯絡伺服器管理員，並給我相關權限。',
    'zh-CN': '我无法删除这个信息，请联系服务器管理员，并给我相关权限。',
    ja: 'このメッセージを削除できません。サーバー管理者に連絡して、関連する権限を与えてください。',
  },
  notMine: {
    'en-US': 'I can only delete messages that I have sent.',
    'en-GB': 'I can only delete messages that I have sent.',
    'zh-TW': '我只能刪除由我自己發送的訊息喔。',
    'zh-CN': '我只能删除由我自己发送的信息。',
    ja: '私は自分で送信したメッセージのみを削除できます。',
  },
};

function localize(group, locale) {
  return MESSAGES[group][locale] ?? MESSAGES[group]['en-US'];
}

function templatePage(interaction) {
  const label = interaction.message.components[0]?.components[2]?.label;
  const match = label?.match(/^(\d+)\/(\d+)$/);
  return match
    ? { current: Number.parseInt(match[1], 10), total: Number.parseInt(match[2], 10) }
    : null;
}

async function editPaginationMessage(interaction, payload) {
  if (typeof interaction.editReply === 'function') return interaction.editReply(payload);
  return interaction.message.edit(payload);
}

async function paginationUnavailable(interaction) {
  await editPaginationMessage(interaction, { components: [] });
  await interaction.followUp({ content: '發生預期之外的錯誤。', flags: MessageFlags.Ephemeral });
}

async function handleUrlStoragePagination(interaction) {
  const components = interaction.message.components[0]?.components ?? [];
  const currentIndex = components.findIndex((button) => button.customId === PAGINATION_IDS.cycle);
  const currentUrl = interaction.message.embeds[0]?.image?.url;
  if (currentIndex < 0 || !currentUrl || components.length < 2 || components.length > 4) {
    await paginationUnavailable(interaction);
    return;
  }

  const images = components.map((button, index) => index === currentIndex ? currentUrl : button.url);
  if (images.some((url) => typeof url !== 'string' || !/^https?:\/\//.test(url))) {
    await paginationUnavailable(interaction);
    return;
  }
  const targetIndex = (currentIndex + 1) % images.length;
  const embed = EmbedBuilder.from(interaction.message.embeds[0]).setImage(images[targetIndex]);
  await editPaginationMessage(interaction, {
    embeds: [embed],
    components: [createUrlStorageRow(images, targetIndex)],
  });
}

async function handleTemplatePagination(interaction) {
  const page = templatePage(interaction);
  const currentUrl = interaction.message.embeds[0]?.image?.url;
  if (!page || !currentUrl) {
    await paginationUnavailable(interaction);
    return;
  }
  const targets = {
    [PAGINATION_IDS.first]: 1,
    [PAGINATION_IDS.previous]: Math.max(1, page.current - 1),
    [PAGINATION_IDS.next]: Math.min(page.total, page.current + 1),
    [PAGINATION_IDS.last]: page.total,
  };
  const target = targets[interaction.customId];
  const currentImagePage = currentUrl.match(/_p(\d+)(?=[._])/);
  if (!target || !currentImagePage || Number.parseInt(currentImagePage[1], 10) !== page.current - 1) {
    await paginationUnavailable(interaction);
    return;
  }
  if (target === page.current) return;
  const targetUrl = currentUrl.replace(/_p\d+(?=[._])/, `_p${target - 1}`);
  const embed = EmbedBuilder.from(interaction.message.embeds[0]).setImage(targetUrl);
  await editPaginationMessage(interaction, {
    embeds: [embed],
    components: [createPaginationRow(target, page.total)],
  });
}

async function handleNhentaiPagination(interaction) {
  const page = templatePage(interaction);
  const currentUrl = interaction.message.embeds[0]?.image?.url;
  if (!page || !currentUrl) {
    await paginationUnavailable(interaction);
    return;
  }
  const targets = {
    [NHENTAI_PAGINATION_IDS.first]: 1,
    [NHENTAI_PAGINATION_IDS.previous]: Math.max(1, page.current - 1),
    [NHENTAI_PAGINATION_IDS.next]: Math.min(page.total, page.current + 1),
    [NHENTAI_PAGINATION_IDS.last]: page.total,
  };
  const target = targets[interaction.customId];
  let url;
  try {
    url = new URL(currentUrl);
  } catch {
    await paginationUnavailable(interaction);
    return;
  }
  const currentImagePage = url.pathname.match(/^(\/galleries\/[1-9]\d*\/)([1-9]\d*)\.(jpe?g|png|gif|webp)$/i);
  if (!target
    || url.protocol !== 'https:'
    || !/^i(?:\d+)?\.nhentai\.net$/i.test(url.hostname)
    || url.port
    || url.username
    || url.password
    || url.search
    || url.hash
    || !currentImagePage
    || Number.parseInt(currentImagePage[2], 10) !== page.current) {
    await paginationUnavailable(interaction);
    return;
  }
  if (target === page.current) return;
  url.pathname = `${currentImagePage[1]}${target}.${currentImagePage[3]}`;
  const embed = EmbedBuilder.from(interaction.message.embeds[0]).setImage(url.href);
  await editPaginationMessage(interaction, {
    embeds: [embed],
    components: [createNhentaiPaginationRow(target, page.total)],
  });
}

async function handleRemoveMessage(interaction, logger) {
  if (interaction.commandName !== REMOVE_MESSAGE_COMMAND_NAME) return;
  const target = interaction.targetMessage;
  if (target.author.id !== interaction.client.user.id) {
    await interaction.reply({ content: localize('notMine', interaction.locale), flags: MessageFlags.Ephemeral });
    return;
  }
  if (!target.deletable) {
    await interaction.reply({ content: localize('noPermission', interaction.locale), flags: MessageFlags.Ephemeral });
    return;
  }
  const publicSuccess = Boolean(
    target.reference?.messageId
    || target.interaction?.id
    || target.interactionMetadata?.id,
  );
  await interaction.deferReply(publicSuccess ? {} : { flags: MessageFlags.Ephemeral });
  try {
    await target.delete();
    await interaction.editReply({ content: localize('success', interaction.locale) });
  } catch (error) {
    logger?.warn({ err: error, interactionId: interaction.id, targetMessageId: target.id }, 'could not delete target message');
    const payload = { content: localize('failed', interaction.locale), flags: MessageFlags.Ephemeral };
    if (publicSuccess) {
      await interaction.deleteReply().catch((responseError) => {
        logger?.warn({ err: responseError, interactionId: interaction.id }, 'could not remove public deletion response');
      });
      await interaction.followUp(payload);
    } else {
      await interaction.editReply({ content: payload.content });
    }
  }
}

function isAdministratorCommand(interaction) {
  return interaction.commandName === BAN_PREVIEW_COMMAND_NAME
    || interaction.commandName === TWITTER_STYLE_COMMAND_NAME
    || interaction.commandName === RESET_PREVIEW_COMMAND_NAME
    || interaction.commandName === INFO_COMMAND_NAME
    || interaction.commandName === CHECK_COMMAND_NAME;
}

async function requireGuildAdministrator(interaction, logger) {
  if (interaction.inGuild() && interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return true;
  }
  logger?.debug?.({
    command: interaction.commandName,
    guildId: interaction.guildId,
  }, 'Administrator-only command denied');
  await interaction.reply({ content: '只有伺服器管理員可以使用此指令。' });
  return false;
}

async function handleBanPreview(interaction, guildSettings, logger) {
  if (interaction.commandName !== BAN_PREVIEW_COMMAND_NAME) return;
  if (!await requireGuildAdministrator(interaction, logger)) return;
  if (!guildSettings) throw new Error('Guild settings service is unavailable');

  const providerId = interaction.options.getString('site', true);
  const provider = PREVIEW_PROVIDER_CHOICES.find((choice) => choice.value === providerId);
  if (!provider) throw new Error(`Unknown preview provider: ${providerId}`);

  await interaction.deferReply({});
  const result = await guildSettings.togglePreview(interaction.guildId, providerId);
  logger?.info?.({
    command: BAN_PREVIEW_COMMAND_NAME,
    guildId: interaction.guildId,
    guildName: interaction.guild?.name,
    provider: providerId,
    previewDisabled: result.disabled,
    redisUpdated: result.cacheUpdated,
  }, 'Guild preview setting changed');
  const action = result.disabled ? '已停用' : '已恢復';
  const cacheStatus = result.cacheUpdated ? '' : ' 設定已保存；快取恢復後會自動同步。';
  await interaction.editReply({ content: `${action}此伺服器的 ${provider.name} 預覽。${cacheStatus}` });
}

async function handleTwitterStyle(interaction, guildSettings, logger) {
  if (interaction.commandName !== TWITTER_STYLE_COMMAND_NAME) return;
  if (!await requireGuildAdministrator(interaction, logger)) return;
  if (!guildSettings) throw new Error('Guild settings service is unavailable');

  const style = interaction.options.getString('style', true);
  if (!TWITTER_STYLE_CHOICES.some((choice) => choice.value === style)) {
    throw new Error(`Unknown Twitter style: ${style}`);
  }

  await interaction.deferReply({});
  const result = await guildSettings.setTwitterStyle(interaction.guildId, style);
  const cacheStatus = result.cacheUpdated ? '' : ' 設定已保存；快取恢復後會自動同步。';
  await interaction.editReply({ content: `已將此伺服器的 Twitter 預覽設定為 ${style}。${cacheStatus}` });
}

async function handleResetPreview(interaction, guildSettings, logger) {
  if (interaction.commandName !== RESET_PREVIEW_COMMAND_NAME) return;
  if (!await requireGuildAdministrator(interaction, logger)) return;
  if (!guildSettings) throw new Error('Guild settings service is unavailable');

  await interaction.deferReply({});
  const result = await guildSettings.resetPreviews(interaction.guildId);
  logger?.info?.({
    command: RESET_PREVIEW_COMMAND_NAME,
    guildId: interaction.guildId,
    guildName: interaction.guild?.name,
    redisUpdated: result.cacheUpdated,
  }, 'Guild preview settings reset');
  const cacheStatus = result.cacheUpdated ? '' : ' 設定已清除；快取恢復後會自動同步。';
  await interaction.editReply({ content: `已恢復此伺服器的所有網站預覽。${cacheStatus}` });
}

async function handleInfo(interaction, guildSettings, logger) {
  if (interaction.commandName !== INFO_COMMAND_NAME) return;
  if (!await requireGuildAdministrator(interaction, logger)) return;
  if (!guildSettings) throw new Error('Guild settings service is unavailable');
  if (!Number.isInteger(interaction.guild?.shardId)) {
    throw new Error('Guild shard ID is unavailable');
  }

  await interaction.deferReply({});
  const cacheReady = await guildSettings.probeCacheReady();
  const serviceStatus = cacheReady ? 'ermiana 正常運作中。' : 'ermiana 降級運作中。';
  const cacheStatus = cacheReady ? '正常' : '未就緒，暫時直接自資料庫讀取伺服器設定';
  await interaction.editReply({
    content: `${serviceStatus}\nCache 狀態：${cacheStatus}。\n目前正在 Shard ${interaction.guild.shardId} 運作中。`,
  });
}

async function handleCheck(interaction, logger) {
  if (interaction.commandName !== CHECK_COMMAND_NAME) return;
  if (!await requireGuildAdministrator(interaction, logger)) return;
  const guild = interaction.guild;
  const botMember = guild?.members?.me;
  if (!guild?.channels?.cache || !botMember) {
    throw new Error('Guild channel cache or bot member is unavailable');
  }

  const channels = [...guild.channels.cache.values()]
    .filter((channel) => CHECKED_CHANNEL_TYPES.has(channel.type));
  const missingChannels = new Map(CHANNEL_PERMISSION_CHECKS.map(({ flag }) => [flag, []]));
  let readableChannels = 0;
  for (const channel of channels) {
    const permissions = channel.permissionsFor(botMember);
    if (!permissions?.has(VIEW_CHANNEL_PERMISSION.flag)) continue;

    readableChannels += 1;
    for (const { flag } of CHANNEL_PERMISSION_CHECKS) {
      if (flag === PermissionFlagsBits.SendMessages && !DIRECT_MESSAGE_CHANNEL_TYPES.has(channel.type)) {
        continue;
      }
      if (!permissions.has(flag)) missingChannels.get(flag).push(channel.id);
    }
  }

  const missing = CHANNEL_PERMISSION_CHECKS
    .filter(({ flag }) => missingChannels.get(flag).length > 0)
    .map(({ flag, label }) => {
      const channelIds = missingChannels.get(flag);
      const mentions = channelIds
        .slice(0, MAX_MENTIONED_CHANNELS_PER_PERMISSION)
        .map((channelId) => `<#${channelId}>`)
        .join('、');
      const remaining = channelIds.length - MAX_MENTIONED_CHANNELS_PER_PERMISSION;
      const overflow = remaining > 0 ? `，另 ${remaining} 個` : '';
      return `- ${label}：${channelIds.length} 個頻道缺少 (${mentions}${overflow})`;
    });
  const status = missing.length === 0
    ? '可讀取頻道中未發現其他權限缺失。'
    : `可讀取頻道的 Bot 權限設定異常：\n${missing.join('\n')}`;
  const hiddenChannels = channels.length - readableChannels;
  const visibility = hiddenChannels === 0
    ? ''
    : `\n未開放「${VIEW_CHANNEL_PERMISSION.label}」權限：${hiddenChannels} 個。`;
  await interaction.reply({
    content: `可讀取頻道：${readableChannels} / ${channels.length} 個。${visibility}\n${status}`,
  });
}

async function handleFix(interaction, previewService, renderer) {
  if (interaction.commandName !== FIX_COMMAND_NAME) return;
  if (!previewService || !renderer) throw new Error('Preview service or renderer is unavailable');

  const content = interaction.options.getString('url', true);
  const candidate = previewService.match(content);
  if (!candidate) {
    await interaction.reply({ content: '不支援的連結。', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({});
  const preview = await previewService.resolve(candidate);
  if (!preview) {
    await interaction.editReply({ content: '目前無法產生此連結的預覽。' });
    return;
  }

  await renderer.send({
    content,
    id: interaction.id,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    deletable: false,
    async reply(payload) {
      const replyPayload = { ...payload };
      delete replyPayload.components;
      return interaction.editReply(replyPayload);
    },
    channel: {
      async send(payload) {
        return interaction.followUp(payload);
      },
    },
  }, preview, { twitterStyle: 'old' });
}

export function createInteractionHandler({ guildSettings, previewService, renderer, logger } = {}) {
  return async function handleInteraction(interaction) {
    try {
      const paginationHandler = interaction.isButton() && PAGINATION_HANDLERS.get(interaction.customId);
      if (paginationHandler) {
        await interaction.deferUpdate();
        await paginationHandler(interaction);
      } else if (interaction.isChatInputCommand?.()) {
        await handleBanPreview(interaction, guildSettings, logger);
        await handleTwitterStyle(interaction, guildSettings, logger);
        await handleResetPreview(interaction, guildSettings, logger);
        await handleInfo(interaction, guildSettings, logger);
        await handleCheck(interaction, logger);
        await handleFix(interaction, previewService, renderer);
      } else if (interaction.isMessageContextMenuCommand()) {
        await handleRemoveMessage(interaction, logger);
      }
    } catch (error) {
      logger?.error({
        err: error,
        interactionId: interaction.id,
        command: interaction.commandName,
        guildId: interaction.guildId,
      }, 'interaction handling failed');
      if ((isAdministratorCommand(interaction) || interaction.commandName === FIX_COMMAND_NAME)
        && interaction.deferred && !interaction.replied) {
        await interaction.editReply({ content: '處理時發生錯誤。' }).catch((responseError) => {
          logger?.warn({ err: responseError, interactionId: interaction.id }, 'could not edit interaction error reply');
        });
      } else if (isAdministratorCommand(interaction) && (interaction.replied || interaction.deferred)) {
        await interaction.followUp({ content: '處理時發生錯誤。' }).catch((responseError) => {
          logger?.warn({ err: responseError, interactionId: interaction.id }, 'could not send interaction error follow-up');
        });
      } else if (isAdministratorCommand(interaction)) {
        await interaction.reply({ content: '處理時發生錯誤。' }).catch((responseError) => {
          logger?.warn({ err: responseError, interactionId: interaction.id }, 'could not send interaction error reply');
        });
      } else if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '處理時發生錯誤。', flags: MessageFlags.Ephemeral }).catch((responseError) => {
          logger?.warn({ err: responseError, interactionId: interaction.id }, 'could not send interaction error follow-up');
        });
      } else {
        await interaction.reply({ content: '處理時發生錯誤。', flags: MessageFlags.Ephemeral }).catch((responseError) => {
          logger?.warn({ err: responseError, interactionId: interaction.id }, 'could not send interaction error reply');
        });
      }
    }
  };
}
