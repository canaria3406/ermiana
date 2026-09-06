import { RewritePreviewSiteService } from './rewrite-preview-site.js';

function site(hostname) {
  return Object.freeze({
    hostname,
    rewrite: (originalUrl) => originalUrl.replace(/instagram\.com/i, hostname),
    probeUrl: (candidateUrl) => candidateUrl,
    originHosts: Object.freeze([hostname, `www.${hostname}`]),
  });
}

const SITES = Object.freeze([
  site('oginstagram.com'),
  site('vxinstagram.com'),
]);

export class InstagramPreviewSiteService extends RewritePreviewSiteService {
  constructor() {
    super({ sites: SITES });
  }
}
