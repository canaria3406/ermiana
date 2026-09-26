import { fallbackPreview } from './helpers.js';

const OPUS_PATTERN = /https:\/\/www\.bilibili\.com\/opus\/(?<opusId>[0-9]+)/i;
const VIDEO_PATTERN = /https:\/\/www\.bilibili\.com\/video\/(?<bvid>BV[A-Za-z0-9]{10})(?![A-Za-z0-9])\/?(?:\?(?<query>[^\s<>]*))?/;
const SHORT_PATTERN = /https:\/\/(?:www\.)?b23\.tv\/(?<shortCode>[A-Za-z0-9_-]+)\/?(?:\?[^\s<>()]*)?(?![A-Za-z0-9_/-])/i;

function positivePage(query) {
  const value = new URLSearchParams(query ?? '').get('p');
  return value && /^[1-9][0-9]*$/.test(value) ? value : '1';
}

function previewSiteUrl(match) {
  if (match.groups?.bvid) {
    return `https://www.vxbilibili.com/video/${match.groups.bvid}?p=${positivePage(match.groups.query)}`;
  }
  return `https://www.vxbilibili.com/opus/${match.groups.opusId}`;
}

export const bilibiliProvider = {
  id: 'bilibili',
  patterns: [OPUS_PATTERN, VIDEO_PATTERN, SHORT_PATTERN],
  async resolve({ match, services }) {
    if (match.groups?.shortCode) {
      const resolved = await services.bilibiliPreviewSite.resolveShortUrl(match[0]);
      return resolved ? fallbackPreview(resolved.canonicalUrl, resolved.previewUrl) : null;
    }
    const candidateUrl = previewSiteUrl(match);
    const previewUrl = await services.bilibiliPreviewSite.getPreviewUrl(candidateUrl);
    return previewUrl ? fallbackPreview(match[0], previewUrl) : null;
  },
};
