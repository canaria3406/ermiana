import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import cheerio from 'cheerio';
import { messageSender } from '../common/messageSender.js';

export async function handlePttRegex( result, message ) {
  try {
    await message.channel.sendTyping();
  } catch {}
  try {
    const pttResp = await axios.request({
      method: 'get',
      url: 'https://moptt.tw/ptt/' + result[1] + '.' + result[2],
      timeout: 2000,
    });
    if (pttResp.status === 200) {
      const mopttEmbed = new EmbedBuilder();
      mopttEmbed.setColor(2894892);
      mopttEmbed.setTitle(pttResp.data.title);
      mopttEmbed.setURL(pttResp.data.url);
      // try {
      //   if (pttResp.data.author) {
      //     mopttEmbed.setAuthor({ name: '@' + pttResp.data.author });
      //   }      
      // } catch {}
      try {
        if (pttResp.data.description) {
          mopttEmbed.setDescription(pttResp.data.description);
        }      
      } catch {}
      try {
        if (pttResp.data.imageSource) {
          mopttEmbed.setImage(pttResp.data.imageSource);
        }
      } catch {}

      messageSender(message.channel, mopttEmbed, 'canaria3406');
    }
  } catch {
    console.log('moptt api error');
    try {
      const pageHTML = await axios.request({
        url: result[0],
        method: 'get',
        headers: { Cookie: 'over18=1;' },
        timeout: 2000,
      });
  
      const $ = cheerio.load(pageHTML.data);
  
      const pttEmbed = new EmbedBuilder();
      pttEmbed.setColor(2894892);
      pttEmbed.setTitle($('meta[property=og:title]').attr('content'));
      pttEmbed.setURL(result[0]);
      try {
        if ($('meta[property=og:description]').attr('content')) {
          pttEmbed.setDescription($('meta[property=og:description]').attr('content'));
        }
      } catch {}
  
      messageSender(message.channel, pttEmbed, 'canaria3406');
    } catch {
      console.log('ptt error');
    }
  }
};
