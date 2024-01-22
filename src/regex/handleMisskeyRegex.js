import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { messageSender } from '../common/messageSender.js';
import { embedSuppresser } from '../common/embedSuppresser.js';

export async function handleMisskeyRegex(result, message) {
  try {
    await message.channel.sendTyping();
  } catch {}
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

      messageSender(message.channel, misskeyEmbed, noteinfo);
      embedSuppresser(message);

      try {
        if (resp.data.files[0]?.type == 'video/mp4') {
          if (resp.data.files[0].url.match(/https:\/\/media\.misskeyusercontent\.com\/io\/.*\.mp4/)) {
            message.channel.send(resp.data.files[0].url);
          } else if (resp.data.files[0].url.match(/https:\/\/proxy\.misskeyusercontent\.com\/image\.webp\?url=.*\.mp4/)) {
            const othersiteUrl = decodeURIComponent(resp.data.files[0].url.match(/url=(.+)/)[1]);
            message.channel.send(othersiteUrl);
          }
        }
      } catch {}
    } else {
      console.error('Request failed');
    }
  } catch {
    console.log('misskey error: '+ message.guild.name);
  }
};
