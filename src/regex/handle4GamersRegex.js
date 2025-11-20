import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { typingSender } from '../events/typingSender.js';

const BASE_URL = 'https://www.4gamers.com.tw';
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
};
const REQUEST_TIMEOUT = 2500;
const ICON_URL = 'https://cdn.discordapp.com/avatars/1430084200928645191/4afad5e1bb72a3af362e88c8ed428b69.webp?size=80';

function safeTruncate(text, max = 400) {
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

async function fetchArticleFromApi(articleId) {
  try {
    const apiResp = await axios.request({
      url: `${BASE_URL}/site/api/news/find-section?sub=${articleId}`,
      method: 'get',
      timeout: REQUEST_TIMEOUT,
      headers: REQUEST_HEADERS,
    });
    return apiResp.data?.data || null;
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  const resp = await axios.request({
    url,
    method: 'get',
    timeout: REQUEST_TIMEOUT,
    headers: REQUEST_HEADERS,
  });
  return cheerio.load(resp.data);
}

function applyApiDataToEmbed(apiData, embed) {
  if (!apiData) return null;

  if (apiData.title) embed.setTitle(apiData.title);
  if (apiData.intro) embed.setDescription(safeTruncate(apiData.intro, 400));
  if (apiData.smallBannerUrl) embed.setImage(apiData.smallBannerUrl);

  if (apiData.author) {
    const authorUrl = `${BASE_URL}/news/author/${apiData.author.id}/${encodeURIComponent(apiData.author.nickname)}`;
    embed.setAuthor({
      name: apiData.author.nickname,
      url: authorUrl,
      iconURL: apiData.author.avatarUrl || null,
    });
  }

  if (apiData.createPublishedAt) {
    const published = new Date(apiData.createPublishedAt);
    if (!Number.isNaN(published.getTime())) embed.setTimestamp(published);
  }

  return apiData.category?.name || null;
}

function extractLdArticle($) {
  let ldArticle;
  $('script[type="application/ld+json"]').each((_i, el) => {
    try {
      const jsonText = $(el).contents().text();
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        const found = parsed.find((item) => item && item['@type'] === 'NewsArticle');
        if (found && !ldArticle) ldArticle = found;
      } else if (parsed && parsed['@type'] === 'NewsArticle' && !ldArticle) {
        ldArticle = parsed;
      }
    } catch {
      // ignore malformed blocks
    }
  });
  return ldArticle;
}

function applyHtmlToEmbed($, embed) {
  if (!$) return null;
  const ldArticle = extractLdArticle($);

  try {
    let title = $('meta[property="og:title"]').attr('content');
    if (!title && ldArticle?.headline) title = ldArticle.headline;
    if (!title) title = $('title').text();
    if (title) embed.setTitle(title);
  } catch {}

  try {
    const desc = $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      ldArticle?.description;
    if (desc) embed.setDescription(safeTruncate(desc, 400));
  } catch {}

  try {
    let image = $('meta[property="og:image"]').attr('content');
    if (!image && ldArticle?.image) {
      if (Array.isArray(ldArticle.image)) {
        const first = ldArticle.image[0];
        image = (first && first.url) || first;
      } else {
        image = ldArticle.image.url || ldArticle.image;
      }
    }
    if (image) embed.setImage(image);
  } catch {}

  try {
    if (ldArticle?.author) {
      const authorName = typeof ldArticle.author === 'object' ? ldArticle.author.name : ldArticle.author;
      if (authorName) embed.setAuthor({ name: authorName });
    }
  } catch {}

  try {
    const metaPublished = $('meta[property="article:published_time"]').attr('content');
    const isoText = ldArticle?.datePublished || metaPublished || '';
    const pubDate = isoText ? new Date(isoText) : null;
    if (pubDate && !Number.isNaN(pubDate.getTime())) embed.setTimestamp(pubDate);
  } catch {}

  return ldArticle?.articleSection || null;
}

export async function handle4GamersRegex( result, message, spoiler ) {
  typingSender(message);

  const url = result[0];
  const articleIdMatch = url.match(/\/news\/detail\/(\d+)\//);
  const embed = new EmbedBuilder().setColor(0x3A94CB).setURL(url);

  let categoryLabel = null;

  try {
    if (articleIdMatch) {
      const apiData = await fetchArticleFromApi(articleIdMatch[1]);
      categoryLabel = applyApiDataToEmbed(apiData, embed);
    }

    if (!categoryLabel && !embed.data?.title) {
      const $ = await fetchHtml(url);
      categoryLabel = applyHtmlToEmbed($, embed);
    }

    const footerText = categoryLabel ? `4Gamers 新聞 • 🏷️${categoryLabel}` : '4Gamers 新聞';
    await messageSender(message, spoiler, ICON_URL, embed, footerText);
    await embedSuppresser(message);
  } catch {
    console.log('4gamers error: ' + message.guild.name);
  }
};
