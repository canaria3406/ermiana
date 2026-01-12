import axios from 'axios';
import * as cheerio from 'cheerio';

function sanitizeHtmlContent(input) {
  let previous;
  do {
    previous = input;
    input = input.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '');
  } while (input !== previous);
  return input;
}

export class PlurkService {
  static async getPlurkData(plurkId) {
    try {
      const response = await axios.request({
        url: `https://www.plurk.com/p/${plurkId}`,
        method: 'get',
        timeout: 5000,
      });

      if (response.status !== 200) {
        throw new Error('Failed to fetch Plurk data');
      }

      const $ = cheerio.load(response.data);
      const scriptText = $('script').text();

      // Extract data from script
      const rePlurk = scriptText.match(/"replurkers_count": (\d+),/)?.[1] || '0';
      const favPlurk = scriptText.match(/"favorite_count": (\d+),/)?.[1] || '0';
      const respPlurk = scriptText.match(/"response_count": (\d+),/)?.[1] || '0';

      const plurkName = $('.name').text() || '噗浪使用者';
      const plurkContent = sanitizeHtmlContent($('.text_holder').html()) || '';

      const rawPlurkIndex = scriptText.indexOf('content_raw');
      const picPlurk = scriptText.slice(rawPlurkIndex).match(/https:\/\/images\.plurk\.com\/[^\\"\s]+/g) || [];

      const plurkUserId = scriptText.match(/"page_user":\s*{"id":\s*(\d+),/)?.[1] || '17527487';
      const plurkAvatar = scriptText.match(/"avatar":\s*(\d+)/)?.[1] || '79721750';
      const plurkNickName = scriptText.match(/"nick_name":\s*"([^"]+)"/)?.[1] || 'plurkuser';

      return {
        success: true,
        data: {
          id: plurkId,
          url: `https://www.plurk.com/p/${plurkId}`,
          author: {
            id: plurkUserId,
            nickname: plurkNickName,
            displayName: plurkName,
            avatar: `https://avatars.plurk.com/${plurkUserId}-medium${plurkAvatar}.gif`,
          },
          content: plurkContent,
          images: picPlurk,
          stats: {
            responses: parseInt(respPlurk),
            replurks: parseInt(rePlurk),
            favorites: parseInt(favPlurk),
          },
        },
      };
    } catch (error) {
      console.error('Plurk API Error:', error.message);
      throw {
        statusCode: error.response?.status || 500,
        message: error.message || 'Failed to fetch Plurk data',
        code: 'PLURK_API_ERROR',
      };
    }
  }
}
