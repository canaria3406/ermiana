import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import cheerio from 'cheerio';
import { messageSender } from '../common/messageSender.js';

export async function handlePttRegex( result, message ) {
  try {
    await message.channel.sendTyping();
  } catch {}
  try {
    const pageHTML = await axios.request({
      url: result[0],
      method: 'get',
      headers: { Cookie: 'over18=1;' },
    });

    const $ = cheerio.load(pageHTML.data);

    const pttEmbed = new EmbedBuilder();
    pttEmbed.setColor(2894892);
    pttEmbed.setTitle($('meta[property=og:title]').attr('content'));
    pttEmbed.setURL(result[0]);
    try {
      pttEmbed.setDescription($('meta[property=og:description]').attr('content'));
    } catch {}

    messageSender(message.channel, pttEmbed, 'canaria3406');
  } catch {
    console.log('ptt error');
  }
};
