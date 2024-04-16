import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { messageSender } from '../events/messageSender.js';
import { messageSubSender } from '../events/messageSubSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { videoLinkSender } from '../events/videoLinkSender.js';
import { typingSender } from '../events/typingSender.js';

export async function handleMisskeyRegex(result, message) {
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
      misskeyEmbed.setAuthor({ name: '@' + resp.data.user.username, iconURL: resp.data.user.avatarUrl });
      misskeyEmbed.setTitle(resp.data.user.name);
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

      messageSender(message, misskeyEmbed, noteinfo);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      embedSuppresser(message);

      try {
        if (resp.data.files?.length > 1) {
          resp.data.files
              .filter((_file, index) => index > 0)
              .forEach((file) => {
                if (file.type == 'image/webp' || 'image/png' || 'image/jpg') {
                  const noteEmbed = new EmbedBuilder();
                  noteEmbed.setColor(0x96d04a);
                  noteEmbed.setImage(file.url);
                  messageSubSender(message, noteEmbed, 'ermiana');
                }
              });
        }
      } catch {}

      try {
        resp.data.files?.forEach((file) => {
          if (file.type == 'video/mp4') {
            if (file.url.match(/https:\/\/media\.misskeyusercontent\.(?:com|jp)\/io\/.*\.mp4/)) {
              videoLinkSender(message, file.url);
            } else if (file.url.match(/https:\/\/proxy\.misskeyusercontent\.(?:com|jp)\/image\.webp\?url=.*\.mp4/)) {
              const othersiteUrl = decodeURIComponent(file.url.match(/url=(.+)/)[1]);
              videoLinkSender(message, othersiteUrl);
            }
          }
        });
      } catch {}
    } else {
      console.error('Request failed');
    }
  } catch {
    console.log('misskey error: '+ message.guild.name);
  }
};
