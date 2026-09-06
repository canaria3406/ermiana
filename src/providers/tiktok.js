import { fallbackPreview } from './helpers.js';

export const tiktokProvider = {
  id: 'tiktok',
  patterns: [/https:\/\/www\.tiktok\.com\/@[a-zA-Z0-9_.-]+\/video\/([0-9]+)/i],
  async resolve({ match, services }) {
    const previewUrl = await services.tiktokPreviewSite.getPreviewUrl(match[0]);
    return previewUrl ? fallbackPreview(match[0], previewUrl) : null;
  },
};
