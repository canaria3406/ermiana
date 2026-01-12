import axios from 'axios';

export class BilibiliService {
  static async getOpusData(opusId) {
    try {
      const response = await axios.request({
        url: `https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=${opusId}`,
        method: 'get',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Accept-Language': 'zh-TW,zh;q=0.8,en-US;q=0.5,en;q=0.3',
          'Connection': 'keep-alive',
          'Host': 'api.bilibili.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
        },
        timeout: 2500,
      });

      if (response.status !== 200 || !response.data.data) {
        throw new Error('Failed to fetch Bilibili data');
      }

      const item = response.data.data.item;
      const type = item.type;

      const result = {
        id: opusId,
        url: `https://www.bilibili.com/opus/${opusId}`,
        type,
        author: {
          mid: item.modules.module_author.mid?.toString(),
          name: item.modules.module_author.name?.toString(),
          face: item.modules.module_author.face,
        },
      };

      if (type === 'DYNAMIC_TYPE_DRAW') {
        // Image post
        const pics = item.modules.module_dynamic.major?.draw?.items || [];
        result.description = item.modules.module_dynamic.desc?.text || '';
        result.images = pics.map((pic) => pic.src);
      } else if (type === 'DYNAMIC_TYPE_ARTICLE') {
        // Article post
        const article = item.modules.module_dynamic.major.article;
        result.title = article?.title || '';
        result.description = article?.desc || '';
        result.images = article?.covers || [];
      } else {
        // Other types
        result.description = item.modules.module_dynamic.desc?.text || '';
        result.images = [];
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Bilibili API Error:', error.message);
      throw {
        statusCode: error.response?.status || 500,
        message: error.message || 'Failed to fetch Bilibili data',
        code: 'BILIBILI_API_ERROR',
      };
    }
  }
}
