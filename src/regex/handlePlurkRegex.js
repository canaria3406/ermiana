import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import cheerio from 'cheerio';
import { messageSender } from '../common/messageSender.js';
import { embedSuppresser } from '../common/embedSuppresser.js';

export async function handlePlurkRegex( result, message ) {
  try {
    await message.channel.sendTyping();
  } catch {}
  try {
    const plurkHTML = await axios.request({
      url: 'https://www.plurk.com/p/' + result[1],
      method: 'get',
      timeout: 2500,
    });

    const $ = cheerio.load(plurkHTML.data);

    const rePlurk = $('script').text().match(/"replurkers_count": (\d+),/)[1] || '0';
    const favPlurk = $('script').text().match(/"favorite_count": (\d+),/)[1] || '0';
    const respPlurk = $('script').text().match(/"response_count": (\d+),/)[1] || '0';

    const plurkEmbed = new EmbedBuilder();
    plurkEmbed.setColor(16556594);
    plurkEmbed.setTitle($('.name').text());
    plurkEmbed.setURL('https://www.plurk.com/p/' + result[1]);
    try {
      plurkEmbed.setDescription($('.text_holder').text());
    } catch {}
    try {
      plurkEmbed.setImage($('script').text().match(/https:\/\/images\.plurk\.com\/[^"]+\.(jpg|png)/)[0]);
    } catch {}

    const plurkInfo = '💬' + respPlurk + ' 🔁' + rePlurk + ' ❤️' + favPlurk;

    embedSuppresser(message);

    messageSender(message.channel, plurkEmbed, plurkInfo);
  } catch {
    // console.log('plurk error');
  }
};
