export const ICONS = Object.freeze({
  twitter: 'https://ermiana.canaria.cc/pic/twitter.png',
  bluesky: 'https://ermiana.canaria.cc/pic/bluesky.png',
  pixiv: 'https://ermiana.canaria.cc/pic/pixiv.png',
  nhentai: 'https://ermiana.canaria.cc/pic/nhentai.png',
  bahamut: 'https://ermiana.canaria.cc/pic/baha.png',
  ehentai: 'https://ermiana.canaria.cc/pic/eh.png',
  plurk: 'https://ermiana.canaria.cc/pic/plurk.png',
  pchome: 'https://ermiana.canaria.cc/pic/pchome.png',
  misskey: 'https://ermiana.canaria.cc/pic/misskey.png',
  bilibili: 'https://ermiana.canaria.cc/pic/bilibili.png',
  ptt: 'https://ermiana.canaria.cc/pic/ptt.png',
});

export function truncate(value, maxLength) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

export function uniqueUrls(values, limit = 4) {
  return [...new Set(values.filter((value) => typeof value === 'string' && /^https?:\/\//.test(value)))].slice(0, limit);
}

export function engagement({ replies = 0, reposts = 0, likes = 0 } = {}) {
  return `💬${replies ?? 0} 🔁${reposts ?? 0} ❤️${likes ?? 0}`;
}

export function createPreview({ canonicalUrl, iconUrl, embed, images = [], media = [], content, pagination, suppressOriginal = true }) {
  const normalizedImages = uniqueUrls(images);
  return {
    canonicalUrl,
    iconUrl,
    embed,
    images: normalizedImages,
    media: uniqueUrls(media, 4),
    content,
    pagination,
    suppressOriginal,
  };
}

export function fallbackPreview(canonicalUrl, content = canonicalUrl) {
  return createPreview({ canonicalUrl, content, suppressOriginal: true });
}

export function proxyPixivUrl(url) {
  return typeof url === 'string' ? url.replace('i.pximg.net', 'pixiv.canaria.cc') : url;
}
