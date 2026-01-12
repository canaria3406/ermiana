import { messageSender } from '../events/messageSender.js';
import { messageSenderMore } from '../events/messageSenderMore.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { handleAPIRequest } from './apiHandlerHelper.js';

export async function handleWeiboRegexAPI(result, message, spoiler) {
  const statusId = result[1];

  await handleAPIRequest({
    platform: 'weibo',
    apiPath: `/api/v1/weibo/${statusId}`,
    message,
    spoiler,
    buildEmbed: (embed, data) => {
      // Handle error case
      if (data.error) {
        return; // Will be handled in sendMessage
      }

      embed.setTitle(data.author.name);
      embed.setURL(data.url);

      if (data.text) {
        embed.setDescription(data.text.substring(0, 300));
      }

      if (data.images && data.images.length > 0) {
        embed.setImage(data.images[0]);
      }
    },
    sendMessage: (message, spoiler, iconURL, embed, data) => {
      // Handle error case
      if (data.error) {
        console.log('weibo error: ' + message.guild.name);
        return;
      }

      const weiboInfo = `💬${data.stats.comments} 🔁${data.stats.reposts} ❤️${data.stats.likes}`;

      if (!data.images || data.images.length === 0 || data.images.length === 1) {
        messageSender(message, spoiler, iconURL, embed, weiboInfo);
        embedSuppresser(message);
      } else if (data.images.length > 1) {
        const imageArray = data.images.slice(1, 4);
        messageSenderMore(message, spoiler, iconURL, embed, weiboInfo, imageArray);
        embedSuppresser(message);
      }
    },
  });
}
