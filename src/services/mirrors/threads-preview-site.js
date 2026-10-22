import { RewritePreviewSiteService } from './rewrite-preview-site.js';

function site(hostname, baseUrl) {
  return Object.freeze({
    hostname,
    rewrite: (originalUrl) => originalUrl.replace(
      /^https:\/\/(?:www\.)?threads\.(?:com|net)/i,
      baseUrl,
    ),
    probeUrl: (candidateUrl) => candidateUrl,
    originHosts: Object.freeze([hostname, `www.${hostname}`]),
  });
}

const SITES = Object.freeze([
  site('vxthreads.com', 'https://www.vxthreads.com'),
  site('fixthreads.seria.moe', 'https://fixthreads.seria.moe'),
]);

export class ThreadsPreviewSiteService extends RewritePreviewSiteService {
  constructor() {
    super({ sites: SITES });
  }
}
