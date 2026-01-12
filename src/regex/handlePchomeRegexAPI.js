import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { handleAPIRequest } from './apiHandlerHelper.js';

export async function handlePchomeRegexAPI(result, message, spoiler) {
  const pid = result[1];

  await handleAPIRequest({
    platform: 'pchome',
    apiPath: `/api/v1/pchome/${pid}`,
    message,
    spoiler,
    buildEmbed: (embed, data) => {
      embed.setTitle(data.name);
      embed.setURL(data.url);

      if (data.price) {
        embed.addFields({ name: '價格', value: data.price, inline: false });
      }

      if (data.brand) {
        embed.addFields({ name: '品牌', value: data.brand, inline: true });
      }

      if (data.store) {
        embed.addFields({ name: '店家', value: data.store, inline: true });
      }

      if (data.slogan) {
        embed.setDescription(data.slogan);
      }

      if (data.image) {
        embed.setImage(data.image);
      }
    },
    sendMessage: (message, spoiler, iconURL, embed) => {
      messageSender(message, spoiler, iconURL, embed, 'ermiana');
      embedSuppresser(message);
    },
  });
}
