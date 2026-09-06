import { PermissionsBitField } from 'discord.js';

const DISCORD_PERMISSION_ERROR_CODES = new Set([50001, 50013]);

function isSpoiler(content, index) {
  for (const match of content.matchAll(/\|\|[\s\S]*?\|\|/g)) {
    if (index >= match.index && index < match.index + match[0].length) return true;
  }
  return false;
}

export function createMessageHandler({ previewService, renderer, guildSettings, logger }) {
  return async function handleMessage(message) {
    if (message.author.bot || !message.inGuild()) return;
    const candidate = previewService.match(message.content);
    if (!candidate) return;

    const permissions = message.channel.permissionsFor(message.client.user);
    const sendPermission = message.channel.isThread?.()
      ? PermissionsBitField.Flags.SendMessagesInThreads
      : PermissionsBitField.Flags.SendMessages;
    if (!permissions?.has([
      PermissionsBitField.Flags.ViewChannel,
      sendPermission,
      PermissionsBitField.Flags.EmbedLinks,
      PermissionsBitField.Flags.ReadMessageHistory,
    ])) return;

    try {
      if (guildSettings && await guildSettings.isPreviewDisabled(message.guildId, candidate.provider.id)) {
        logger?.debug?.({
          provider: candidate.provider.id,
          guildId: message.guildId,
          channelId: message.channelId,
          messageId: message.id,
        }, 'preview skipped by Guild setting');
        return;
      }
      const preview = await previewService.resolve(candidate);
      if (!preview) return;
      await renderer.send(message, preview, {
        spoiler: isSpoiler(message.content, candidate.index),
      });
    } catch (error) {
      const details = {
        err: error,
        provider: candidate.provider.id,
        guildId: message.guildId,
        channelId: message.channelId,
        messageId: message.id,
      };
      if (DISCORD_PERMISSION_ERROR_CODES.has(error?.code ?? error?.rawError?.code)) {
        logger?.warn(details, 'preview skipped because Discord denied channel access');
      } else {
        logger?.error(details, 'preview handling failed');
      }
    }
  };
}
