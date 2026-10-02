import { RewritePreviewSiteService } from './rewrite-preview-site.js';

const SITE = Object.freeze({
  hostname: 'vxthreads.com',
  rewrite: (originalUrl) => originalUrl.replace(
    /^https:\/\/(?:www\.)?threads\.(?:com|net)/i,
    'https://www.vxthreads.com',
  ),
  probeUrl: (candidateUrl) => candidateUrl,
  originHosts: Object.freeze(['vxthreads.com', 'www.vxthreads.com']),
});

export class ThreadsPreviewSiteService extends RewritePreviewSiteService {
  constructor() {
    super({ sites: Object.freeze([SITE]) });
  }
}
