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
      timeout: 2500,
    });

    const tagString = resp.data.body.tags.tags.map((element) => `[${element.tag}](https://www.pixiv.net/tags/${element.tag}/artworks)`).join(', ');
    const pageCount = Math.min(resp.data.body.pageCount, 5);

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

    messageSender(message.channel, pixivEmbed, 'ermiana');

    try {
      if (resp.data.body.urls.regular != null && (/i\.pximg\.net/).test(resp.data.body.urls.regular)) {
        const regularPicUrl = resp.data.body.urls.regular.replace('i.pximg.net', 'pixiv.canaria.cc');
        for (const i of Array(pageCount).keys()) {
          message.channel.send(regularPicUrl.replace('_p0', `_p${i}` ));
        }
      } else if (resp.data.body.userIllusts[pid]?.url && (/p0/).test(resp.data.body.userIllusts[pid]?.url)) {
        const userIllustsRegex = /\/img\/.*p0/;
        const userIllustsUrl = 'https://pixiv.canaria.cc/img-master' + resp.data.body.userIllusts[pid].url.match(userIllustsRegex)[0] + '_master1200.jpg';
        for (const i of Array(pageCount).keys()) {
          message.channel.send(userIllustsUrl.replace('_p0', `_p${i}` ));
        }
      } else {
        try {
          const resp2 = await axios.request({
            method: 'post',
            url: 'https://api.pixiv.cat/v1/generate',
            data: {
              p: result[0],
            },
            timeout: 2500,
          });
          if (resp2.data?.original_url) {
            message.channel.send(resp2.data.original_url.replace('i.pximg.net', 'pixiv.canaria.cc'));
          }
          if (resp2.data?.original_urls) {
            const pageCount2 = Math.min(resp2.data.original_urls.length, 5);
            for (const i of Array(pageCount2).keys()) {
              message.channel.send(resp2.data.original_urls[i].replace('i.pximg.net', 'pixiv.canaria.cc'));
            }
          }
        } catch {}
      }
      embedSuppresser(message);
    } catch {}
  } catch {
    console.log('pixiv error: '+ message.guild.name);
  }
};
