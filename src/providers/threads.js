import { fallbackPreview } from './helpers.js';

const THREADS_PATTERN = /https:\/\/(?:www\.)?threads\.(?:com|net)\/@[A-Za-z0-9_.]+\/post\/[A-Za-z0-9_-]+/i;

export const threadsProvider = {
  id: 'threads',
  patterns: [THREADS_PATTERN],
  async resolve({ match, services }) {
    const previewUrl = await services.threadsPreviewSite.getPreviewUrl(match[0]);
    return previewUrl ? fallbackPreview(match[0], previewUrl) : null;
  },
};
