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
      fxapitwitterEmbed.setAuthor({ name: '@' + fxapiResp.data.tweet.author.screen_name, iconURL: fxapiResp.data.tweet.author.avatar_url });
      fxapitwitterEmbed.setTitle(fxapiResp.data.tweet.author.name);
      fxapitwitterEmbed.setURL(fxapiResp.data.tweet.url);

      try {
        fxapitwitterEmbed.setDescription(fxapiResp.data.tweet.text);
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
        /*
        if (!message.embeds[0]) {
          try {
            await message.channel.sendTyping();
          } catch {}
          messageSender(message.channel, fxapitwitterEmbed, fxapitweetinfo);
          embedSuppresser(message);
        } else if (fxapiResp.data.tweet.media.mosaic && fxapiResp.data.tweet.media.mosaic.type === 'mosaic_photo') {
          try {
            await message.channel.sendTyping();
          } catch {}
          messageSender(message.channel, fxapitwitterEmbed, fxapitweetinfo);
          embedSuppresser(message);
        }
        */

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
    console.log('fxtwitter api error: '+ message.guild.name);
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
        vxapitwitterEmbed.setAuthor({ name: '@' + vxapiResp.data.user_screen_name });
        vxapitwitterEmbed.setTitle(vxapiResp.data.user_name);
        vxapitwitterEmbed.setURL(vxapiResp.data.tweetURL);

        try {
          vxapitwitterEmbed.setDescription(vxapiResp.data.text);
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
              vxapiRespImage = null;
            } else if (vxapiRespImage.length > 1) {
              vxapitwitterEmbed.setImage('https://convert.vxtwitter.com/rendercombined.jpg?imgs=' + vxapiRespImage.join(','));
              vxapiRespImage = null;
            }
          }
        } catch {}

        const vxapitweetinfo = '💬' + vxapiResp.data.replies.toString() + ' 🔁' + vxapiResp.data.retweets.toString() + ' ❤️' + vxapiResp.data.likes.toString();

        try {
          /*
          if (!message.embeds[0]) {
            try {
              await message.channel.sendTyping();
            } catch {}
            messageSender(message.channel, vxapitwitterEmbed, vxapitweetinfo);
            embedSuppresser(message);
          } else if (vxapiResp.data.mediaURLs.length > 1) {
            try {
              await message.channel.sendTyping();
            } catch {}
            messageSender(message.channel, vxapitwitterEmbed, vxapitweetinfo);
            embedSuppresser(message);
          }
          */

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
