import { messageSender } from '../events/messageSender.js';
import { handleAPIRequest } from './apiHandlerHelper.js';

export async function handleBilibiliRegexAPI(result, message, spoiler) {
  await handleAPIRequest({
    platform: 'bilibili',
    apiPath: `/api/v1/bilibili/${result[1]}`,
    message,
    spoiler,
    buildEmbed: (embed, data) => {
      if (data.author.face) {
        embed.setAuthor({ name: data.author.name, iconURL: data.author.face });
      } else {
        embed.setAuthor({ name: data.author.name });
      }

      embed.setTitle(data.title || '嗶哩嗶哩');
      embed.setURL(data.url);

      if (data.description) {
        embed.setDescription(data.description);
      }

      if (data.images && data.images.length > 0) {
        embed.setImage(data.images[0]);
      }
    },
    sendMessage: (message, spoiler, iconURL, embed, data) => {
      const bilibiliInfo = `👍${data.stats.likes} 🔁${data.stats.forwards} 💬${data.stats.comments}`;
      messageSender(message, spoiler, iconURL, embed, bilibiliInfo);
    },
  });
}
