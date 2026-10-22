import { rewrittenLinkPreview } from './helpers.js';

export const tiktokProvider = {
  id: 'tiktok',
  patterns: [/https:\/\/www\.tiktok\.com\/@[a-zA-Z0-9_.-]+\/video\/([0-9]+)/i],
  async resolve({ match, services }) {
    return rewrittenLinkPreview(services.tiktokPreviewSite, match[0]);
  },
};
