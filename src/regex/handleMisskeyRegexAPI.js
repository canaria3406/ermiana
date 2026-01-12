import { messageSender } from '../events/messageSender.js';
import { messageSenderMore } from '../events/messageSenderMore.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { handleAPIRequest } from './apiHandlerHelper.js';

export async function handleMisskeyRegexAPI(result, message, spoiler) {
  await handleAPIRequest({
    platform: 'misskey',
    apiPath: `/api/v1/misskey/${result[1]}/${result[2]}`,
    message,
    spoiler,
    buildEmbed: (embed, data) => {
      embed.setTitle(data.author.name);
      embed.setURL(data.url);

      if (data.author.avatar) {
        embed.setAuthor({ name: `@${data.author.username}`, iconURL: data.author.avatar });
      } else {
        embed.setAuthor({ name: `@${data.author.username}` });
      }

      if (data.text) {
        embed.setDescription(data.text);
      }

      if (data.files && data.files.length > 0) {
        embed.setImage(data.files[0].url);
      }
    },
    sendMessage: (message, spoiler, iconURL, embed, data) => {
      const misskeyInfo = `🔁${data.stats.renotes} 💬${data.stats.replies}`;

      if (data.files && data.files.length > 1) {
        const imageArray = data.files.slice(1, 4).map((file) => file.url);
        messageSenderMore(message, spoiler, iconURL, embed, misskeyInfo, imageArray);
        embedSuppresser(message);
      } else {
        messageSender(message, spoiler, iconURL, embed, misskeyInfo);
        embedSuppresser(message);
      }
    },
  });
}
