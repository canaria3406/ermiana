import * as cheerio from 'cheerio';
import { createPreview, ICONS, truncate } from './helpers.js';

async function fetchPage(http, path, cookie) {
  return http.getText(`https://forum.gamer.com.tw/${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

function parseOpenGraph(html) {
  const $ = cheerio.load(html);
  return {
    title: $('meta[property="og:title"]').attr('content'),
    description: $('meta[property="og:description"]').attr('content'),
    image: $('meta[property="og:image"]').attr('content'),
  };
}

function isComplete(page) {
  return Boolean(page.title) && page.description !== undefined && page.image !== undefined;
}

function parsePage(html) {
  const headEnd = html.indexOf('</head>');
  if (headEnd !== -1) {
    const head = parseOpenGraph(html.slice(0, headEnd));
    if (isComplete(head)) return head;
  }
  const page = parseOpenGraph(html);
  if (!page.title) throw new Error('Bahamut page has no Open Graph title');
  return page;
}

export const bahamutProvider = {
  id: 'bahamut',
  patterns: [
    /https?:\/\/m\.gamer\.com\.tw\/forum\/((?:C|Co)\.php\?bsn=60076&(?:snA|sn)=[0-9]+)/i,
    /https?:\/\/forum\.gamer\.com\.tw\/((?:C|Co)\.php\?bsn=60076&(?:snA|sn)=[0-9]+)/i,
  ],
  ttlSeconds: 1800,
  cacheKey: (match) => match[1],
  async resolve({ match, http, services, logger }) {
    const path = match[1];
    const canonicalUrl = `https://forum.gamer.com.tw/${path}`;
    let page;
    try {
      page = parsePage(await fetchPage(http, path, await services.bahaSession.getCookie()));
    } catch (firstError) {
      logger?.warn({ path, err: firstError }, 'Bahamut request failed; refreshing session');
      page = parsePage(await fetchPage(http, path, await services.bahaSession.getCookie({ force: true })));
    }
    return createPreview({
      canonicalUrl,
      iconUrl: ICONS.bahamut,
      embed: {
        color: 0x17cc8c,
        title: truncate(page.title, 256),
        url: canonicalUrl,
        description: truncate(page.description, 4096),
        image: page.image,
        footer: 'ermiana',
      },
      images: page.image ? [page.image] : [],
    });
  },
};
