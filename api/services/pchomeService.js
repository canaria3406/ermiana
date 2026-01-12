import axios from 'axios';
import * as cheerio from 'cheerio';

export class PchomeService {
  static async getProductData(productId) {
    try {
      // Fetch product basic info
      const url1 = `https://ecapi-cdn.pchome.com.tw/ecshop/prodapi/v2/prod/${productId}&fields=Name,Nick,Price,Pic&_callback=jsonp_prod`;
      const resp1 = await axios.request({
        method: 'get',
        url: url1,
        timeout: 2500,
      });

      if (resp1.status !== 200) {
        throw new Error('Failed to fetch PChome basic data');
      }

      // Parse product info from JSONP response
      const nickMatch = resp1.data.match(/"Nick":"(.*?)",/);
      const priceMatch = resp1.data.match(/"P":(\d+)/);
      const picMatch = resp1.data.match(/"B":"(.*?)",/);

      if (!nickMatch || !priceMatch || !picMatch) {
        throw new Error('Failed to parse PChome product data');
      }

      const $ = cheerio.load(unescape(nickMatch[1].replace(/\\u/g, '%u').replace(/\\/g, '')));
      const nick = $.text();
      const price = unescape(priceMatch[1].replace(/\\u/g, '%u'));
      const picPath = unescape(picMatch[1].replace(/\\u/g, '%u')).replace(/\\/g, '');
      const picUrl = 'https://img.pchome.com.tw/cs' + picPath;

      // Fetch product description
      const url2 = `https://ecapi-cdn.pchome.com.tw/cdn/ecshop/prodapi/v2/prod/${productId}/desc&fields=Meta,SloganInfo&_callback=jsonp_desc`;
      const resp2 = await axios.request({
        method: 'get',
        url: url2,
        timeout: 2500,
      });

      let brand = '';
      let slogan = '';

      try {
        const brandMatch = resp2.data.match(/BrandNames":\[(.*?)\]/);
        if (brandMatch) {
          brand = unescape(brandMatch[1].replace(/\\u/g, '%u'))
              .replace(/","/g, '_')
              .replace(/^"|"$/g, '');
        }
      } catch {}

      try {
        const sloganMatch = resp2.data.match(/SloganInfo":\[(.*?)\]/);
        if (sloganMatch) {
          slogan = unescape(sloganMatch[1].replace(/\\u/g, '%u'))
              .replace(/","/g, '\n')
              .replace(/^"|"$/g, '');
        }
      } catch {}

      return {
        success: true,
        data: {
          id: productId,
          url: `https://24h.pchome.com.tw/prod/${productId}`,
          title: nick,
          description: slogan,
          image: picUrl,
          price: price,
          brand: brand,
        },
      };
    } catch (error) {
      console.error('PChome API Error:', error.message);
      throw {
        statusCode: error.response?.status || 500,
        message: error.message || 'Failed to fetch PChome data',
        code: 'PCHOME_API_ERROR',
      };
    }
  }
}
