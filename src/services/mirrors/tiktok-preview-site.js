const PREVIEW_SITE = 'tnktok.com';
const FALLBACK_SITE = 'tiktokez.com';

export class TikTokPreviewSiteService {
  async getPreviewUrls(originalUrl) {
    return {
      previewUrl: originalUrl.replace('tiktok.com', PREVIEW_SITE),
      fallbackUrl: originalUrl.replace('tiktok.com', FALLBACK_SITE),
    };
  }

  async getPreviewUrl(originalUrl) {
    return (await this.getPreviewUrls(originalUrl)).previewUrl;
  }
}
