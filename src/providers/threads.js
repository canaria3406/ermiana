import { fallbackPreview } from './helpers.js';

const THREADS_ORIGIN = String.raw`https:\/\/(?:www\.)?threads\.(?:com|net)`;
const THREADS_ID = String.raw`[A-Za-z0-9_-]+`;

export const threadsProvider = {
  id: 'threads',
  patterns: [
    new RegExp(String.raw`${THREADS_ORIGIN}\/@[A-Za-z0-9_.]+\/post\/${THREADS_ID}\/?`, 'i'),
    new RegExp(String.raw`${THREADS_ORIGIN}\/share\/${THREADS_ID}\/?`, 'i'),
    new RegExp(String.raw`${THREADS_ORIGIN}\/t\/${THREADS_ID}\/?`, 'i'),
  ],
  async resolve({ match, services }) {
    const previewUrl = await services.threadsPreviewSite.getPreviewUrl(match[0]);
    return previewUrl ? fallbackPreview(match[0], previewUrl) : null;
  },
};
