export class RewritePreviewSiteService {
  constructor({ sites }) {
    this.sites = sites;
  }

  async getPreviewUrl(originalUrl) {
    return this.sites[0]?.rewrite(originalUrl) ?? null;
  }
}
