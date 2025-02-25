import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { typingSender } from '../events/typingSender.js';
import { messageSenderMore } from '../events/messageSenderMore.js';

export async function handleBilibiliRegex( result, message, spoiler ) {
  const iconURL = 'https://ermiana.canaria.cc/pic/bilibili.png';
  typingSender(message);
  try {
    const biliHTML = await axios.request({
      url: 'https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=' + result[1],
      method: 'get',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
      },
      timeout: 2500,
    });

    if (biliHTML.status === 200) {
      const typeBilibili = biliHTML.data.data.item.type;
      if (typeBilibili === 'DYNAMIC_TYPE_DRAW') {
        const picBilibili = biliHTML.data.data.item.modules.module_dynamic.major?.draw ? biliHTML.data.data.item.modules.module_dynamic.major.draw?.items : [];
        const bilibiliEmbed = new EmbedBuilder();
        bilibiliEmbed.setColor(0x00aeec);
        try {
          bilibiliEmbed.setAuthor({
            name: biliHTML.data.data.item.modules.module_author.mid.toString(),
            iconURL: biliHTML.data.data.item.modules.module_author.face,
          });
        } catch {}
        try {
          bilibiliEmbed.setTitle(biliHTML.data.data.item.modules.module_author.name.toString());
        } catch {}
        bilibiliEmbed.setURL(result[0]);

        try {
          if (biliHTML.data.data.item.modules.module_dynamic?.desc) {
            bilibiliEmbed.setDescription(biliHTML.data.data.item.modules.module_dynamic.desc.text.toString());
          }
        } catch {}

        try {
          if (picBilibili) {
            bilibiliEmbed.setImage(picBilibili[0].src);
          }
        } catch {}

        try {
          if (!picBilibili || picBilibili.length == 0) {
            messageSender(message, spoiler, iconURL, bilibiliEmbed, 'ermiana');
            await new Promise((resolve) => setTimeout(resolve, 500));
            embedSuppresser(message);
          } else if (picBilibili.length == 1) {
            messageSender(message, spoiler, iconURL, bilibiliEmbed, 'ermiana');
            await new Promise((resolve) => setTimeout(resolve, 500));
            embedSuppresser(message);
          } else if (picBilibili.length > 1) {
            const imageArray =[];
            picBilibili.filter((_pic, index) => index > 0 && index < 4)
                .forEach((pic) =>
                  imageArray.push(pic.src),
                );
            messageSenderMore(message, spoiler, iconURL, bilibiliEmbed, 'ermiana', imageArray);
            await new Promise((resolve) => setTimeout(resolve, 500));
            embedSuppresser(message);
          }
        } catch {}
      } else if (typeBilibili === 'DYNAMIC_TYPE_ARTICLE') {
        const picBilibili = biliHTML.data.data.item.modules.module_dynamic.major.article?.covers ? biliHTML.data.data.item.modules.module_dynamic.major.article?.covers[0] : '';
        const bilibiliEmbedA = new EmbedBuilder();
        bilibiliEmbedA.setColor(0x00aeec);
        try {
          bilibiliEmbedA.setAuthor({
            name: biliHTML.data.data.item.modules.module_author.mid.toString(),
            iconURL: biliHTML.data.data.item.modules.module_author.face,
          });
        } catch {}
        try {
          bilibiliEmbedA.setTitle(biliHTML.data.data.item.modules.module_author.name.toString());
        } catch {}
        bilibiliEmbedA.setURL(result[0]);
        try {
          if (biliHTML.data.data.item.modules.module_dynamic.major?.article) {
            if (biliHTML.data.data.item.modules.module_dynamic.major.article.title) {
              bilibiliEmbedA.setDescription(biliHTML.data.data.item.modules.module_dynamic.major.article.title.toString());
            }
          }
        } catch {}
        try {
          if (picBilibili) {
            bilibiliEmbedA.setImage(picBilibili);
          }
        } catch {}
        messageSender(message, spoiler, iconURL, bilibiliEmbedA, 'ermiana');
        await new Promise((resolve) => setTimeout(resolve, 500));
        embedSuppresser(message);
      } else if (typeBilibili === 'DYNAMIC_TYPE_WORD') {
        const bilibiliEmbedW = new EmbedBuilder();
        bilibiliEmbedW.setColor(0x00aeec);
        try {
          bilibiliEmbedW.setAuthor({
            name: biliHTML.data.data.item.modules.module_author.mid.toString(),
            iconURL: biliHTML.data.data.item.modules.module_author.face,
          });
        } catch {}
        try {
          bilibiliEmbedW.setTitle(biliHTML.data.data.item.modules.module_author.name.toString());
        } catch {}
        bilibiliEmbedW.setURL(result[0]);
        try {
          if (biliHTML.data.data.item.modules.module_dynamic?.desc) {
            bilibiliEmbedW.setDescription(biliHTML.data.data.item.modules.module_dynamic.desc.text.toString().substring(0, 600));
          }
        } catch {}
        messageSender(message, spoiler, iconURL, bilibiliEmbedW, 'ermiana');
        await new Promise((resolve) => setTimeout(resolve, 500));
        embedSuppresser(message);
      } else {
        return;
      }
    } else {
      return;
    }
  } catch {
    console.log('bilibili error: '+ message.guild.name);
  }
};
