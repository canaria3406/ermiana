import { messageSender } from '../events/messageSender.js';
import { messageSenderMore } from '../events/messageSenderMore.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { handleAPIRequest } from './apiHandlerHelper.js';

export async function handlePlurkRegexAPI(result, message, spoiler) {
  await handleAPIRequest({
    platform: 'plurk',
    apiPath: `/api/v1/plurk/${result[1]}`,
    message,
    spoiler,
    buildEmbed: (embed, data) => {
      embed.setTitle(data.author.displayName);
      embed.setURL(data.url);

      if (data.author.nickname && data.author.avatar) {
        embed.setAuthor({ name: '@' + data.author.nickname, iconURL: data.author.avatar });
      }

      if (data.content) {
        embed.setDescription(data.content);
      }

      if (data.images && data.images.length > 0) {
        embed.setImage(data.images[0]);
      }
    },
    sendMessage: async (message, spoiler, iconURL, embed, data) => {
      const plurkInfo = `💬${data.stats.responses} 🔁${data.stats.replurks} ❤️${data.stats.favorites}`;

      if (!data.images || data.images.length === 0 || data.images.length === 1) {
        messageSender(message, spoiler, iconURL, embed, plurkInfo);
        await new Promise((resolve) => setTimeout(resolve, 800));
        embedSuppresser(message);
      } else if (data.images.length > 1) {
        const imageArray = data.images.slice(1, 4);
        messageSenderMore(message, spoiler, iconURL, embed, plurkInfo, imageArray);
        await new Promise((resolve) => setTimeout(resolve, 800));
        embedSuppresser(message);
      }
    },
  });
}
