import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { videoLinkSender } from '../events/videoLinkSender.js';
import { backupLinkSender } from '../events/backupLinkSender.js';
import { typingSender } from '../events/typingSender.js';

export async function handleTwitterRegex( result, message, spoiler ) {
  const iconURL = 'https://ermiana.canaria.cc/pic/twitter.png';
  typingSender(message);
  const tid = result[1];

  function twitterEmbedMaker(autherID, autherIconURL, autherName, tweetURL, tweetText, tweetImage, tweetTimestamp) {
    const twitterEmbed = new EmbedBuilder();
    twitterEmbed.setColor(0x1DA1F2);
    if (autherID && autherIconURL) {
      twitterEmbed.setAuthor({ name: '@' + autherID, iconURL: autherIconURL });
    } else if (autherID) {
      twitterEmbed.setAuthor({ name: '@' + autherID });
    }
    if (autherName) {
      twitterEmbed.setTitle(autherName);
    } else {
      twitterEmbed.setTitle('Twitter.com');
    }
    if (tweetURL) {
      twitterEmbed.setURL(tweetURL);
    } else {
      twitterEmbed.setURL('https://twitter.com/i/status/' + tid);
    }
    if (tweetText) {
      twitterEmbed.setDescription(tweetText);
    }
    if (tweetImage) {
      twitterEmbed.setImage(tweetImage);
    }
    if (tweetTimestamp) {
      twitterEmbed.setTimestamp(tweetTimestamp);
    }
    return twitterEmbed;
  }

  try {
    // use fxtwitter api
    const fxapiResp = await axios.request({
      method: 'get',
      url: 'https://api.fxtwitter.com/i/status/' + tid,
      timeout: 2500,
    });

    if (fxapiResp.status === 200) {
      const fxapitweetinfo = '💬' + (fxapiResp.data.tweet.replies?.toString() || '0') + ' 🔁' + (fxapiResp.data.tweet.retweets?.toString() || '0') + ' ❤️' + (fxapiResp.data.tweet.likes?.toString() || '0');
      if (fxapiResp.data.tweet?.media) {
        const fxapiRespVideo = [];
        fxapiResp.data.tweet.media.all.forEach((element) => {
          if (element.type !== 'photo') {
            fxapiRespVideo.push(element.url);
          }
        });
        if (fxapiResp.data.tweet.media?.mosaic && fxapiResp.data.tweet.media?.mosaic.type === 'mosaic_photo') {
          const fxapitwitterEmbed = twitterEmbedMaker(fxapiResp.data.tweet.author.screen_name,
              (fxapiResp.data.tweet.author.avatar_url||''),
              (fxapiResp.data.tweet.author.name||'Twitter.com'),
              (fxapiResp.data.tweet.url||''),
              (fxapiResp.data.tweet.text)||'',
              fxapiResp.data.tweet.media.mosaic.formats.jpeg,
              fxapiResp.data.tweet.created_timestamp * 1000);
          messageSender(message, spoiler, iconURL, fxapitwitterEmbed, fxapitweetinfo);
          embedSuppresser(message);
          fxapiRespVideo.forEach((url) => {
            videoLinkSender(message, spoiler, url);
          });
        } else if (fxapiResp.data.tweet.media?.photos && !fxapiResp.data.tweet.media?.mosaic) {
          const fxapitwitterEmbed = twitterEmbedMaker(fxapiResp.data.tweet.author.screen_name,
              (fxapiResp.data.tweet.author.avatar_url||''),
              (fxapiResp.data.tweet.author.name||'Twitter.com'),
              (fxapiResp.data.tweet.url||''),
              (fxapiResp.data.tweet.text||''),
              fxapiResp.data.tweet.media.photos[0].url + '?name=large',
              fxapiResp.data.tweet.created_timestamp * 1000);
          messageSender(message, spoiler, iconURL, fxapitwitterEmbed, fxapitweetinfo);
          embedSuppresser(message);
          fxapiRespVideo.forEach((url) => {
            videoLinkSender(message, spoiler, url);
          });
        } else if (fxapiRespVideo && !fxapiResp.data.tweet.media?.photos) {
          const fxapitwitterEmbed = twitterEmbedMaker(fxapiResp.data.tweet.author.screen_name,
              (fxapiResp.data.tweet.author.avatar_url||''),
              (fxapiResp.data.tweet.author.name||'Twitter.com'),
              (fxapiResp.data.tweet.url||''),
              (fxapiResp.data.tweet.text||''),
              '',
              fxapiResp.data.tweet.created_timestamp * 1000);
          messageSender(message, spoiler, iconURL, fxapitwitterEmbed, fxapitweetinfo);
          embedSuppresser(message);
          videoLinkSender(message, spoiler, `https://d.vxtwitter.com/i/status/${result[1]}`);
          fxapiRespVideo.filter((_url, index) => index > 0)
              .forEach((url) => {
                videoLinkSender(message, spoiler, url);
              });
        }
      } else {
        const fxapitwitterEmbed = twitterEmbedMaker(fxapiResp.data.tweet.author.screen_name,
            (fxapiResp.data.tweet.author.avatar_url||''),
            (fxapiResp.data.tweet.author.name||'Twitter.com'),
            (fxapiResp.data.tweet.url||''),
            (fxapiResp.data.tweet.text||''),
            '',
            fxapiResp.data.tweet.created_timestamp * 1000);
        messageSender(message, spoiler, iconURL, fxapitwitterEmbed, fxapitweetinfo);
        embedSuppresser(message);
      }
    } else {
      throw new Error('fxtwitter api error: '+ tid);
    }
  } catch {
    try {
      // use vxtwitter api
      const vxapiResp = await axios.request({
        method: 'get',
        url: 'https://api.vxtwitter.com/i/status/' + tid,
        timeout: 2500,
      });

      if (vxapiResp.status === 200) {
        const vxapitweetinfo = '💬' + (vxapiResp.data.replies?.toString() || '0') + ' 🔁' + (vxapiResp.data.retweets?.toString() || '0') + ' ❤️' + (vxapiResp.data.likes?.toString() || '0');
        if (vxapiResp.data?.media_extended) {
          const vxapiRespImage = [];
          vxapiResp.data.media_extended.forEach((element) => {
            if (element.type === 'image') {
              vxapiRespImage.push(element.url);
            }
          });
          const vxapiRespVideo = [];
          vxapiResp.data.media_extended.forEach((element) => {
            if (element.type !== 'image') {
              vxapiRespVideo.push(element.url);
            }
          });
          if (vxapiRespImage.length === 1) {
            const vxapitwitterEmbed = twitterEmbedMaker(vxapiResp.data.user_screen_name,
                '',
                (vxapiResp.data.user_name||'Twitter.com'),
                (vxapiResp.data.tweetURL||''),
                (vxapiResp.data.text||''),
                vxapiRespImage[0] + '?name=large',
                vxapiResp.data.date_epoch * 1000);
            messageSender(message, spoiler, iconURL, vxapitwitterEmbed, vxapitweetinfo);
            embedSuppresser(message);
            vxapiRespVideo.forEach((url) => {
              videoLinkSender(message, spoiler, url);
            });
          } else if (vxapiRespImage.length > 1) {
            const vxapitwitterEmbed = twitterEmbedMaker(vxapiResp.data.user_screen_name,
                '',
                (vxapiResp.data.user_name||'Twitter.com'),
                (vxapiResp.data.tweetURL||''),
                (vxapiResp.data.text||''),
                'https://convert.vxtwitter.com/rendercombined.jpg?imgs=' + vxapiRespImage.join(','),
                vxapiResp.data.date_epoch * 1000);
            messageSender(message, spoiler, iconURL, vxapitwitterEmbed, vxapitweetinfo);
            embedSuppresser(message);
            vxapiRespVideo.forEach((url) => {
              videoLinkSender(message, spoiler, url);
            });
          } else {
            backupLinkSender(message, spoiler, `https://vxtwitter.com/i/status/${result[1]}`);
            embedSuppresser(message);
            vxapiRespVideo.filter((_url, index) => index > 0 && index < 4)
                .forEach((url) => {
                  videoLinkSender(message, spoiler, url);
                });
          }
        } else {
          const vxapitwitterEmbed = twitterEmbedMaker(vxapiResp.data.user_screen_name,
              '',
              (vxapiResp.data.user_name||'Twitter.com'),
              (vxapiResp.data.tweetURL||''),
              (vxapiResp.data.text||''),
              '',
              vxapiResp.data.date_epoch * 1000);
          messageSender(message, spoiler, iconURL, vxapitwitterEmbed, vxapitweetinfo);
          embedSuppresser(message);
        }
      } else {
        throw new Error('vxtwitter api timeout: '+ tid);
      }
    } catch {
      // throw new Error('fxvxtwitter api error: '+ tid);
      try {
        // console.log('fx vx twitter api error: '+ tid);
        backupLinkSender(message, spoiler, `https://fxtwitter.com/i/status/${result[1]}`);
        embedSuppresser(message);
      } catch {
        console.log('twitter error: '+ message.guild.name);
      }
    }
  }
};
