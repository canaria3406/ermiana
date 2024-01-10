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

    const pttHTML = await axios.request({
      url: result[0],
      method: 'get',
      headers: { Cookie: 'over18=1;' },
      timeout: 2500,
    });

    if (pttHTML.status === 200) {
      const $ = cheerio.load(pttHTML.data);
      const pttHtmlTitle = $('meta[property=og:title]').attr('content') || '';
      const pttHtmlDescription = $('meta[property=og:description]').attr('content') || '';
      try {
        const pttResp = await axios.request({
          method: 'get',
          url: 'https://moptt.tw/ptt/' + boardNameStandardization(result[1]) + '.' + result[2],
          timeout: 2500,
        });
        const mopttEmbed = new EmbedBuilder();
        mopttEmbed.setColor(2894892);
        try {
          if (pttResp.status === 200) {
            mopttEmbed.setTitle(pttResp.data.title);
          } else if (pttHtmlTitle) {
            mopttEmbed.setTitle(pttHtmlTitle);
          }
        } catch {}
        mopttEmbed.setURL(result[0]);
        try {
          if (pttHtmlDescription !== '') {
            mopttEmbed.setDescription(pttHtmlDescription);
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
      } catch {
        try {
          const pttEmbed = new EmbedBuilder();
          pttEmbed.setColor(2894892);
          pttEmbed.setTitle(pttHtmlTitle);
          pttEmbed.setURL(result[0]);
          try {
            pttEmbed.setDescription(pttHtmlDescription);
          } catch {}
          if (!message.embeds[0]) {
            try {
              await message.channel.sendTyping();
            } catch {}
            messageSender(message.channel, pttEmbed, 'ermiana');
          }
        } catch {}
      }
    }
  } catch {
    console.log('ptt error: '+ message.guild.name);
  }
};
