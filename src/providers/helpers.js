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

export const MAX_DISCORD_STORED_MEDIA = 4;

function sliceWithoutBrokenSurrogate(text, maxLength) {
  let end = Math.max(0, maxLength);
  const lastCodeUnit = text.charCodeAt(end - 1);
  if (lastCodeUnit >= 0xD800 && lastCodeUnit <= 0xDBFF) end -= 1;
  return text.slice(0, end);
}

export function truncate(value, maxLength, suffix = '…') {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  if (text.length <= maxLength) return text;
  if (maxLength <= suffix.length) return sliceWithoutBrokenSurrogate(text, maxLength);
  return `${sliceWithoutBrokenSurrogate(text, maxLength - suffix.length)}${suffix}`;
}

export function twitterImageUrl(url, size = 'large') {
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return undefined;
  return `${url.split(/[?#]/, 1)[0]}?name=${size}`;
}

export function uniqueUrls(values, limit = MAX_DISCORD_STORED_MEDIA) {
  return [...new Set(values.filter((value) => typeof value === 'string' && /^https?:\/\//.test(value)))].slice(0, limit);
}

export function engagement({ replies = 0, reposts = 0, likes = 0 } = {}) {
  return `💬${replies ?? 0} 🔁${reposts ?? 0} ❤️${likes ?? 0}`;
}

export function escapeMarkdownLinkLabel(text) {
  return String(text).replace(/[\\*_~`|[\]]/g, '\\$&');
}

export function markdownLinkUrl(url) {
  return String(url).replaceAll('(', '%28').replaceAll(')', '%29');
}

export function createPreview({ canonicalUrl, iconUrl, embed, images = [], media = [], content, pagination, suppressOriginal = true }) {
  const normalizedImages = uniqueUrls(images);
  return {
    canonicalUrl,
    iconUrl,
    embed,
    images: normalizedImages,
    media: uniqueUrls(media, MAX_DISCORD_STORED_MEDIA),
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
