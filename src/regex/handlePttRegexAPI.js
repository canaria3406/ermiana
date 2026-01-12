import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { backupLinkSender } from '../events/backupLinkSender.js';
import { handleAPIRequest } from './apiHandlerHelper.js';

export async function handlePttRegexAPI(result, message, spoiler) {
  const board = result[1];
  const postId = result[2];

  await handleAPIRequest({
    platform: 'ptt',
    apiPath: `/api/v1/ptt/${board}/${postId}`,
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
        embed.setDescription(data.description);
      }

      if (data.image) {
        embed.setImage(data.image);
      }
    },
    sendMessage: async (message, spoiler, iconURL, embed, data) => {
      // Handle fallback URL case
      if (data.error && data.fallbackUrl) {
        backupLinkSender(message, spoiler, data.fallbackUrl);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        embedSuppresser(message);
        return;
      }

      messageSender(message, spoiler, iconURL, embed, 'ermiana');
      embedSuppresser(message);
    },
  }).catch(async () => {
    try {
      backupLinkSender(message, spoiler, `https://www.pttweb.cc/bbs/${board}/${postId}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      embedSuppresser(message);
    } catch {
      // Error already logged by handleAPIRequest
    }
  });
}
