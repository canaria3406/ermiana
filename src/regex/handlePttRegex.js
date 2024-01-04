import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import cheerio from 'cheerio';
import { messageSender } from '../common/messageSender.js';

export async function handlePttRegex( result, message ) {
  try {
    function boardNameStandardization(boardName) {
      const boardNameStandardized = boardName.toLowerCase();
      if (boardNameStandardized === 'gossiping') {
        return 'Gossiping';
      } else if (boardNameStandardized === 'ac_in') {
        return 'AC_In';
      } else if (boardNameStandardized === 'h-game') {
        return 'H-GAME';
      } else if (boardNameStandardized === 'sex') {
        return 'sex';
      } else {
        return boardName;
      }
    }
    // use moptt api
    const pttResp = await axios.request({
      method: 'get',
      url: 'https://moptt.tw/ptt/' + boardNameStandardization(result[1]) + '.' + result[2],
      timeout: 2500,
    });
    if (pttResp.status === 200) {
      const mopttEmbed = new EmbedBuilder();
      mopttEmbed.setColor(2894892);
      mopttEmbed.setTitle(pttResp.data.title);
      mopttEmbed.setURL(pttResp.data.url);

      let pttDescription = '';
      try {
        // use vanilla ptt description
        const pttDATA = await axios.request({
          url: result[0],
          method: 'get',
          headers: { Cookie: 'over18=1;' },
          timeout: 2500,
        });
        const $ = cheerio.load(pttDATA.data);
        if ($('meta[property=og:description]').attr('content')) {
          pttDescription = $('meta[property=og:description]').attr('content');
        }
      } catch {}
      try {
        if (pttDescription) {
          mopttEmbed.setDescription(pttDescription);
        } else if (pttResp.data.description) {
          mopttEmbed.setDescription(pttResp.data.description);
        }
      } catch {}
      try {
        if (pttResp.data.imageSource) {
          mopttEmbed.setImage(pttResp.data.imageSource);
        }
      } catch {}
      if (!message.embeds[0]) {
        try {
          await message.channel.sendTyping();
        } catch {}
        messageSender(message.channel, mopttEmbed, 'ermiana');
      }
    }
  } catch {
    // console.log('moptt api error');
    // use vanilla ptt as backup
    try {
      const pttHTML = await axios.request({
        url: result[0],
        method: 'get',
        headers: { Cookie: 'over18=1;' },
        timeout: 2000,
      });

      const $ = cheerio.load(pttHTML.data);

      const pttEmbed = new EmbedBuilder();
      pttEmbed.setColor(2894892);
      pttEmbed.setTitle($('meta[property=og:title]').attr('content'));
      pttEmbed.setURL(result[0]);
      try {
        if ($('meta[property=og:description]').attr('content')) {
          pttEmbed.setDescription($('meta[property=og:description]').attr('content'));
        }
      } catch {}

      if (!message.embeds[0]) {
        try {
          await message.channel.sendTyping();
        } catch {}
        messageSender(message.channel, pttEmbed, 'ermiana');
      }
    } catch {
      console.log('ptt error: '+ message.guild.name);
    }
  }
};
