import { createPreview, fallbackPreview, ICONS, proxyPixivUrl, truncate } from './helpers.js';

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
      const fields = [
        { name: '作者', value: `[${artwork.userName}](https://www.pixiv.net/users/${artwork.userId})`, inline: true },
        { name: '收藏', value: String(artwork.bookmarkCount ?? 0), inline: true },
      ];
      if (tags) fields.push({ name: '標籤', value: truncate(tags, 1024) });
      return createPreview({
        canonicalUrl,
        iconUrl: ICONS.pixiv,
        embed: {
          color: 0x0096fa,
          title: truncate(artwork.title, 256),
          url: canonicalUrl,
          description: truncate(artwork.extraData?.meta?.twitter?.description, 300),
          image: images[0],
          fields,
          footer: 'ermiana',
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
