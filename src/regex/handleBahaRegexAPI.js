import { messageSender } from '../events/messageSender.js';
import { handleAPIRequest } from './apiHandlerHelper.js';

export async function handleBahaRegexAPI(result, message, spoiler) {
  await handleAPIRequest({
    platform: 'baha',
    apiPath: `/api/v1/baha/${result[1]}`,
    message,
    spoiler,
    buildEmbed: (embed, data) => {
      embed.setTitle(data.title);
      embed.setURL(data.url);

      if (data.author) {
        if (data.author.avatar) {
          embed.setAuthor({ name: data.author.name, iconURL: data.author.avatar });
        } else {
          embed.setAuthor({ name: data.author.name });
        }
      }

      if (data.content) {
        embed.setDescription(data.content.substring(0, 300));
      }

      if (data.images && data.images.length > 0) {
        embed.setImage(data.images[0]);
      }
    },
    sendMessage: (message, spoiler, iconURL, embed, data) => {
      const bahaInfo = data.stats?.gp ? `👍${data.stats.gp}` : '';
      messageSender(message, spoiler, iconURL, embed, bahaInfo);
    },
  });
}
