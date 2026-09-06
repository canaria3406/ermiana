import { RewritePreviewSiteService } from './rewrite-preview-site.js';

const SITE = Object.freeze({
  hostname: 'threads.canaria.cc',
  rewrite: (originalUrl) => originalUrl.replace(
    /^https:\/\/(?:www\.)?threads\.(?:com|net)/i,
    'https://threads.canaria.cc',
  ),
  probeUrl: (candidateUrl) => candidateUrl,
  originHosts: Object.freeze(['threads.canaria.cc']),
});

export class ThreadsPreviewSiteService extends RewritePreviewSiteService {
  constructor() {
    super({ sites: Object.freeze([SITE]) });
  }
}
