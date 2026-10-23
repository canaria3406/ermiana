import { rewrittenLinkPreview } from './helpers.js';

const SHORT_CODE = /^[a-zA-Z0-9]{1,32}$/;
const SHORT_LINK_HOSTS = new Set(['vm.tiktok.com', 'vt.tiktok.com']);
const CANONICAL_PATH = /^\/@[a-zA-Z0-9_.-]*\/video\/[0-9]+\/?$/;

async function redirectLocation(http, shortUrl) {
  return http.request(shortUrl, {
    method: 'GET',
    redirect: 'manual',
    consumeErrorResponses: true,
    retries: 0,
  }, async (response) => {
    try {
      return {
        status: response.status,
        location: response.headers?.get?.('location'),
      };
    } finally {
      await response.body?.cancel?.().catch(() => {});
    }
  });
}

function canonicalRedirect(location) {
  let destination;
  try {
    destination = new URL(location);
  } catch {
    return null;
  }
  if (destination.origin !== 'https://www.tiktok.com'
    || destination.username
    || destination.password
    || !CANONICAL_PATH.test(destination.pathname)) return null;
  return `https://www.tiktok.com${destination.pathname.replace(/\/$/, '')}`;
}

async function expandShortLink(host, code, { http }) {
  if (!SHORT_LINK_HOSTS.has(host) || !SHORT_CODE.test(code) || !http) return null;
  const redirect = await redirectLocation(http, `https://${host}/${code}/`);
  if (redirect.status < 300 || redirect.status >= 400) {
    throw new Error(`TikTok short link expansion returned HTTP ${redirect.status}`);
  }
  if (!redirect.location) throw new Error('TikTok short link redirect has no Location header');
  return canonicalRedirect(redirect.location);
}

export const tiktokProvider = {
  id: 'tiktok',
  patterns: [
    /https:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9_.-]*\/video\/([0-9]+)/i,
    /https:\/\/(?:vm|vt)\.tiktok\.com\/([a-zA-Z0-9]{1,32})(?![a-zA-Z0-9])\/?/i,
  ],
  async resolve({ match, services }) {
    const matchedUrl = new URL(match[0]);
    const host = matchedUrl.hostname.toLowerCase();
    const canonicalUrl = SHORT_LINK_HOSTS.has(host)
      ? await expandShortLink(host, match[1], services)
      : match[0];
    return canonicalUrl
      ? rewrittenLinkPreview(services.tiktokPreviewSite, canonicalUrl)
      : null;
  },
};
