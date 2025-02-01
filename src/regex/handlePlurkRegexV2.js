import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { typingSender } from '../events/typingSender.js';
import { messageSenderMore } from '../events/messageSenderMore.js';

export async function handlePlurkRegex( result, message, spoiler ) {
  const iconURL = 'https://ermiana.canaria.cc/pic/plurk.png';
  typingSender(message);
  try {
    const plurkHTML = await axios.request({
      url: 'https://www.plurk.com/p/' + result[1],
      method: 'get',
      timeout: 2500,
    });

    if (plurkHTML.status === 200) {
      const $ = cheerio.load(plurkHTML.data);

      const rePlurk = $('script').text().match(/"replurkers_count": (\d+),/)[1] || '0';
      const favPlurk = $('script').text().match(/"favorite_count": (\d+),/)[1] || '0';
      const respPlurk = $('script').text().match(/"response_count": (\d+),/)[1] || '0';
      const plurkInfo = '💬' + respPlurk + ' 🔁' + rePlurk + ' ❤️' + favPlurk;

      const plurkName = $('.name').text() || '噗浪使用者';
      const plurkContent = $('.text_holder').html().replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '') || '';
      /*
      const plurkContent = (
        $('script')
            .text()
            .replace(/<(?!br\s*\/?)[^>]+>/gi, '')
            .match(/"content":\s*"([^"]+)"/)?.[1]
            .replace(/<br\s*\/?>/g, '\n')
            .replace(/\\u[\dA-Fa-f]{4}/g, (match) => {
              return String.fromCharCode(parseInt(match.slice(2), 16));
            })
            .trim() || ''
      );
      */
      const rawPlurkIndex = $('script').text().indexOf('content_raw') || -1;
      const picPlurk = $('script').text().slice(rawPlurkIndex).match(/https:\/\/images\.plurk\.com\/[^\\"\s]+/g) || [];

      const plurkId = $('script').text().match(/"page_user":\s*{"id":\s*(\d+),/)?.[1] || '17527487';
      const plurkAvatar = $('script').text().match(/"avatar":\s*(\d+)/)?.[1] || '79721750';
      const plurkNickName = $('script').text().match(/"nick_name":\s*"([^"]+)"/)?.[1] || 'plurkuser';

      const plurkEmbed = new EmbedBuilder();
      plurkEmbed.setColor(0xefa54c);
      plurkEmbed.setTitle(plurkName);
      plurkEmbed.setURL('https://www.plurk.com/p/' + result[1]);
      try {
        if (plurkId && plurkAvatar && plurkNickName) {
          plurkEmbed.setAuthor({ name: '@' + plurkNickName, iconURL: `https://avatars.plurk.com/${plurkId}-medium${plurkAvatar}.gif` });
        }
      } catch {}
      try {
        if (plurkContent) {
          plurkEmbed.setDescription(plurkContent);
        }
      } catch {}
      try {
        if (picPlurk.length > 0) {
          plurkEmbed.setImage(picPlurk[0]);
        }
      } catch {}

      try {
        if (!picPlurk || picPlurk.length == 0) {
          messageSender(message, spoiler, iconURL, plurkEmbed, plurkInfo);
          embedSuppresser(message);
          await new Promise((resolve) => setTimeout(resolve, 800));
          embedSuppresser(message);
        } else if (picPlurk.length == 1) {
          messageSender(message, spoiler, iconURL, plurkEmbed, plurkInfo);
          embedSuppresser(message);
          await new Promise((resolve) => setTimeout(resolve, 800));
          embedSuppresser(message);
        } else if (picPlurk.length > 1) {
          const imageArray =[];
          picPlurk.filter((_pic, index) => index > 0 && index < 4)
              .forEach((pic) => {
                imageArray.push(pic);
              });
          messageSenderMore(message, spoiler, iconURL, plurkEmbed, plurkInfo, imageArray);
          embedSuppresser(message);
          await new Promise((resolve) => setTimeout(resolve, 800));
          embedSuppresser(message);
        }
      } catch {}
    } else {
      throw Error('plurk error: '+ message.guild.name);
    }
  } catch {
    console.log('plurk error: '+ message.guild.name);
  }
};
