import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { messageSender } from '../common/messageSender.js';
import { embedSuppresser } from '../common/embedSuppresser.js';

export async function handlePixivRegex( result, message ) {
  try {
    await message.channel.sendTyping();
  } catch {}
  const pid = result[1];
  try {
    const resp = await axios.request({
      method: 'get',
      url: 'https://www.pixiv.net/ajax/illust/' + pid,
    });

    const tagString = resp.data.body.tags.tags.map((element) => `[${element.tag}](https://www.pixiv.net/tags/${element.tag}/artworks)`).join(', ');

    const pixivEmbed = new EmbedBuilder();
    pixivEmbed.setColor(2210780);
    pixivEmbed.setTitle(resp.data.body.title);
    pixivEmbed.setURL(result[0]);
    pixivEmbed.setDescription(resp.data.body.extraData.meta.twitter.description.substring(0, 300));
    pixivEmbed.addFields(
        { name: '作者', value: `[${resp.data.body.userName}](https://www.pixiv.net/users/${resp.data.body.userId})`, inline: true },
        { name: '收藏', value: resp.data.body.bookmarkCount.toString(), inline: true },
    );
    try {
      pixivEmbed.addFields({ name: '標籤', value: tagString });
    } catch {}

    messageSender(message.channel, pixivEmbed, 'canaria3406');

    try {
      if (resp.data.body.urls.original != null) {
        const originalPicUrl = resp.data.body.urls.original.replace('i.pximg.net', 'pixiv.canaria.cc');
        for (let i = 0; i < Math.min(resp.data.body.pageCount, 4); i++) {
          message.channel.send(originalPicUrl.replace('_p0', '_p' + i ));
        }
      } else {
        try {
          const resp2 = await axios.request({
            method: 'post',
            url: 'https://api.pixiv.cat/v1/generate',
            data: {
              p: result[0],
            },
          });
          if (resp2.data?.original_url) {
            message.channel.send(resp2.data.original_url.replace('i.pximg.net', 'pixiv.canaria.cc'));
          }
          if (resp2.data?.original_urls) {
            for (let i = 0; i < Math.min(resp2.data.original_urls.length, 4); i++) {
              message.channel.send(resp2.data.original_urls[i].replace('i.pximg.net', 'pixiv.canaria.cc'));
            }
          }
        } catch {}
      }
      embedSuppresser(message);
    } catch {}
  } catch {
    console.log('pixiv error');
  }
};
