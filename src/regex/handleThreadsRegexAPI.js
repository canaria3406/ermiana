import { embedSuppresser } from '../events/embedSuppresser.js';
import { backupLinkSender } from '../events/backupLinkSender.js';
import { handleAPIPostRequest } from './apiHandlerHelper.js';

export async function handleThreadsRegexAPI(result, message, spoiler) {
  const url = result[0];

  await handleAPIPostRequest({
    platform: 'threads',
    apiPath: '/api/v1/threads',
    postData: { url },
    message,
    spoiler,
    buildEmbed: () => {
      // Threads doesn't use embed, only proxy URL
    },
    sendMessage: async (message, spoiler, iconURL, embed, data) => {
      if (data.proxyUrl) {
        backupLinkSender(message, spoiler, data.proxyUrl);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        embedSuppresser(message);
      }
    },
  }).catch(async () => {
    try {
      backupLinkSender(message, spoiler, url.replace(/threads\.net/, 'fixthreads.net'));
      await new Promise((resolve) => setTimeout(resolve, 1500));
      embedSuppresser(message);
    } catch {
      // Error already logged by handleAPIPostRequest
    }
  });
}
