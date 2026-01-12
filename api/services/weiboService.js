import axios from 'axios';
import * as cheerio from 'cheerio';

export async function getWeiboData(statusId) {
  try {
    const weiboResp = await axios.request({
      method: 'get',
      url: 'https://m.weibo.cn/statuses/show',
      params: {
        id: statusId,
      },
      timeout: 2000,
    });

    if (weiboResp.status === 200 && weiboResp.data && weiboResp.data.data) {
      const data = weiboResp.data.data;

      // Parse text content (remove HTML tags)
      let text = '';
      if (data.text) {
        const $ = cheerio.load(data.text);
        text = $.text();
      }

      // Process images - convert to proxy URLs
      const images = [];
      if (data.pics && Array.isArray(data.pics)) {
        data.pics.forEach((pic) => {
          if (pic.large && pic.large.url) {
            const match = pic.large.url.match(/https:\/\/(\w+)\.sinaimg\.cn\/(.+)/);
            if (match) {
              images.push(`https://weibo-pic.canaria.cc/${match[1]}/${match[2]}`);
            }
          }
        });
      }

      return {
        author: {
          name: data.user?.screen_name || 'Unknown',
          id: data.user?.id || '',
        },
        text,
        images,
        stats: {
          comments: data.comments_count || 0,
          reposts: data.reposts_count || 0,
          likes: data.attitudes_count || 0,
        },
        url: `https://m.weibo.cn/detail/${statusId}`,
        createdAt: data.created_at,
      };
    }

    throw new Error('Weibo API returned invalid data');
  } catch (error) {
    return {
      error: error.message,
      fallbackUrl: `https://m.weibo.cn/detail/${statusId}`,
    };
  }
}
