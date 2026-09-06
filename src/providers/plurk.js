import * as cheerio from 'cheerio';
import { createPreview, engagement, ICONS, truncate, uniqueUrls } from './helpers.js';

function parseCount(script, name) {
  return Number.parseInt(script.match(new RegExp(`"${name}":\\s*(\\d+)`))?.[1] ?? '0', 10);
}

export function sanitizePlurkHtml(value = '') {
  const $ = cheerio.load(`<div id="content">${value}</div>`);
  $('#content br').replaceWith('\n');
  return $('#content').text().trim();
}

export const plurkProvider = {
  id: 'plurk',
  patterns: [
    /https:\/\/www\.plurk\.com\/m\/p\/([a-zA-Z0-9]{3,10})/i,
    /https:\/\/www\.plurk\.com\/p\/([a-zA-Z0-9]{3,10})/i,
  ],
  ttlSeconds: 1800,
  cacheKey: (match) => match[1].toLowerCase(),
  async resolve({ match, http }) {
    const canonicalUrl = `https://www.plurk.com/p/${match[1]}`;
    const html = await http.getText(canonicalUrl);
    const $ = cheerio.load(html);
    const script = $('script').text();
    const contentIndex = script.indexOf('content_raw');
    const images = uniqueUrls((contentIndex >= 0 ? script.slice(contentIndex) : script).match(/https:\/\/images\.plurk\.com\/[^\\"\s]+/g) ?? [], 4);
    const userId = script.match(/"page_user":\s*\{"id":\s*(\d+)/)?.[1];
    const avatar = script.match(/"avatar":\s*(\d+)/)?.[1];
    const nickname = script.match(/"nick_name":\s*"([^"]+)"/)?.[1];
    const footer = engagement({
      replies: parseCount(script, 'response_count'),
      reposts: parseCount(script, 'replurkers_count'),
      likes: parseCount(script, 'favorite_count'),
    });
    return createPreview({
      canonicalUrl,
      iconUrl: ICONS.plurk,
      embed: {
        color: 0xefa54c,
        author: nickname ? {
          name: `@${nickname}`,
          iconUrl: userId && avatar ? `https://avatars.plurk.com/${userId}-medium${avatar}.gif` : undefined,
        } : undefined,
        title: truncate($('.name').first().text() || '噗浪使用者', 256),
        url: canonicalUrl,
        description: truncate(sanitizePlurkHtml($('.text_holder').first().html()), 4096),
        image: images[0],
        footer,
      },
      images,
    });
  },
};
