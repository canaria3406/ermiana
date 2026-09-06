import { fallbackPreview } from './helpers.js';

const FACEBOOK_ORIGIN = String.raw`https:\/\/(?:www\.|m\.)?facebook\.com`;
const FACEBOOK_ID = String.raw`[A-Za-z0-9_-]+`;
const FACEBOOK_DIRECT_SHARE_ID = String.raw`[A-Za-z0-9_-]{3,}`;

export const facebookProvider = {
  id: 'facebook',
  patterns: [
    new RegExp(String.raw`${FACEBOOK_ORIGIN}\/share\/(?:p|v|r)\/${FACEBOOK_ID}\/?`, 'i'),
    new RegExp(String.raw`${FACEBOOK_ORIGIN}\/share\/${FACEBOOK_DIRECT_SHARE_ID}\/?`, 'i'),
    new RegExp(String.raw`${FACEBOOK_ORIGIN}\/reel\/${FACEBOOK_ID}\/?`, 'i'),
  ],
  async resolve({ match, services }) {
    const resolved = await services.facebookPreviewSite.resolve(match[0]);
    return resolved ? fallbackPreview(resolved.canonicalUrl, resolved.previewUrl) : null;
  },
};
