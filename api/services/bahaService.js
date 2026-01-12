import axios from 'axios';
import * as cheerio from 'cheerio';
import Conf from 'conf';
import { reloadBahaTK } from '../../src/utils/reloadBahaTK.js';

export class BahaService {
  static async getPostData(postId) {
    try {
      const ermianaBH = new Conf({ projectName: 'ermianaJS' });

      if (!ermianaBH.get('BAHAENUR') || !ermianaBH.get('BAHARUNE')) {
        await reloadBahaTK();
      }

      const BAHAENUR = ermianaBH.get('BAHAENUR');
      const BAHARUNE = ermianaBH.get('BAHARUNE');

      const response = await axios.request({
        url: `https://forum.gamer.com.tw/${postId}`,
        method: 'get',
        headers: { Cookie: `BAHAENUR=${BAHAENUR}; BAHARUNE=${BAHARUNE};` },
        timeout: 5000,
      });

      if (response.status !== 200) {
        throw new Error('Failed to fetch Baha data');
      }

      const $ = cheerio.load(response.data);

      return {
        success: true,
        data: {
          id: postId,
          url: `https://forum.gamer.com.tw/${postId}`,
          title: $('meta[property=og:title]').attr('content') || '巴哈姆特',
          description: $('meta[property=og:description]').attr('content') || '',
          image: $('meta[property=og:image]').attr('content') || null,
        },
      };
    } catch (error) {
      // Retry with refreshed token
      try {
        await reloadBahaTK();
        const ermianaBH2 = new Conf({ projectName: 'ermianaJS' });
        const BAHAENUR2 = ermianaBH2.get('BAHAENUR');
        const BAHARUNE2 = ermianaBH2.get('BAHARUNE');

        const response2 = await axios.request({
          url: `https://forum.gamer.com.tw/${postId}`,
          method: 'get',
          headers: { Cookie: `BAHAENUR=${BAHAENUR2}; BAHARUNE=${BAHARUNE2};` },
          timeout: 5000,
        });

        const $ = cheerio.load(response2.data);

        return {
          success: true,
          data: {
            id: postId,
            url: `https://forum.gamer.com.tw/${postId}`,
            title: $('meta[property=og:title]').attr('content') || '巴哈姆特',
            description: $('meta[property=og:description]').attr('content') || '',
            image: $('meta[property=og:image]').attr('content') || null,
          },
        };
      } catch (retryError) {
        console.error('Baha API Error:', retryError.message);
        throw {
          statusCode: retryError.response?.status || 500,
          message: retryError.message || 'Failed to fetch Baha data',
          code: 'BAHA_API_ERROR',
        };
      }
    }
  }
}
