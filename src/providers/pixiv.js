import { createPreview, fallbackPreview, ICONS, proxyPixivUrl, truncate } from './helpers.js';

const DEFAULT_PROFILE_IMAGE_URL = 'https://s.pximg.net/common/images/no_profile_s.png';

function profileImageUrl(artwork, id) {
  const userIllusts = artwork.userIllusts;
  if (!userIllusts || typeof userIllusts !== 'object') return DEFAULT_PROFILE_IMAGE_URL;
  const url = userIllusts[id]?.profileImageUrl
    ?? Object.values(userIllusts).find((illust) => illust?.profileImageUrl)?.profileImageUrl;
  return typeof url === 'string' && /^https?:\/\//.test(url)
    ? proxyPixivUrl(url)
    : DEFAULT_PROFILE_IMAGE_URL;
}

export const pixivProvider = {
  id: 'pixiv',
  patterns: [
    /https:\/\/www\.pixiv\.net\/artworks\/([0-9]+)/i,
    /https:\/\/www\.pixiv\.net\/en\/artworks\/([0-9]+)/i,
  ],
  ttlSeconds: 7200,
  cacheKey: (match) => match[1],
  async resolve({ match, http, logger }) {
    const id = match[1];
    const canonicalUrl = `https://www.pixiv.net/artworks/${id}`;
    try {
      const data = await http.getJson(`https://www.pixiv.net/ajax/illust/${id}`);
      const artwork = data?.body;
      if (!artwork || data.error) throw new Error(data.message || 'Pixiv response has no artwork');

      let firstImage = proxyPixivUrl(artwork.urls?.regular);
      if (!firstImage && artwork.userIllusts?.[id]?.url) {
        const source = artwork.userIllusts[id].url.match(/\/img\/.*?_p0/)?.[0];
        if (source) firstImage = `https://pixiv.canaria.cc/img-master${source}_master1200.jpg`;
      }
      const pageCount = Math.max(1, Number(artwork.pageCount) || 1);
      const images = firstImage ? [firstImage] : [];
      const tags = (artwork.tags?.tags ?? []).slice(0, 20).map(({ tag }) => `[${tag}](https://www.pixiv.net/tags/${encodeURIComponent(tag)}/artworks)`).join(', ');
      const fields = [];
      if (tags) fields.push({ name: '標籤', value: truncate(tags, 1024) });
      return createPreview({
        canonicalUrl,
        iconUrl: ICONS.pixiv,
        embed: {
          color: 0x0096fa,
          author: artwork.userName ? {
            name: truncate(artwork.userName, 256),
            iconUrl: profileImageUrl(artwork, id),
            url: artwork.userId ? `https://www.pixiv.net/users/${artwork.userId}` : undefined,
          } : undefined,
          title: truncate(artwork.title, 256),
          url: canonicalUrl,
          description: truncate(artwork.extraData?.meta?.twitter?.description, 300),
          image: images[0],
          fields,
          timestamp: artwork.createDate,
          footer: `⭐${artwork.likeCount ?? 0} ❤️${artwork.bookmarkCount ?? 0} 💬${artwork.commentCount ?? 0}`,
        },
        images,
        pagination: firstImage && pageCount > 1 && /_p0(?=[._])/.test(firstImage)
          ? { type: 'pixiv-url', totalPages: pageCount }
          : undefined,
      });
    } catch (error) {
      logger?.warn({ id, err: error }, 'Pixiv API failed; using proxy preview');
      return fallbackPreview(canonicalUrl, `https://www.phixiv.net/artworks/${id}`);
    }
  },
};
