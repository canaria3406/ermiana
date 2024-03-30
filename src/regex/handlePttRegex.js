import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import cheerio from 'cheerio';
import { messageSender } from '../common/messageSender.js';
import { embedSuppresser } from '../common/embedSuppresser.js';

export async function handlePttRegex( result, message ) {
  // 其他看板觀察中 'Gamesale', 'SportLottery'
  const supportBoard = ['Gossiping', 'C_Chat', 'AC_In', 'H-GAME', 'sex', 'HatePolitics', 'Beauty', 'japanavgirls', 'DMM_GAMES'];

  function boardNameStandardization(boardName) {
    const boardNameStandardized = boardName.toLowerCase();
    if (boardNameStandardized === 'gossiping') {
      return 'Gossiping';
    } else if (boardNameStandardized === 'c_chat') {
      return 'C_Chat';
    } else if (boardNameStandardized === 'ac_in') {
      return 'AC_In';
    } else if (boardNameStandardized === 'h-game') {
      return 'H-GAME';
    } else if (boardNameStandardized === 'sex') {
      return 'sex';
    } else if (boardNameStandardized === 'hatepolitics') {
      return 'HatePolitics';
    } else if (boardNameStandardized === 'beauty') {
      return 'Beauty';
    } else if (boardNameStandardized === 'japanavgirls') {
      return 'japanavgirls';
    } else if (boardNameStandardized === 'dmm_games') {
      return 'DMM_GAMES';
    } else {
      return boardName;
    }
  }

  try {
    if (supportBoard.includes(boardNameStandardization(result[1]))) {
      const pttHTML = await axios.request({
        url: `https://www.ptt.cc/bbs/${boardNameStandardization(result[1])}/${result[2]}.html`,
        method: 'get',
        headers: { Cookie: 'over18=1;' },
        timeout: 2000,
      });

      try {
        await message.channel.sendTyping();
      } catch {}

      if (pttHTML.status === 200) {
        const $ = cheerio.load(pttHTML.data);
        const pttHtmlTitle = $('meta[property=og:title]').attr('content') || 'PTT.cc';
        const pttHtmlDescription = $('meta[property=og:description]').attr('content') || '';
        try {
          const pttResp = await axios.request({
            method: 'get',
            url: `https://moptt.tw/ptt/${result[1]}.${result[2]}`,
            timeout: 2000,
          });

          const mopttEmbed = new EmbedBuilder();
          mopttEmbed.setColor(0x2C2C2C);
          try {
            if (pttResp.status === 200) {
              mopttEmbed.setTitle(pttResp.data.title);
            } else {
              mopttEmbed.setTitle(pttHtmlTitle);
            }
          } catch {}
          try {
            mopttEmbed.setURL(`https://www.ptt.cc/bbs/${boardNameStandardization(result[1])}/${result[2]}.html`);
          } catch {}
          try {
            if (pttHtmlDescription) {
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
          try {
            messageSender(message.channel, mopttEmbed, 'ermiana');
            embedSuppresser(message);
          } catch {}
        } catch {
          try {
            const pttEmbed = new EmbedBuilder();
            pttEmbed.setColor(0x2C2C2C);
            try {
              pttEmbed.setTitle(pttHtmlTitle);
              pttEmbed.setURL(result[0]);
            } catch {}
            try {
              if (pttHtmlDescription) {
                pttEmbed.setDescription(pttHtmlDescription);
              }
            } catch {}
            try {
              messageSender(message.channel, pttEmbed, 'ermiana');
              embedSuppresser(message);
            } catch {}
          } catch {}
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1800));
        const pttHTML2 = await axios.request({
          url: `https://www.ptt.cc/bbs/${boardNameStandardization(result[1])}/${result[2]}.html`,
          method: 'get',
          headers: { Cookie: 'over18=1;' },
          timeout: 3000,
        });

        if (pttHTML2.status === 200) {
          const $ = cheerio.load(pttHTML2.data);
          const pttHtmlTitle2 = $('meta[property=og:title]').attr('content') || 'PTT.cc';
          const pttHtmlDescription2 = $('meta[property=og:description]').attr('content') || '';

          try {
            const pttResp2 = await axios.request({
              method: 'get',
              url: `https://moptt.tw/ptt/${result[1]}.${result[2]}`,
              timeout: 3000,
            });
            const mopttEmbed2 = new EmbedBuilder();
            mopttEmbed2.setColor(0x2C2C2C);
            try {
              if (pttResp2.status === 200) {
                mopttEmbed2.setTitle(pttResp2.data.title);
              } else {
                mopttEmbed2.setTitle(pttHtmlTitle2);
              }
            } catch {}
            try {
              mopttEmbed2.setURL(`https://www.ptt.cc/bbs/${boardNameStandardization(result[1])}/${result[2]}.html`);
            } catch {}
            try {
              if (pttHtmlDescription2) {
                mopttEmbed2.setDescription(pttHtmlDescription2);
              } else if (pttResp2.data.description) {
                mopttEmbed2.setDescription(pttResp2.data.description);
              }
            } catch {}
            try {
              if (pttResp2.data.imageSource) {
                mopttEmbed2.setImage(pttResp2.data.imageSource);
              }
            } catch {}
            try {
              messageSender(message.channel, mopttEmbed2, 'ermiana');
              embedSuppresser(message);
            } catch {}
          } catch {
            try {
              const pttEmbed2 = new EmbedBuilder();
              pttEmbed2.setColor(0x2C2C2C);
              try {
                pttEmbed2.setTitle(pttHtmlTitle2);
                pttEmbed2.setURL(result[0]);
              } catch {}
              try {
                if (pttHtmlDescription2) {
                  pttEmbed2.setDescription(pttHtmlDescription2);
                }
              } catch {}
              try {
                messageSender(message.channel, pttEmbed2, 'ermiana');
                embedSuppresser(message);
              } catch {}
            } catch {}
          }
        }
      }
    }
  } catch {
    console.log('ptt error: '+ message.guild.name);
  }
};
