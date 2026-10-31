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
  steam: 'https://ermiana.canaria.cc/pic/steam.png',
});

export const MAX_DISCORD_STORED_MEDIA = 4;

function sliceWithoutBrokenSurrogate(text, maxLength) {
  let end = Math.max(0, maxLength);
  const lastCodeUnit = text.charCodeAt(end - 1);
  if (lastCodeUnit >= 0xD800 && lastCodeUnit <= 0xDBFF) end -= 1;
  return text.slice(0, end);
}

function withoutDanglingEscape(text) {
  const trailingBackslashes = /\\+$/.exec(text)?.[0].length ?? 0;
  return trailingBackslashes % 2 === 1 ? text.slice(0, -1) : text;
}

export function truncate(value, maxLength, suffix = '…') {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  if (text.length <= maxLength) return text;
  if (maxLength <= suffix.length) return sliceWithoutBrokenSurrogate(text, maxLength);
  return `${sliceWithoutBrokenSurrogate(text, maxLength - suffix.length)}${suffix}`;
}

function isEscaped(text, index) {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) backslashes += 1;
  return backslashes % 2 === 1;
}

function markdownLinkSafeCutoff(text, cutoff) {
  for (let index = 0; index < cutoff; index += 1) {
    if (text[index] !== '[' || isEscaped(text, index)) continue;
    let labelEnd = index + 1;
    while (labelEnd < text.length) {
      if (text[labelEnd] === ']' && !isEscaped(text, labelEnd)) break;
      labelEnd += 1;
    }
    if (labelEnd >= text.length || text[labelEnd + 1] !== '(') continue;
    let depth = 1;
    let linkEnd = labelEnd + 2;
    while (linkEnd < text.length && depth > 0) {
      if (!isEscaped(text, linkEnd)) {
        if (text[linkEnd] === '(') depth += 1;
        else if (text[linkEnd] === ')') depth -= 1;
      }
      linkEnd += 1;
    }
    if (depth !== 0) continue;
    if (cutoff < linkEnd) return index;
    index = linkEnd - 1;
  }
  return cutoff;
}

export function truncateMarkdown(value, maxLength, suffix = '…') {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  if (text.length <= maxLength) return text;
  const renderedSuffix = maxLength > suffix.length ? suffix : '';
  const initialCutoff = Math.max(0, maxLength - renderedSuffix.length);
  const safeCutoff = markdownLinkSafeCutoff(text, initialCutoff);
  const prefix = withoutDanglingEscape(sliceWithoutBrokenSurrogate(text, safeCutoff));
  return `${prefix}${renderedSuffix}`;
}

const URL_FRAGMENT_PATTERN = /https?:\/\/[^\s<]*[^<.,:;"')\]\s]/gi;
const URL_TRAILING_PUNCTUATION = /^[.,:;"')\]]*/;

function transformOutsideUrls(value, transform) {
  const text = String(value ?? '');
  let transformed = '';
  let offset = 0;
  for (const match of text.matchAll(URL_FRAGMENT_PATTERN)) {
    transformed += transform(text.slice(offset, match.index), offset > 0);
    transformed += match[0];
    offset = match.index + match[0].length;
  }
  return transformed + transform(text.slice(offset), offset > 0);
}

function escapeLineStarts(value) {
  return value
    .replace(/^([ \t]*)>/gm, '$1\\>')
    .replace(/^([ \t]*)-#/gm, '$1\\-#')
    .replace(/^([ \t]*)#/gm, '$1\\#')
    .replace(/^([ \t]*)([-+])(?=[ \t])/gm, '$1\\$2')
    .replace(/^([ \t]*)(\d+)\.(?=[ \t])/gm, '$1$2\\.');
}

function escapeInlineMarkdown(value, followsUrl = false) {
  if (!followsUrl) return value.replace(/[\\*_~`|<[\]]/g, '\\$&');
  const trailing = URL_TRAILING_PUNCTUATION.exec(value)[0];
  const rest = value.slice(trailing.length);
  const guardedRest = rest.startsWith('<')
    ? `<\u200B${escapeInlineMarkdown(rest.slice(1))}`
    : escapeInlineMarkdown(rest);
  return `${trailing}${guardedRest}`;
}

export function escapeUpstreamText(value) {
  return escapeLineStarts(transformOutsideUrls(value, escapeInlineMarkdown));
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
  return String(text).replace(/[\\*_~`|<[\]]/g, '\\$&');
}

const INVISIBLE_MARKDOWN_BREAK = '\u200B';

export function markdownLinkLabel(text) {
  return escapeMarkdownLinkLabel(text).replace(/\\([\s\S])/g, `$1${INVISIBLE_MARKDOWN_BREAK}`);
}

export function normalizeTwitterHandle(value) {
  if (typeof value !== 'string') return undefined;
  const candidate = value.trim();
  const username = candidate.startsWith('@') ? candidate.slice(1) : candidate;
  return /^[A-Za-z0-9_]{1,15}$/.test(username) ? `@${username}` : undefined;
}

export function twitterHandleLinkLabel(handle) {
  return handle && (handle.match(/_/g) ?? []).length <= 1 ? handle : undefined;
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

export async function rewrittenLinkPreview(previewSite, canonicalUrl, rewriteUrl = canonicalUrl) {
  const { previewUrl, fallbackUrl } = await previewSite.getPreviewUrls(rewriteUrl);
  return previewUrl
    ? { ...fallbackPreview(canonicalUrl, previewUrl), discordRetryContent: fallbackUrl }
    : null;
}

export function proxyPixivUrl(url) {
  return typeof url === 'string' ? url.replace('i.pximg.net', 'pixiv.canaria.cc') : url;
}
