import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
// import Conf from 'conf';
// import { reloadTwitterTK } from '../common/reloadTwitterTK.js';
import { messageSender } from '../common/messageSender.js';
import { embedSuppresser } from '../common/embedSuppresser.js';

export async function handleTwitterRegex( result, message ) {
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
        if (!message.embeds[0]) {
          try {
            await message.channel.sendTyping();
          } catch {}
          messageSender(message.channel, fxapitwitterEmbed, fxapitweetinfo);
        } else if (fxapiResp.data.tweet.media.mosaic && fxapiResp.data.tweet.media.mosaic.type === 'mosaic_photo') {
          try {
            await message.channel.sendTyping();
          } catch {}
          messageSender(message.channel, fxapitwitterEmbed, fxapitweetinfo);
          embedSuppresser(message);
        }
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
            } else if (vxapiRespImage.length > 1) {
              vxapitwitterEmbed.setImage('https://convert.vxtwitter.com/rendercombined.jpg?imgs=' + vxapiRespImage.join(','));
            }
          }
        } catch {}

        const vxapitweetinfo = '💬' + vxapiResp.data.replies.toString() + ' 🔁' + vxapiResp.data.retweets.toString() + ' ❤️' + vxapiResp.data.likes.toString();

        try {
          if (!message.embeds[0]) {
            try {
              await message.channel.sendTyping();
            } catch {}
            messageSender(message.channel, vxapitwitterEmbed, vxapitweetinfo);
          } else if (vxapiResp.data.mediaURLs.length > 1) {
            try {
              await message.channel.sendTyping();
            } catch {}
            messageSender(message.channel, vxapitwitterEmbed, vxapitweetinfo);
            embedSuppresser(message);
          }
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
      /*
      try {
        // use self-build vanilla twitter api
        const ermianaTwitter = new Conf({ projectName: 'ermianaJS' });
        if (!ermianaTwitter.get('parameter_token')) {
          await reloadTwitterTK();
        }
        const parameterToken = ermianaTwitter.get('parameter_token');
        const headerXcsrfToken = ermianaTwitter.get('header_x_csrf_token');
        const headerAuthorization = ermianaTwitter.get('header_authorization');
        const headerCookie = ermianaTwitter.get('header_cookie');

        const headers = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Host': 'twitter.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0',
      */
      //    'Accept': '*/*',
      /*    'Accept-Language': 'zh-TW,zh;q=0.8,en-US;q=0.5,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate, br',
          'content-type': 'application/json',
          'x-twitter-auth-type': 'OAuth2Session',
          'x-csrf-token': headerXcsrfToken,
          'x-twitter-client-language': 'zh-tw',
          'x-twitter-active-user': 'yes',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'authorization': headerAuthorization,
          'Connection': 'keep-alive',
          'Cookie': headerCookie,
          'TE': 'trailers',
        };

        const url = 'https://twitter.com/i/api/graphql/' + parameterToken + '/TweetDetail?variables=%7B%22focalTweetId%22%3A%22' + tid + '%22%2C%22with_rux_injections%22%3Afalse%2C%22includePromotedContent%22%3Atrue%2C%22withCommunity%22%3Atrue%2C%22withQuickPromoteEligibilityTweetFields%22%3Atrue%2C%22withBirdwatchNotes%22%3Atrue%2C%22withVoice%22%3Atrue%2C%22withV2Timeline%22%3Atrue%7D&features=%7B%22rweb_lists_timeline_redesign_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22tweetypie_unmention_optimization_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C%22view_counts_everywhere_api_enabled%22%3Atrue%2C%22longform_notetweets_consumption_enabled%22%3Atrue%2C%22responsive_web_twitter_article_tweet_consumption_enabled%22%3Afalse%2C%22tweet_awards_web_tipping_enabled%22%3Afalse%2C%22freedom_of_speech_not_reach_fetch_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Atrue%2C%22longform_notetweets_rich_text_read_enabled%22%3Atrue%2C%22longform_notetweets_inline_media_enabled%22%3Atrue%2C%22responsive_web_media_download_video_enabled%22%3Afalse%2C%22responsive_web_enhance_cards_enabled%22%3Afalse%7D&fieldToggles=%7B%22withArticleRichContentState%22%3Afalse%7D';

        const resp = await axios.request({
          method: 'get',
          url: url,
          headers: headers,
          timeout: 2000,
        });

        let result = resp.data.data.threaded_conversation_with_injections_v2.instructions[0].entries[0].content.itemContent?.tweet_results.result;

        if (result.rest_id != tid) {
          resp.data.data.threaded_conversation_with_injections_v2.instructions[0].entries.forEach((entry) => {
            if (entry.content.itemContent?.tweet_results.result.rest_id == tid) {
              result = entry.content.itemContent.tweet_results.result;
            }
          });
        }

        const twitterEmbed = new EmbedBuilder();
        twitterEmbed.setColor(0x1DA1F2);
        twitterEmbed.setAuthor({ name: '@' + result.core.user_results.result.legacy.screen_name, iconURL: result.core.user_results.result.legacy.profile_image_url_https });
        twitterEmbed.setTitle(result.core.user_results.result.legacy.name);
        twitterEmbed.setURL('https://twitter.com/i/status/' + tid);

        try {
          twitterEmbed.setDescription(result.legacy.full_text);
        } catch {}
        try {
          if (result.legacy.extended_entities.media[0].type == 'photo') {
            twitterEmbed.setImage(result.legacy.extended_entities.media[0].media_url_https + '?name=large');
          }
        } catch {}

        const tweetinfo = '💬' + result.legacy.reply_count.toString() + ' 🔁' + result.legacy.retweet_count.toString() + ' ❤️' + result.legacy.favorite_count.toString();

        if (!message.embeds[0]) {
          messageSender(message.channel, twitterEmbed, tweetinfo);
        } else {
          // use vallina embeds
        }

        try {
          if (result.legacy.extended_entities?.media[0].type == 'video' || 'animated_gif') {
            let maxBitrate = -1;
            let maxBitrateUrl = 'error';
            result.legacy.extended_entities.media[0].video_info.variants.forEach((variant) => {
              if (variant.content_type === 'video/mp4' && variant.bitrate > maxBitrate) {
                maxBitrate = variant.bitrate;
                maxBitrateUrl = variant.url;
              }
            });
            message.channel.send('[連結](' + maxBitrateUrl + ')');
          }
        } catch {}
      } catch {
        console.log('vanilla twitter api error: '+ message.guild.name);
      }
      */
    }
  }
};
