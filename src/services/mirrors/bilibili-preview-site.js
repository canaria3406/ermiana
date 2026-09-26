import * as cheerio from 'cheerio';
import { readResponseText } from '../../core/http-client.js';

const SHORT_HOSTS = new Set(['b23.tv', 'www.b23.tv']);
const PREVIEW_HOSTS = new Set(['vxb23.tv', 'www.vxb23.tv', 'vxbilibili.com', 'www.vxbilibili.com']);
const BILIBILI_HOSTS = new Set(['bilibili.com', 'www.bilibili.com']);
const SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]+$/;

function parseShortUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:'
    || !SHORT_HOSTS.has(url.hostname.toLowerCase())
    || url.username
    || url.password
    || url.port
  ) return null;
  const code = /^\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  if (!code || !SHORT_CODE_PATTERN.test(code)) return null;
  url.search = '';
  url.hash = '';
  const canonicalUrl = url.href;
  url.hostname = 'vxb23.tv';
  return { canonicalUrl, previewUrl: url };
}

function canonicalPreview(value) {
  let canonicalUrl;
  try {
    canonicalUrl = new URL(value);
  } catch {
    return null;
  }
  if (
    canonicalUrl.protocol !== 'https:'
    || !BILIBILI_HOSTS.has(canonicalUrl.hostname.toLowerCase())
    || canonicalUrl.username
    || canonicalUrl.password
    || canonicalUrl.port
  ) return null;

  canonicalUrl.hash = '';
  const previewUrl = new URL(canonicalUrl);
  previewUrl.hostname = canonicalUrl.hostname.toLowerCase() === 'www.bilibili.com'
    ? 'www.vxbilibili.com'
    : 'vxbilibili.com';
  previewUrl.username = '';
  previewUrl.password = '';
  previewUrl.port = '';
  return { canonicalUrl: canonicalUrl.href, previewUrl: previewUrl.href };
}

export class BilibiliPreviewSiteService {
  constructor({ http, logger } = {}) {
    this.http = http;
    this.logger = logger;
  }

  async getPreviewUrl(candidateUrl) {
    return candidateUrl;
  }

  async resolveShortUrl(originalUrl) {
    let shortLink;
    try {
      shortLink = parseShortUrl(originalUrl);
    } catch {
      return null;
    }
    if (!shortLink || !this.http) return null;

    try {
      const { status, finalUrl, body } = await this.http.request(shortLink.previewUrl, {
        method: 'GET',
        timeoutMs: 5000,
        retries: 1,
        consumeErrorResponses: true,
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' },
      }, async (response) => ({
        status: response.status,
        finalUrl: response.url || shortLink.previewUrl.href,
        body: await readResponseText(response),
      }));

      let finalHostname;
      try {
        finalHostname = new URL(finalUrl).hostname.toLowerCase();
      } catch {
        return null;
      }
      if (status < 200 || status >= 300 || !PREVIEW_HOSTS.has(finalHostname)) return null;

      const ogUrl = cheerio.load(body)('meta[property="og:url"]').first().attr('content')?.trim();
      if (!ogUrl) return { canonicalUrl: shortLink.canonicalUrl, previewUrl: shortLink.previewUrl.href };
      return canonicalPreview(ogUrl)
        ?? { canonicalUrl: shortLink.canonicalUrl, previewUrl: shortLink.previewUrl.href };
    } catch (error) {
      this.logger?.warn({ url: shortLink.previewUrl.href, err: error }, 'BiliFix canonical lookup failed');
      return null;
    }
  }
}
