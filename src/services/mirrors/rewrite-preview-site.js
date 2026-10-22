export class RewritePreviewSiteService {
  constructor({ sites }) {
    this.sites = sites;
  }

  async getPreviewUrls(originalUrl) {
    const [preferred, fallback] = this.sites;
    return {
      previewUrl: preferred?.rewrite(originalUrl) ?? null,
      fallbackUrl: fallback?.rewrite(originalUrl) ?? null,
    };
  }

  async getPreviewUrl(originalUrl) {
    return (await this.getPreviewUrls(originalUrl)).previewUrl;
  }
}
