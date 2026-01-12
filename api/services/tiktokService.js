import axios from 'axios';

export class TiktokService {
  static async getVideoData(videoUrl) {
    // Try tnktok.com first
    try {
      const tnktokUrl = videoUrl.replace(/tiktok\.com/, 'tnktok.com');
      const response = await axios.request({
        url: tnktokUrl,
        method: 'get',
        timeout: 3000,
      });

      if (response.status === 200) {
        return {
          success: true,
          data: {
            originalUrl: videoUrl,
            proxyUrl: tnktokUrl,
            service: 'tnktok',
          },
        };
      } else {
        throw new Error('tnktok failed');
      }
    } catch (tnktokError) {
      // Try tiktokez.com as backup
      try {
        const tiktokezUrl = videoUrl.replace(/tiktok\.com/, 'tiktokez.com');
        const response = await axios.request({
          url: tiktokezUrl,
          method: 'get',
          timeout: 3000,
        });

        if (response.status === 200) {
          return {
            success: true,
            data: {
              originalUrl: videoUrl,
              proxyUrl: tiktokezUrl,
              service: 'tiktokez',
            },
          };
        } else {
          throw new Error('tiktokez failed');
        }
      } catch (tiktokezError) {
        console.error('TikTok API Error (both proxies failed):', tiktokezError.message);
        throw {
          statusCode: 500,
          message: 'All TikTok proxy services failed',
          code: 'TIKTOK_API_ERROR',
        };
      }
    }
  }
}
