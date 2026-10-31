import {
  createPreview,
  escapeUpstreamText,
  ICONS,
  truncate,
} from './helpers.js';

const API_URL = 'https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/';
const BLOCK_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'quote', 'code', 'list', 'olist', 'table', 'tr', 'th', 'td', 'hr', 'br',
]);
const INLINE_TAGS = new Set([
  'b', 'i', 'u', 's', 'strike', 'spoiler', 'noparse', 'url', 'previewyoutube', 'emoticon',
]);
const HIDDEN_TAGS = new Set(['img']);
const BB_CODE_TAG = /\[(\/)?([a-z][a-z0-9]*|\*)(?:[= ][^\][\r\n]*)?\]/gi;

export function sanitizeSteamDescription(value = '') {
  if (typeof value !== 'string') return '';
  const output = [];
  const hidden = [];
  let cursor = 0;
  const emitText = (text) => {
    if (hidden.at(-1) === 'img') {
      const lineBreak = text.indexOf('\n');
      if (lineBreak === -1) return;
      while (hidden.at(-1) === 'img') hidden.pop();
      text = text.slice(lineBreak);
    }
    if (hidden.length === 0) output.push(text);
  };
  for (const match of value.matchAll(BB_CODE_TAG)) {
    emitText(value.slice(cursor, match.index));
    cursor = match.index + match[0].length;
    const closing = Boolean(match[1]);
    const tag = match[2].toLowerCase();
    if (hidden.length > 0) {
      if (closing && tag === hidden.at(-1)) hidden.pop();
      else if (!closing && HIDDEN_TAGS.has(tag)) hidden.push(tag);
      continue;
    }
    if (HIDDEN_TAGS.has(tag)) {
      if (!closing) hidden.push(tag);
    } else if (tag === '*') {
      output.push('\n• ');
    } else if (BLOCK_TAGS.has(tag)) {
      output.push('\n');
    } else if (!INLINE_TAGS.has(tag)) {
      output.push(match[0]);
    }
  }
  emitText(value.slice(cursor));
  return output.join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const steamProvider = {
  id: 'steam',
  patterns: [
    /https:\/\/steamcommunity\.com\/(?:sharedfiles|workshop)\/filedetails\/?\?id=([1-9]\d*)/i,
  ],
  ttlSeconds: 7200,
  cacheKey: (match) => `v1:${match[1]}`,
  async resolve({ match, http }) {
    const publishedFileId = match[1];
    const canonicalUrl = `https://steamcommunity.com/sharedfiles/filedetails/?id=${publishedFileId}`;
    const payload = await http.postFormJson(API_URL, {
      itemcount: '1',
      'publishedfileids[0]': publishedFileId,
    });
    const file = payload?.response?.publishedfiledetails?.[0];
    if (!file) throw new Error('Steam Workshop response has no published file');
    const result = Number(file.result);
    if (result === 9 || Boolean(Number(file.banned))) return null;
    if (result !== 1) throw new Error(`Steam Workshop result ${file.result}`);
    if (String(file.publishedfileid) !== publishedFileId
      || typeof file.title !== 'string'
      || !file.title.trim()) {
      throw new Error('Steam Workshop response has no matching published file');
    }
    const description = truncate(
      escapeUpstreamText(sanitizeSteamDescription(file.description)),
      1024,
    );
    const image = typeof file.preview_url === 'string' ? file.preview_url : undefined;
    return createPreview({
      canonicalUrl,
      iconUrl: ICONS.steam,
      embed: {
        color: 0x1b2838,
        title: truncate(escapeUpstreamText(file.title), 256),
        url: canonicalUrl,
        description,
        image,
        footer: 'ermiana',
      },
      images: image ? [image] : [],
    });
  },
};
