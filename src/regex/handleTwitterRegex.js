import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { videoLinkSender } from '../events/videoLinkSender.js';
import { backupLinkSender } from '../events/backupLinkSender.js';
import { typingSender } from '../events/typingSender.js';

function videoLinkFormat( link ) {
  const linkmatch = link.match(/https:\/\/.*?\.mp4/);
  if (linkmatch) {
    return linkmatch[0].includes('ext_tw_video') ? `${linkmatch[0]}?s=19` : linkmatch[0];
  } else {
    return 'https://twitter.com/';
  }
}

export async function handleTwitterRegex( result, message ) {
  typingSender(message);
  const tid = result[1];
  try {
    // use fxtwitter api
    const fxapiResp = await axios.request({
      method: 'get',
      url: 'https://api.fxtwitter.com/i/status/' + tid,
      timeout: 2500,
    });

    if (fxapiResp.status === 200) {
      const fxapitwitterEmbed = new EmbedBuilder();
      fxapitwitterEmbed.setColor(0x1DA1F2);
      try {
        if (fxapiResp.data.tweet.author.screen_name && fxapiResp.data.tweet.author.avatar_url) {
          fxapitwitterEmbed.setAuthor({ name: '@' + fxapiResp.data.tweet.author.screen_name, iconURL: fxapiResp.data.tweet.author.avatar_url });
        } else if (fxapiResp.data.tweet.author.screen_name) {
          fxapitwitterEmbed.setAuthor({ name: '@' + fxapiResp.data.tweet.author.screen_name });
        }
      } catch {}
      try {
        if (fxapiResp.data.tweet.author.name) {
          fxapitwitterEmbed.setTitle(fxapiResp.data.tweet.author.name);
        } else {
          fxapitwitterEmbed.setTitle('Twitter.com');
        }
      } catch {}
      try {
        if (fxapiResp.data.tweet.url) {
          fxapitwitterEmbed.setURL(fxapiResp.data.tweet.url);
        } else {
          fxapitwitterEmbed.setURL('https://twitter.com/i/status/' + tid);
        }
      } catch {}
      try {
        if (fxapiResp.data.tweet.text) {
          fxapitwitterEmbed.setDescription(fxapiResp.data.tweet.text);
        }
      } catch {}
      try {
        if (fxapiResp.data.tweet.media.mosaic && fxapiResp.data.tweet.media.mosaic.type === 'mosaic_photo') {
          fxapitwitterEmbed.setImage(fxapiResp.data.tweet.media.mosaic.formats.jpeg);
        } else if (fxapiResp.data.tweet.media.photos[0].type === 'photo') {
          fxapitwitterEmbed.setImage(fxapiResp.data.tweet.media.photos[0].url + '?name=large');
        }
      } catch {}
      try {
        fxapitwitterEmbed.setTimestamp(fxapiResp.data.tweet.created_timestamp * 1000);
      } catch {}
      const fxapitweetinfo = '💬' + (fxapiResp.data.tweet.replies?.toString() || '0') + ' 🔁' + (fxapiResp.data.tweet.retweets?.toString() || '0') + ' ❤️' + (fxapiResp.data.tweet.likes?.toString() || '0');
      try {
        messageSender(message, fxapitwitterEmbed, fxapitweetinfo);
        embedSuppresser(message);
      } catch {}
      try {
        if (fxapiResp.data.tweet.media) {
          fxapiResp.data.tweet.media.all.forEach((element) => {
            if (element.type != 'photo') {
              videoLinkSender(message, videoLinkFormat(element.url));
            }
          });
        }
      } catch {}
    } else {
      throw new Error('fxtwitter api error: '+ tid);
    }
  } catch {
    // console.log('fxtwitter api error: '+ message.guild.name);
    try {
      const vxapiResp = await axios.request({
        method: 'get',
        url: 'https://api.vxtwitter.com/i/status/' + tid,
        timeout: 2500,
      });

      if (vxapiResp.status === 200) {
        // use vxtwitter api
        const vxapitwitterEmbed = new EmbedBuilder();
        vxapitwitterEmbed.setColor(0x1DA1F2);
        try {
          if (vxapiResp.data.user_screen_name) {
            vxapitwitterEmbed.setAuthor({ name: '@' + vxapiResp.data.user_screen_name });
          }
        } catch {}
        try {
          if (vxapiResp.data.user_name) {
            vxapitwitterEmbed.setTitle(vxapiResp.data.user_name);
          } else {
            vxapitwitterEmbed.setTitle('Twitter.com');
          }
        } catch {}
        try {
          if (vxapiResp.data.tweetURL) {
            vxapitwitterEmbed.setURL(vxapiResp.data.tweetURL);
          } else {
            vxapitwitterEmbed.setURL('https://twitter.com/i/status/' + tid);
          }
        } catch {}
        try {
          if (vxapiResp.data.text) {
            vxapitwitterEmbed.setDescription(vxapiResp.data.text);
          }
        } catch {}
        try {
          if (vxapiResp.data.media_extended && vxapiResp.data.media_extended[0].type === 'image' && vxapiResp.data.mediaURLs.length === 1) {
            vxapitwitterEmbed.setImage(vxapiResp.data.mediaURLs[0] + '?name=large');
          } else if (vxapiResp.data.media_extended) {
            const vxapiRespImage = [];
            vxapiResp.data.media_extended.forEach((element) => {
              if (element.type === 'image') {
                vxapiRespImage.push(element.url);
              }
            });
            if (vxapiRespImage.length === 1) {
              vxapitwitterEmbed.setImage(vxapiRespImage[0] + '?name=large');
            } else if (vxapiRespImage.length > 1) {
              vxapitwitterEmbed.setImage('https://convert.vxtwitter.com/rendercombined.jpg?imgs=' + vxapiRespImage.join(','));
            }
          }
        } catch {}
        try {
          vxapitwitterEmbed.setTimestamp(vxapiResp.data.date_epoch * 1000);
        } catch {}
        const vxapitweetinfo = '💬' + (vxapiResp.data.replies?.toString() || '0') + ' 🔁' + (vxapiResp.data.retweets?.toString() || '0') + ' ❤️' + (vxapiResp.data.likes?.toString() || '0');
        try {
          messageSender(message, vxapitwitterEmbed, vxapitweetinfo);
          embedSuppresser(message);
        } catch {}
        try {
          if (vxapiResp.data.media_extended) {
            vxapiResp.data.media_extended.forEach((element) => {
              if (element.type != 'image') {
                videoLinkSender(message, videoLinkFormat(element.url));
              }
            });
          }
        } catch {}
      } else {
        throw new Error('vxtwitter api error: '+ tid);
      }
    } catch {
      // console.log('vxtwitter api error: '+ message.guild.name);
      try {
        // console.log('fx vx twitter api error: '+ tid);
        backupLinkSender(message, `https://fxtwitter.com/i/status/${result[1]}`);
        embedSuppresser(message);
      } catch {
        console.log('twitter api error: '+ message.guild.name);
      }
    }
  }
};
