import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { messageSender } from '../events/messageSender.js';
// import { messageSubSender } from '../events/messageSubSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { backupLinkSender } from '../events/backupLinkSender.js';
import { typingSender } from '../events/typingSender.js';
import { messageSenderPixiv } from '../events/messageSenderPixiv.js';

export async function handlePixivRegex( result, message, spoiler ) {
  const iconURL = 'https://ermiana.canaria.cc/pic/pixiv.png';
  typingSender(message);
  const pid = result[1];
  try {
    const resp = await axios.request({
      method: 'get',
      url: 'https://www.pixiv.net/ajax/illust/' + pid,
      timeout: 2500,
    });

    const tagString = resp.data.body.tags.tags.map((element) => `[${element.tag}](https://www.pixiv.net/tags/${element.tag}/artworks)`).join(', ') || '';
    // const pageCount = Math.min(resp.data.body.pageCount, 5);
    const pageCount = resp.data.body.pageCount || 1;

    const pixivEmbed = new EmbedBuilder();
    pixivEmbed.setColor(0x0096fa);
    pixivEmbed.setTitle(resp.data.body.title);
    pixivEmbed.setURL(`https://www.pixiv.net/artworks/${pid}`);

    try {
      if (resp.data.body.extraData.meta.twitter.description) {
        pixivEmbed.setDescription(resp.data.body.extraData.meta.twitter.description.substring(0, 300));
      }
    } catch {}

    try {
      pixivEmbed.addFields(
          { name: '作者', value: `[${resp.data.body.userName}](https://www.pixiv.net/users/${resp.data.body.userId})`, inline: true },
          { name: '收藏', value: resp.data.body.bookmarkCount.toString(), inline: true },
      );
    } catch {}

    try {
      if (tagString) {
        pixivEmbed.addFields({ name: '標籤', value: tagString });
      }
    } catch {}

    try {
      if (resp.data.body.urls.regular != null && (/i\.pximg\.net/).test(resp.data.body.urls.regular)) {
        const regularPicUrl = resp.data.body.urls.regular.replace('i.pximg.net', 'pixiv.canaria.cc');
        pixivEmbed.setImage(regularPicUrl);
        if (pageCount == 1) {
          messageSender(message, spoiler, iconURL, pixivEmbed, 'ermiana');
        } else if (pageCount > 1) {
          messageSenderPixiv(message, spoiler, iconURL, pixivEmbed, 'ermiana', pageCount);
          /*
          for (const i of Array(pageCount-1).keys()) {
            const picEmbed = new EmbedBuilder();
            picEmbed.setColor(0x0096fa);
            picEmbed.setImage(regularPicUrl.replace('_p0', `_p${i+1}` ));
            messageSubSender(message, spoiler, iconURL, picEmbed, 'ermiana');
          }
          */
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        embedSuppresser(message);
      } else if (resp.data.body.userIllusts[pid]?.url && (/p0/).test(resp.data.body.userIllusts[pid]?.url)) {
        const userIllustsRegex = /\/img\/.*p0/;
        const userIllustsUrl = 'https://pixiv.canaria.cc/img-master' + resp.data.body.userIllusts[pid].url.match(userIllustsRegex)[0] + '_master1200.jpg';
        pixivEmbed.setImage(userIllustsUrl);
        if (pageCount == 1) {
          messageSender(message, spoiler, iconURL, pixivEmbed, 'ermiana');
        } else if (pageCount > 1) {
          messageSenderPixiv(message, spoiler, iconURL, pixivEmbed, 'ermiana', pageCount);
          /*
          for (const i of Array(pageCount-1).keys()) {
            const picEmbed = new EmbedBuilder();
            picEmbed.setColor(0x0096fa);
            picEmbed.setImage(userIllustsUrl.replace('_p0', `_p${i+1}` ));
            messageSubSender(message, spoiler, iconURL, picEmbed, 'ermiana');
          }
          */
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        embedSuppresser(message);
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
            pixivEmbed.setImage(resp2.data.original_url.replace('i.pximg.net', 'pixiv.canaria.cc'));
            messageSender(message, spoiler, iconURL, pixivEmbed, 'ermiana');
            await new Promise((resolve) => setTimeout(resolve, 1000));
            embedSuppresser(message);
          }
          if (resp2.data?.original_urls) {
            pixivEmbed.setImage(resp2.data.original_urls[0].replace('i.pximg.net', 'pixiv.canaria.cc'));
            messageSenderPixiv(message, spoiler, iconURL, pixivEmbed, 'ermiana', resp2.data.original_urls.length);
            /*
            const pageCount2 = Math.min(resp2.data.original_urls.length, 5);
            pixivEmbed.setImage(resp2.data.original_urls[0].replace('i.pximg.net', 'pixiv.canaria.cc'));
            messageSender(message, spoiler, iconURL, pixivEmbed, 'ermiana');
            for (const i of Array(pageCount2-1).keys()) {
              const picEmbed = new EmbedBuilder();
              picEmbed.setColor(0x0096fa);
              picEmbed.setImage(resp2.data.original_urls[i+1].replace('i.pximg.net', 'pixiv.canaria.cc'));
              messageSubSender(message, spoiler, iconURL, picEmbed, 'ermiana');
            }
            */
            await new Promise((resolve) => setTimeout(resolve, 1000));
            embedSuppresser(message);
          }
        } catch {}
      }
    } catch {}
  } catch {
    try {
      backupLinkSender(message, spoiler, `https://www.phixiv.net/artworks/${pid}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      embedSuppresser(message);
    } catch {
      console.log('pixiv error: '+ message.guild.name);
    }
  }
};
