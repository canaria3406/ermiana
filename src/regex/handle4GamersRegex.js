import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { typingSender } from '../events/typingSender.js';

export async function handle4GamersRegex( result, message, spoiler ) {
  typingSender(message);
  try {
    const url = result[0];
    const resp = await axios.request({
      url: url,
      method: 'get',
      timeout: 2500,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
      },
    });

    const $ = cheerio.load(resp.data);

    const gamersEmbed = new EmbedBuilder();
    gamersEmbed.setColor(0x3A94CB);
    try {
      const title = $('meta[property="og:title"]').attr('content') || $('title').text();
      if (title) {
        gamersEmbed.setTitle(title);
      }
    } catch {}
    gamersEmbed.setURL(url);
    try {
      const desc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
      if (desc) {
        gamersEmbed.setDescription(desc.substring(0, 300));
      }
    } catch {}
    try {
      const image = $('meta[property="og:image"]').attr('content');
      if (image) {
        gamersEmbed.setImage(image);
      }
    } catch {}

    messageSender(message, spoiler, undefined, gamersEmbed, '4Gamers 新聞');
    embedSuppresser(message);
  } catch {
    console.log('4gamers error: ' + message.guild.name);
  }
};

