import * as cheerio from 'cheerio';
import { readResponseText } from '../../core/http-client.js';

const PREVIEW_CRAWLER_USER_AGENT =
  'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com) GoogleBot (+https://github.com/)';

const FACEBED_HOSTS = Object.freeze(['facebed.com', 'www.facebed.com']);
const TRACKING_PARAMETERS = Object.freeze(['fbclid', 'mibextid', 'rdid', 'share_url']);
const FACEBOOK_SOURCE_ID = /^[A-Za-z0-9_-]+$/;
const FACEBOOK_DIRECT_SHARE_ID = /^[A-Za-z0-9_-]{3,}$/;

function isFacebookHostname(hostname) {
  const normalized = hostname.toLowerCase();
  return normalized === 'facebook.com' || normalized.endsWith('.facebook.com');
}

function isSupportedFacebookUrl(url, { allowShare = true } = {}) {
  if (url.protocol !== 'https:' || !isFacebookHostname(url.hostname)) return false;

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments[0] === 'share') {
    return allowShare && ['p', 'v', 'r'].includes(segments[1]) && Boolean(segments[2]);
  }
  if (segments[0] === 'reel') return Boolean(segments[1]);
  if (segments[0] === 'groups') {
    return Boolean(segments[1])
      && ['posts', 'permalink'].includes(segments[2])
      && Boolean(segments[3]);
  }
  if (segments[1] === 'posts' || segments[1] === 'videos') return Boolean(segments[2]);
  if (segments[0] === 'videos') return Boolean(segments[1]);
  if (segments[0] === 'watch') return Boolean(url.searchParams.get('v') || segments[1]);
  if (segments[0] === 'photo' || segments[0] === 'photo.php') {
    return Boolean(url.searchParams.get('fbid') || segments[1]);
  }
  if (segments[0] === 'permalink.php' || segments[0] === 'story.php') {
    return Boolean(url.searchParams.get('story_fbid'));
  }
  return false;
}

function isSupportedFacebookSourceUrl(url) {
  if (url.protocol !== 'https:' || !isFacebookHostname(url.hostname)) return false;
  const segments = url.pathname.split('/').filter(Boolean);
  return (
    segments.length === 3
    && segments[0] === 'share'
    && ['p', 'v', 'r'].includes(segments[1])
    && FACEBOOK_SOURCE_ID.test(segments[2])
  ) || (
    segments.length === 2
    && segments[0] === 'share'
    && FACEBOOK_DIRECT_SHARE_ID.test(segments[1])
  ) || (
    segments.length === 2
    && segments[0] === 'reel'
    && FACEBOOK_SOURCE_ID.test(segments[1])
  );
}

function facebedUrl(originalUrl) {
  const url = new URL(originalUrl);
  if (!isSupportedFacebookSourceUrl(url)) return null;
  url.protocol = 'https:';
  url.hostname = 'facebed.com';
  url.port = '';
  url.username = '';
  url.password = '';
  url.hash = '';
  return url;
}

function canonicalPreview(body) {
  const $ = cheerio.load(body);
  const title = $('meta[property="og:title"]').first().attr('content')?.trim();
  if (title?.toLowerCase().startsWith('log in or sign up to view')) return null;

  const value = $('meta[property="og:url"]').first().attr('content')?.trim();
  if (!value) return null;

  let canonicalUrl;
  try {
    canonicalUrl = new URL(value);
  } catch {
    return null;
  }
  if (!isSupportedFacebookUrl(canonicalUrl, { allowShare: false })) return null;

  canonicalUrl.hash = '';
  for (const parameter of TRACKING_PARAMETERS) canonicalUrl.searchParams.delete(parameter);

  const previewUrl = new URL(canonicalUrl);
  previewUrl.hostname = 'facebed.com';
  previewUrl.port = '';
  previewUrl.username = '';
  previewUrl.password = '';
  return {
    canonicalUrl: canonicalUrl.href,
    previewUrl: previewUrl.href,
  };
}

export class FacebookPreviewSiteService {
  constructor({ http, logger }) {
    this.http = http;
    this.logger = logger;
  }

  async resolve(originalUrl) {
    let candidateUrl;
    try {
      candidateUrl = facebedUrl(originalUrl);
    } catch {
      return null;
    }
    if (!candidateUrl) return null;

    try {
      const { status, finalUrl, body } = await this.http.request(candidateUrl, {
        method: 'GET',
        timeoutMs: 5000,
        retries: 1,
        consumeErrorResponses: true,
        headers: { 'user-agent': PREVIEW_CRAWLER_USER_AGENT },
      }, async (response) => ({
        status: response.status,
        finalUrl: response.url,
        body: await readResponseText(response),
      }));

      let finalHostname;
      try {
        finalHostname = new URL(finalUrl).hostname.toLowerCase();
      } catch {
        return null;
      }
      if (status < 200 || status >= 300 || !FACEBED_HOSTS.includes(finalHostname)) {
        this.logger?.warn({ url: candidateUrl.href, status, finalUrl }, 'Facebed canonical lookup failed');
        return null;
      }

      const resolved = canonicalPreview(body);
      if (!resolved) {
        this.logger?.warn({ url: candidateUrl.href, status, finalUrl }, 'Facebed answered without a usable canonical URL');
      }
      return resolved;
    } catch (error) {
      this.logger?.warn({ url: candidateUrl.href, err: error }, 'Facebed canonical lookup failed');
      return null;
    }
  }
}
