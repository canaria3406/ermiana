import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { videoLinkSender } from '../events/videoLinkSender.js';
import { backupLinkSender } from '../events/backupLinkSender.js';
import { handleAPIRequest } from './apiHandlerHelper.js';

export async function handleTwitterRegexAPI(result, message, spoiler) {
  const tid = result[1];

  await handleAPIRequest({
    platform: 'twitter',
    apiPath: `/api/v1/twitter/${tid}`,
    message,
    spoiler,
    buildEmbed: (embed, data) => {
      // Handle fallback URL case
      if (data.error && data.fallbackUrl) {
        return; // Will be handled in sendMessage
      }

      if (data.author.screenName && data.author.avatarUrl) {
        embed.setAuthor({ name: '@' + data.author.screenName, iconURL: data.author.avatarUrl });
      } else if (data.author.screenName) {
        embed.setAuthor({ name: '@' + data.author.screenName });
      }

      embed.setTitle(data.author.name || 'Twitter.com');
      embed.setURL(data.url);

      if (data.text) {
        let displayText = data.text;
        if (data.quote) {
          displayText += `\n> RT: [@${data.quote.author}](${data.quote.url})\n`;
          if (data.quote.text) {
            displayText += data.quote.text.replace(/^/gm, '> ');
          }
        }
        embed.setDescription(displayText.substring(0, 4080));
      }

      if (data.createdAt) {
        embed.setTimestamp(new Date(data.createdAt));
      }
    },
    sendMessage: (message, spoiler, iconURL, embed, data) => {
      // Handle fallback URL case
      if (data.error && data.fallbackUrl) {
        backupLinkSender(message, spoiler, data.fallbackUrl);
        embedSuppresser(message);
        return;
      }

      const tweetInfo = `💬${data.stats.replies} 🔁${data.stats.retweets} ❤️${data.stats.likes}`;

      // Handle media
      if (data.media) {
        const videos = data.media.videos || [];

        if (data.media.mosaic) {
          embed.setImage(data.media.mosaic.url);
          messageSender(message, spoiler, iconURL, embed, tweetInfo);
          embedSuppresser(message);
          videos.forEach((url) => {
            videoLinkSender(message, spoiler, url);
          });
        } else if (data.media.photos && data.media.photos.length > 0) {
          embed.setImage(data.media.photos[0].url);
          messageSender(message, spoiler, iconURL, embed, tweetInfo);
          embedSuppresser(message);
          videos.forEach((url) => {
            videoLinkSender(message, spoiler, url);
          });
        } else if (videos.length > 0) {
          if (data.quoteMediaUrl) {
            embed.setImage(data.quoteMediaUrl);
          }
          messageSender(message, spoiler, iconURL, embed, tweetInfo);
          embedSuppresser(message);
          if (data.videoDirectUrl) {
            videoLinkSender(message, spoiler, data.videoDirectUrl);
          }
          videos.filter((_url, index) => index > 0).forEach((url) => {
            videoLinkSender(message, spoiler, url);
          });
        } else {
          if (data.quoteMediaUrl) {
            embed.setImage(data.quoteMediaUrl);
          }
          messageSender(message, spoiler, iconURL, embed, tweetInfo);
          embedSuppresser(message);
        }
      } else {
        if (data.quoteMediaUrl) {
          embed.setImage(data.quoteMediaUrl);
        }
        messageSender(message, spoiler, iconURL, embed, tweetInfo);
        embedSuppresser(message);
      }
    },
  }).catch(() => {
    try {
      backupLinkSender(message, spoiler, `https://fxtwitter.com/i/status/${tid}`);
      embedSuppresser(message);
    } catch {
      // Error already logged by handleAPIRequest
    }
  });
}
