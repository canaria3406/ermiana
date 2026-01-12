import { embedSuppresser } from '../events/embedSuppresser.js';
import { backupLinkSender } from '../events/backupLinkSender.js';
import { handleAPIRequest } from './apiHandlerHelper.js';

export async function handleInstagramRegexAPI(result, message, spoiler) {
  const postId = result[1];

  await handleAPIRequest({
    platform: 'instagram',
    apiPath: `/api/v1/instagram/${postId}`,
    message,
    spoiler,
    buildEmbed: () => {
      // Instagram doesn't use embed, only proxy URL
    },
    sendMessage: async (message, spoiler, iconURL, embed, data) => {
      if (data.error && data.fallbackUrl) {
        backupLinkSender(message, spoiler, data.fallbackUrl);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        embedSuppresser(message);
        return;
      }

      if (data.proxyUrl) {
        backupLinkSender(message, spoiler, data.proxyUrl);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        embedSuppresser(message);
      }
    },
  }).catch(async () => {
    try {
      backupLinkSender(message, spoiler, `https://www.ddinstagram.com/p/${postId}/`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      embedSuppresser(message);
    } catch {
      // Error already logged by handleAPIRequest
    }
  });
}
