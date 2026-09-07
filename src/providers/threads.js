import { fallbackPreview } from './helpers.js';

const PREVIEW_CRAWLER_USER_AGENT =
  'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com) GoogleBot (+https://github.com/)';

const THREADS_PATTERN = /https:\/\/(?:www\.)?threads\.(?:com|net)\/@[A-Za-z0-9_.]+\/post\/[A-Za-z0-9_-]+/i;
const THREADS_SHARE_PATTERN = /https:\/\/(?:www\.)?threads\.(?:com|net)\/share\/[A-Za-z0-9_-]+\/?/i;

async function resolveShareUrl(url, http) {
  return http.request(url, {
    method: 'GET',
    timeoutMs: 5000,
    retries: 1,
    redirect: 'manual',
    consumeErrorResponses: true,
    headers: { 'user-agent': PREVIEW_CRAWLER_USER_AGENT },
  }, async (response) => {
    await response.body?.cancel();
    if (![301, 302, 303, 307, 308].includes(response.status)) return null;
    const location = response.headers.get('location');
    if (!location) return null;
    let target;
    try {
      target = new URL(location, url);
    } catch {
      return null;
    }
    const post = THREADS_PATTERN.exec(target.href);
    if (!post || post.index !== 0 || post[0] !== `${target.origin}${target.pathname}`.replace(/\/$/, '')) return null;
    return post[0];
  });
}

export const threadsProvider = {
  id: 'threads',
  patterns: [THREADS_PATTERN, THREADS_SHARE_PATTERN],
  async resolve({ match, http, services }) {
    const originalUrl = THREADS_SHARE_PATTERN.test(match[0])
      ? await resolveShareUrl(match[0], http)
      : match[0];
    if (!originalUrl) return null;
    const previewUrl = await services.threadsPreviewSite.getPreviewUrl(originalUrl);
    return previewUrl ? fallbackPreview(originalUrl, previewUrl) : null;
  },
};
