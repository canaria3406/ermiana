const PREVIEW_SITE = 'tnktok.com';

export class TikTokPreviewSiteService {
  async getPreviewUrl(originalUrl) {
    return originalUrl.replace('tiktok.com', PREVIEW_SITE);
  }
}
