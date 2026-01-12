import { messageSender } from '../events/messageSender.js';
import { handleAPIRequest } from './apiHandlerHelper.js';

export async function handleEhRegexAPI(result, message, spoiler) {
  await handleAPIRequest({
    platform: 'eh',
    apiPath: `/api/v1/eh/${result[1]}/${result[2]}`,
    message,
    spoiler,
    buildEmbed: (embed, data) => {
      embed.setTitle(data.title.original);
      embed.setURL(data.url);

      if (data.cover) {
        embed.setImage(data.cover);
      }

      if (data.tags && data.tags.length > 0) {
        const tagDisplay = data.tags
            .filter((tag) => tag.namespace !== 'language')
            .slice(0, 10)
            .map((tag) => (tag.translation ? `${tag.translation}(${tag.name})` : tag.name))
            .join(', ');
        if (tagDisplay) {
          embed.addFields({ name: '標籤', value: tagDisplay });
        }
      }
    },
    sendMessage: (message, spoiler, iconURL, embed, data) => {
      const ehInfo = `📖${data.stats.filecount} ⭐${data.stats.rating}`;
      messageSender(message, spoiler, iconURL, embed, ehInfo);
    },
  });
}
