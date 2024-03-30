import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { messageSender } from '../common/messageSender.js';
import { embedSuppresser } from '../common/embedSuppresser.js';

export async function handleTwitterRegex( result, message ) {
  try {
    await message.channel.sendTyping();
  } catch {}

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
        } else if (fxapiResp.data.tweet.media.all[0].type === 'photo') {
          fxapitwitterEmbed.setImage(fxapiResp.data.tweet.media.all[0].url + '?name=large');
        }
      } catch {}

      const fxapitweetinfo = '💬' + fxapiResp.data.tweet.replies.toString() + ' 🔁' + fxapiResp.data.tweet.retweets.toString() + ' ❤️' + fxapiResp.data.tweet.likes.toString();

      try {
        messageSender(message.channel, fxapitwitterEmbed, fxapitweetinfo);
        embedSuppresser(message);
      } catch {}

      try {
        if (fxapiResp.data.tweet.media) {
          fxapiResp.data.tweet.media.all.forEach((element) => {
            if (element.type != 'photo') {
              message.channel.send('[連結](' + element.url +')');
            }
          });
        }
      } catch {}
    }
  } catch {
    console.log('fxtwitter api error: '+ message.guild.name + ' ' + tid);
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

        const vxapitweetinfo = '💬' + vxapiResp.data.replies.toString() + ' 🔁' + vxapiResp.data.retweets.toString() + ' ❤️' + vxapiResp.data.likes.toString();

        try {
          messageSender(message.channel, vxapitwitterEmbed, vxapitweetinfo);
          embedSuppresser(message);
        } catch {}

        try {
          if (vxapiResp.data.media_extended) {
            vxapiResp.data.media_extended.forEach((element) => {
              if (element.type != 'image') {
                message.channel.send('[連結](' + element.url +')');
              }
            });
          }
        } catch {}
      }
    } catch {
      console.log('vxtwitter api error: '+ message.guild.name);
    }
  }
};
