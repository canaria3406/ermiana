import axios from 'axios';

export class TwitterService {
  static async getPostData(statusId) {
    // Try fxtwitter first
    try {
      const response = await axios.request({
        method: 'get',
        url: `https://api.fxtwitter.com/i/status/${statusId}`,
        timeout: 2500,
      });

      if (response.status !== 200) {
        throw new Error('fxtwitter api error');
      }

      const tweet = response.data.tweet;

      // Extract quote tweet info with quote media handling
      const quote = tweet.quote ? {
        author: tweet.quote.author?.screen_name,
        text: tweet.quote.text,
        url: tweet.quote.url,
        media: tweet.quote.media ? {
          photos: tweet.quote.media.photos?.map((p) => p.url),
          videos: tweet.quote.media.videos?.map((v) => v.url),
          mosaic: tweet.quote.media.mosaic ? {
            url: (tweet.quote.media.mosaic.formats.jpeg + '?name=large').replace(/\?.*$/, '') + '?name=large',
          } : null,
        } : null,
      } : null;

      // Extract quote media URL for fallback
      const quoteMediaUrl = tweet.quote ?
        (tweet.quote.media?.mosaic ?
          (tweet.quote.media.mosaic.formats.jpeg + '?name=large').replace(/\?.*$/, '') + '?name=large' :
          (tweet.quote.media?.photos ?
            (tweet.quote.media.photos[0].url + '?name=large').replace(/\?.*$/, '') + '?name=large' :
            '')) : '';

      // Extract media
      const media = tweet.media ? {
        photos: tweet.media.photos?.map((p) => ({
          url: (p.url + '?name=large').replace(/\?.*$/, '') + '?name=large',
        })) || [],
        videos: tweet.media.all?.filter((m) => m.type !== 'photo').map((m) => m.url) || [],
        mosaic: tweet.media.mosaic ? {
          url: tweet.media.mosaic.formats.jpeg,
          type: tweet.media.mosaic.type,
        } : null,
      } : null;

      return {
        success: true,
        data: {
          id: statusId,
          author: {
            screenName: tweet.author.screen_name,
            name: tweet.author.name,
            avatarUrl: tweet.author.avatar_url,
          },
          text: tweet.text,
          url: tweet.url,
          createdAt: new Date(tweet.created_timestamp * 1000).toISOString(),
          stats: {
            replies: tweet.replies || 0,
            retweets: tweet.retweets || 0,
            likes: tweet.likes || 0,
          },
          media,
          quote,
          quoteMediaUrl,
          fallbackUrl: `https://fxtwitter.com/i/status/${statusId}`,
          videoDirectUrl: `https://d.vxtwitter.com/i/status/${statusId}`,
        },
      };
    } catch (fxError) {
      // Try vxtwitter as backup
      try {
        const response = await axios.request({
          method: 'get',
          url: `https://api.vxtwitter.com/i/status/${statusId}`,
          timeout: 2500,
        });

        if (response.status !== 200) {
          throw new Error('vxtwitter api error');
        }

        const vxData = response.data;

        // Extract quote info for vxtwitter
        const quote = vxData.qrt ? {
          author: vxData.qrt.user_screen_name,
          text: vxData.qrt.text,
          url: vxData.qrt.tweetURL,
          media: vxData.qrt.media_extended ? {
            photos: vxData.qrt.media_extended.filter((m) => m.type === 'image').map((m) => m.url),
            videos: vxData.qrt.media_extended.filter((m) => m.type !== 'image').map((m) => m.url),
          } : null,
        } : null;

        const quoteMediaUrl = vxData.qrt ?
          (vxData.qrt.combinedMediaUrl ||
            (Array.isArray(vxData.qrt.media_extended) && vxData.qrt.media_extended.length && vxData.qrt.media_extended[0].type === 'image' ?
              vxData.qrt.media_extended[0].url : '')) : '';

        // Extract media from vxtwitter
        const media = Array.isArray(vxData.media_extended) && vxData.media_extended.length ? {
          photos: vxData.media_extended.filter((m) => m.type === 'image').map((m) => ({
            url: (m.url + '?name=large').replace(/\?.*$/, '') + '?name=large',
          })),
          videos: vxData.media_extended.filter((m) => m.type !== 'image').map((m) => m.url),
          combinedUrl: vxData.combinedMediaUrl,
        } : null;

        return {
          success: true,
          data: {
            id: statusId,
            author: {
              screenName: vxData.user_screen_name,
              name: vxData.user_name,
              avatarUrl: vxData.user_profile_image_url,
            },
            text: vxData.text,
            url: vxData.tweetURL,
            createdAt: new Date(vxData.date_epoch * 1000).toISOString(),
            stats: {
              replies: vxData.replies || 0,
              retweets: vxData.retweets || 0,
              likes: vxData.likes || 0,
            },
            media,
            quote,
            quoteMediaUrl,
            fallbackUrl: `https://vxtwitter.com/i/status/${statusId}`,
          },
        };
      } catch (vxError) {
        console.error('Twitter API Error (both fx and vx failed):', vxError.message);
        // Return fallback URL instead of throwing
        return {
          success: true,
          data: {
            id: statusId,
            fallbackUrl: `https://fxtwitter.com/i/status/${statusId}`,
            error: 'API unavailable, use fallback URL',
          },
        };
      }
    }
  }
}
