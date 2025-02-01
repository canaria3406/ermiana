import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { messageSender } from '../events/messageSender.js';
// import { messageSubSender } from '../events/messageSubSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
// import { videoLinkSender } from '../events/videoLinkSender.js';
import { typingSender } from '../events/typingSender.js';
import { messageSenderMore } from '../events/messageSenderMore.js';

export async function handleMisskeyRegex( result, message, spoiler ) {
  const iconURL = 'https://ermiana.canaria.cc/pic/misskey.png';
  typingSender(message);
  try {
    const resp = await axios.request({
      method: 'post',
      url: 'https://misskey.io/api/notes/show',
      data: {
        noteId: result[1],
      },
      timeout: 2000,
    });

    if (resp.status === 200) {
      const misskeyEmbed = new EmbedBuilder();
      misskeyEmbed.setColor(0x96d04a);
      try {
        misskeyEmbed.setAuthor({ name: '@' + resp.data.user.username, iconURL: resp.data.user.avatarUrl });
      } catch {}
      try {
        misskeyEmbed.setTitle(resp.data.user.name);
      } catch {}

      misskeyEmbed.setURL(result[0]);

      try {
        misskeyEmbed.setDescription(resp.data.text);
      } catch {}

      try {
        if (resp.data.files[0]?.type == 'image/webp' || 'image/png' || 'image/jpg') {
          misskeyEmbed.setImage(resp.data.files[0].url);
        }
      } catch {}

      function sumReactions(reactions) {
        return Object.values(reactions).reduce((total, count) => total + count, 0);
      }

      const noteinfo = '💬' + resp.data.repliesCount.toString() + ' 🔁' + resp.data.renoteCount.toString() + ' ❤️' + sumReactions(resp.data.reactions).toString();
      try {
        if (!resp.data?.files || resp.data.files.length == 0) {
          messageSender(message, spoiler, iconURL, misskeyEmbed, noteinfo);
          await new Promise((resolve) => setTimeout(resolve, 500));
          embedSuppresser(message);
        } else if (resp.data.files?.length == 1) {
          messageSender(message, spoiler, iconURL, misskeyEmbed, noteinfo);
          await new Promise((resolve) => setTimeout(resolve, 500));
          embedSuppresser(message);
        } else if (resp.data.files?.length > 1) {
          const imageArray =[];
          resp.data.files
              .filter((_file, index) => index > 0 && index < 4)
              .forEach((file) => {
                if (file.type == 'image/webp' || 'image/png' || 'image/jpg') {
                  imageArray.push(file.url);
                }
              });
          messageSenderMore(message, spoiler, iconURL, misskeyEmbed, noteinfo, imageArray);
          await new Promise((resolve) => setTimeout(resolve, 500));
          embedSuppresser(message);
        }
      } catch {}
      /*
      messageSender(message, spoiler, iconURL, misskeyEmbed, noteinfo);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      embedSuppresser(message);

      try {
        if (resp.data.files?.length > 1) {
          resp.data.files
              .filter((_file, index) => index > 0 && index < 4)
              .forEach((file) => {
                if (file.type == 'image/webp' || 'image/png' || 'image/jpg') {
                  const noteEmbed = new EmbedBuilder();
                  noteEmbed.setColor(0x96d04a);
                  noteEmbed.setImage(file.url);
                  messageSubSender(message, spoiler, iconURL, noteEmbed, 'ermiana');
                }
              });
        }
      } catch {}
      */

      /*
     暫時先不處理影片
      try {
        resp.data.files?.forEach((file) => {
          if (file.type == 'video/mp4') {
            if (file.url.match(/https:\/\/media\.misskeyusercontent\.(?:com|jp)\/io\/.*\.mp4/)) {
              videoLinkSender(message, spoiler, file.url);
            } else if (file.url.match(/https:\/\/proxy\.misskeyusercontent\.(?:com|jp)\/image\.webp\?url=.*\.mp4/)) {
              const othersiteUrl = decodeURIComponent(file.url.match(/url=(.+)/)[1]);
              videoLinkSender(message, spoiler, othersiteUrl);
            }
          }
        });
      } catch {}
      */
    } else {
      console.error('Request failed');
    }
  } catch {
    console.log('misskey error: '+ message.guild.name);
  }
};
