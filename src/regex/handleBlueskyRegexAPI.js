import { messageSender } from '../events/messageSender.js';
import { messageSenderMore } from '../events/messageSenderMore.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { videoLinkSender } from '../events/videoLinkSender.js';
import { backupLinkSender } from '../events/backupLinkSender.js';
import { handleAPIRequest } from './apiHandlerHelper.js';

export async function handleBlueskyRegexAPI(result, message, spoiler) {
  await handleAPIRequest({
    platform: 'bluesky',
    apiPath: `/api/v1/bluesky/${result[1]}/${result[2]}`,
    message,
    spoiler,
    buildEmbed: (embed, data) => {
      // Handle fallback URL case
      if (data.error && data.fallbackUrl) {
        return; // Will be handled in sendMessage
      }

      if (data.author.avatar) {
        embed.setAuthor({ name: `@${data.handle}`, iconURL: data.author.avatar });
      } else {
        embed.setAuthor({ name: `@${data.handle}` });
      }

      embed.setTitle(data.author.displayName);
      embed.setURL(data.url);

      if (data.text) {
        embed.setDescription(data.text);
      }
    },
    sendMessage: async (message, spoiler, iconURL, embed, data) => {
      // Handle fallback URL case
      if (data.error && data.fallbackUrl) {
        backupLinkSender(message, spoiler, data.fallbackUrl);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        embedSuppresser(message);
        return;
      }

      const threadInfo = `💬${data.stats.replies} 🔁${data.stats.reposts} ❤️${data.stats.likes}`;

      if (data.media) {
        if (data.media.type === 'app.bsky.embed.video#view' && data.media.videos.length > 0) {
          if (data.media.thumbnail) {
            embed.setImage(data.media.thumbnail);
          }
          messageSender(message, spoiler, iconURL, embed, threadInfo);
          embedSuppresser(message);
          data.media.videos.forEach((video) => {
            videoLinkSender(message, spoiler, video.directUrl);
          });
        } else if (data.media.images && data.media.images.length === 1) {
          embed.setImage(data.media.images[0].fullsize);
          messageSender(message, spoiler, iconURL, embed, threadInfo);
          embedSuppresser(message);
        } else if (data.media.images && data.media.images.length > 1) {
          embed.setImage(data.media.images[0].fullsize);
          const imageArray = data.media.images.slice(1, 4).map((img) => img.fullsize);
          messageSenderMore(message, spoiler, iconURL, embed, threadInfo, imageArray);
          embedSuppresser(message);
        } else {
          messageSender(message, spoiler, iconURL, embed, threadInfo);
          embedSuppresser(message);
        }
      } else {
        messageSender(message, spoiler, iconURL, embed, threadInfo);
        embedSuppresser(message);
      }
    },
  }).catch(async () => {
    try {
      backupLinkSender(message, spoiler, `https://bskx.app/profile/${result[1]}/post/${result[2]}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      embedSuppresser(message);
    } catch {
      // Error already logged by handleAPIRequest
    }
  });
}
