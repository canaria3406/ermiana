import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { handleAPIPostRequest } from './apiHandlerHelper.js';

export async function handleTiktokRegexAPI(result, message, spoiler) {
  const url = result[0];

  await handleAPIPostRequest({
    platform: 'tiktok',
    apiPath: '/api/v1/tiktok',
    postData: { url },
    message,
    spoiler,
    buildEmbed: (embed, data) => {
      embed.setTitle('TikTok');
      embed.setURL(data.proxyUrl);
      embed.setAuthor({ name: 'TikTok Video' });
    },
    sendMessage: (message, spoiler, iconURL, embed) => {
      messageSender(message, spoiler, iconURL, embed, 'ermiana');
      embedSuppresser(message);
    },
  });
}
