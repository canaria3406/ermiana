import axios from 'axios';

export class PixivService {
  static async getIllustData(illustId) {
    try {
      const response = await axios.request({
        method: 'get',
        url: `https://www.pixiv.net/ajax/illust/${illustId}`,
        timeout: 2500,
      });

      if (response.status !== 200 || !response.data.body) {
        throw new Error('Failed to fetch Pixiv data');
      }

      const illust = response.data.body;

      // Extract tags
      const tags = illust.tags.tags.map((tag) => ({
        name: tag.tag,
        translatedName: tag.translation?.en || null,
      }));

      // Process image URLs
      const getProxiedUrl = (url) => url ? url.replace('i.pximg.net', 'pixiv.canaria.cc') : null;

      const images = [];
      const pageCount = illust.pageCount || 1;

      // Try regular URLs first
      if (illust.urls.regular && /i\.pximg\.net/.test(illust.urls.regular)) {
        const baseUrl = getProxiedUrl(illust.urls.regular);
        for (let i = 0; i < pageCount; i++) {
          images.push(baseUrl.replace('_p0', `_p${i}`));
        }
      } else if (illust.userIllusts[illustId]?.url && /p0/.test(illust.userIllusts[illustId]?.url)) {
        // Try userIllusts as backup
        const userIllustsRegex = /\/img\/.*p0/;
        const match = illust.userIllusts[illustId].url.match(userIllustsRegex);
        if (match) {
          const baseUrl = 'https://pixiv.canaria.cc/img-master' + match[0] + '_master1200.jpg';
          for (let i = 0; i < pageCount; i++) {
            images.push(baseUrl.replace('_p0', `_p${i}`));
          }
        }
      } else {
        // Try pixiv.cat API as last resort
        try {
          const catResp = await axios.request({
            method: 'post',
            url: 'https://api.pixiv.cat/v1/generate',
            data: {
              p: `https://www.pixiv.net/artworks/${illustId}`,
            },
            timeout: 2500,
          });

          if (catResp.data?.original_url) {
            images.push(getProxiedUrl(catResp.data.original_url));
          } else if (catResp.data?.original_urls) {
            catResp.data.original_urls.forEach((url) => {
              images.push(getProxiedUrl(url));
            });
          }
        } catch (catError) {
          console.error('Pixiv.cat backup API also failed:', catError.message);
        }
      }

      // Extract description
      const description = illust.extraData?.meta?.twitter?.description || illust.description || '';

      return {
        success: true,
        data: {
          id: illustId,
          title: illust.title,
          description: description.substring(0, 300),
          url: `https://www.pixiv.net/artworks/${illustId}`,
          author: {
            id: illust.userId,
            name: illust.userName,
            profileUrl: `https://www.pixiv.net/users/${illust.userId}`,
          },
          images,
          pageCount,
          stats: {
            bookmarks: illust.bookmarkCount,
            views: illust.viewCount,
            likes: illust.likeCount,
          },
          tags,
          createdAt: illust.createDate,
          isR18: illust.tags.tags.some((tag) => tag.tag === 'R-18'),
          fallbackUrl: `https://www.phixiv.net/artworks/${illustId}`,
        },
      };
    } catch (error) {
      console.error('Pixiv API Error:', error.message);
      // Return fallback URL
      return {
        success: true,
        data: {
          id: illustId,
          url: `https://www.pixiv.net/artworks/${illustId}`,
          fallbackUrl: `https://www.phixiv.net/artworks/${illustId}`,
          error: 'API unavailable, use fallback URL',
        },
      };
    }
  }
}
