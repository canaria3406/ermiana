import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { backupLinkSender } from '../events/backupLinkSender.js';
import { messageSenderPixiv } from '../events/messageSenderPixiv.js';
import { handleAPIRequest } from './apiHandlerHelper.js';

export async function handlePixivRegexAPI(result, message, spoiler) {
  const pid = result[1];

  await handleAPIRequest({
    platform: 'pixiv',
    apiPath: `/api/v1/pixiv/${pid}`,
    message,
    spoiler,
    buildEmbed: (embed, data) => {
      // Handle fallback URL case
      if (data.error && data.fallbackUrl) {
        return; // Will be handled in sendMessage
      }

      embed.setTitle(data.title);
      embed.setURL(data.url);

      if (data.description) {
        embed.setDescription(data.description.substring(0, 300));
      }

      if (data.author) {
        embed.addFields(
          { name: '作者', value: `[${data.author.name}](${data.author.profileUrl})`, inline: true },
        );
      }

      if (data.stats && data.stats.bookmarks !== undefined) {
        embed.addFields(
          { name: '收藏', value: data.stats.bookmarks.toString(), inline: true },
        );
      }

      if (data.tags && data.tags.length > 0) {
        const tagString = data.tags
          .map((tag) => `[${tag.name}](https://www.pixiv.net/tags/${tag.name}/artworks)`)
          .join(', ');
        if (tagString) {
          embed.addFields({ name: '標籤', value: tagString.substring(0, 1024) });
        }
      }

      if (data.images && data.images.length > 0) {
        embed.setImage(data.images[0]);
      }
    },
    sendMessage: async (message, spoiler, iconURL, embed, data) => {
      // Handle fallback URL case
      if (data.error && data.fallbackUrl) {
        backupLinkSender(message, spoiler, data.fallbackUrl);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        embedSuppresser(message);
        return;
      }

      if (data.images && data.images.length > 0) {
        if (data.pageCount === 1) {
          messageSender(message, spoiler, iconURL, embed, 'ermiana');
        } else if (data.pageCount > 1) {
          messageSenderPixiv(message, spoiler, iconURL, embed, 'ermiana', data.pageCount);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        embedSuppresser(message);
      } else {
        messageSender(message, spoiler, iconURL, embed, 'ermiana');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        embedSuppresser(message);
      }
    },
  }).catch(async () => {
    try {
      backupLinkSender(message, spoiler, `https://www.phixiv.net/artworks/${pid}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      embedSuppresser(message);
    } catch {
      // Error already logged by handleAPIRequest
    }
  });
}
