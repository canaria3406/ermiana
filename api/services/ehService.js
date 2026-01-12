import axios from 'axios';

export class EhService {
  static async getGalleryData(galleryId, token) {
    const gid = parseInt(galleryId);

    // Helper function to wait based on API rate limit
    const waitForApiWindow = async () => {
      const waitingtime = ((5 - (Math.ceil(new Date().getTime() / 1000) % 5)) % 5) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitingtime));
    };

    // Helper function to translate tag types
    const translateTagType = (tagType) => {
      const translations = {
        'artist': '繪師',
        'character': '角色',
        'cosplayer': 'coser',
        'female': '女性',
        'group': '社團',
        'language': '語言',
        'male': '男性',
        'mixed': '混合',
        'other': '其他',
        'parody': '原作',
        'reclass': '重新分類',
        'temp': '臨時',
      };
      return translations[tagType] || tagType;
    };

    // Helper function to process tags
    const processTags = (rawTags) => {
      const tagMap = new Map();
      rawTags.forEach((element) => {
        const tag = element.split(':');
        const tagList = tagMap.get(tag[0]);
        if (tagList) {
          tagList.push(tag[1]);
        } else {
          tagMap.set(tag[0], [tag[1]]);
        }
      });

      const processedTags = [];
      tagMap.forEach((value, key) => {
        processedTags.push({
          type: key,
          translatedType: translateTagType(key),
          tags: value,
        });
      });

      return processedTags;
    };

    try {
      await waitForApiWindow();

      const response = await axios.request({
        method: 'post',
        url: 'https://api.e-hentai.org/api.php',
        data: {
          method: 'gdata',
          gidlist: [[gid, token]],
          namespace: 1,
        },
        timeout: 2500,
      });

      if (!response.data.gmetadata || response.data.gmetadata.length === 0) {
        throw new Error('No metadata returned from E-Hentai API');
      }

      const metadata = response.data.gmetadata[0];
      const processedTags = processTags(metadata.tags || []);

      return {
        success: true,
        data: {
          id: galleryId,
          token,
          url: `https://e-hentai.org/g/${galleryId}/${token}`,
          exhentaiUrl: `https://exhentai.org/g/${galleryId}/${token}`,
          title: metadata.title,
          titleJpn: metadata.title_jpn || '',
          thumbnail: metadata.thumb,
          category: metadata.category,
          rating: metadata.rating,
          uploader: metadata.uploader,
          posted: metadata.posted,
          filecount: metadata.filecount,
          filesize: metadata.filesize,
          tags: processedTags,
        },
      };
    } catch (error) {
      // Retry once after waiting
      try {
        console.log('E-Hentai API first attempt failed, retrying...');
        await waitForApiWindow();

        const retryResponse = await axios.request({
          method: 'post',
          url: 'https://api.e-hentai.org/api.php',
          data: {
            method: 'gdata',
            gidlist: [[gid, token]],
            namespace: 1,
          },
          timeout: 2500,
        });

        if (!retryResponse.data.gmetadata || retryResponse.data.gmetadata.length === 0) {
          throw new Error('No metadata returned from E-Hentai API on retry');
        }

        const metadata = retryResponse.data.gmetadata[0];
        const processedTags = processTags(metadata.tags || []);

        return {
          success: true,
          data: {
            id: galleryId,
            token,
            url: `https://e-hentai.org/g/${galleryId}/${token}`,
            exhentaiUrl: `https://exhentai.org/g/${galleryId}/${token}`,
            title: metadata.title,
            titleJpn: metadata.title_jpn || '',
            thumbnail: metadata.thumb,
            category: metadata.category,
            rating: metadata.rating,
            uploader: metadata.uploader,
            posted: metadata.posted,
            filecount: metadata.filecount,
            filesize: metadata.filesize,
            tags: processedTags,
          },
        };
      } catch (retryError) {
        console.error('E-Hentai API Error (both attempts failed):', retryError.message);
        throw {
          statusCode: retryError.response?.status || 500,
          message: retryError.message || 'Failed to fetch E-Hentai data after retry',
          code: 'EH_API_ERROR',
        };
      }
    }
  }
}
