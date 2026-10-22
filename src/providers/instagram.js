import { rewrittenLinkPreview } from './helpers.js';

const MEDIA_PATH = String.raw`(?:[A-Za-z0-9_.]+\/)?(?:p|reels?)\/[A-Za-z0-9_-]+(?:\/[1-9][0-9]*)?\/?`;
const STORY_PATH = String.raw`stories\/[A-Za-z0-9_.]+\/[0-9]+\/?`;
const INSTAGRAM_ORIGIN = String.raw`https:\/\/(?:www\.)?instagram\.com\/`;

export const instagramProvider = {
  id: 'instagram',
  patterns: [
    new RegExp(`${INSTAGRAM_ORIGIN}${MEDIA_PATH}`, 'i'),
    new RegExp(`${INSTAGRAM_ORIGIN}${STORY_PATH}`, 'i'),
  ],
  async resolve({ match, services }) {
    return rewrittenLinkPreview(services.instagramPreviewSite, match[0]);
  },
};
