import * as cheerio from 'cheerio';
import { createPreview, ICONS, truncate, uniqueUrls } from './helpers.js';

const PTT_PATTERN = /https?:\/\/(?:www\.)?ptt\.cc\/bbs\/(?<board>[A-Za-z0-9_-]+)\/(?<postId>M\.[0-9]+\.A\.[A-Za-z0-9]+)\.html(?![A-Za-z0-9])/i;
const IMAGE_PATTERN = /https?:\/\/[^\s<>"']+?\.(?:jpe?g|png|gif|webp)(?:\?[^\s<>"']*)?/gi;
const IMAGE_URL_PATTERN = /^https?:\/\/[^\s<>"']+?\.(?:jpe?g|png|gif|webp)(?:\?[^\s<>"']*)?$/i;
const ARTICLE_END_ELEMENT_PATTERN = /<span\b[^>]*class=["'][^"']*\bf2\b[^"']*["'][^>]*>\s*※ 發信站: 批踢踢實業坊\(ptt\.cc\)/i;
const MAIN_CONTENT_PATTERN = /<div\b[^>]*\bid=["']main-content["'][^>]*>/i;
const GOSSIPING_NEWS_BODY_PATTERN = /4\.[ \t]*完整新聞內文[ \t]*[：:]/;
const DESCRIPTION_MAX_LENGTH = 420;
const DESCRIPTION_MAX_LINES = 12;

const MONTHS = Object.freeze({
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
});

function timestamp(value) {
  if (!value) return undefined;
  const match = /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat) ([A-Z][a-z]{2}) (\d{1,2}) (\d{2}):(\d{2}):(\d{2}) (\d{4})$/
    .exec(value.replace(/\s+/g, ' ').trim());
  if (!match || MONTHS[match[1]] === undefined) return undefined;
  const [, monthName, dayText, hourText, minuteText, secondText, yearText] = match;
  const [year, month, day, hour, minute, second] = [
    Number(yearText),
    MONTHS[monthName],
    Number(dayText),
    Number(hourText),
    Number(minuteText),
    Number(secondText),
  ];
  const wallTime = new Date(Date.UTC(year, month, day, hour, minute, second));
  if (
    wallTime.getUTCFullYear() !== year
    || wallTime.getUTCMonth() !== month
    || wallTime.getUTCDate() !== day
    || wallTime.getUTCHours() !== hour
    || wallTime.getUTCMinutes() !== minute
    || wallTime.getUTCSeconds() !== second
  ) return undefined;
  return new Date(wallTime.valueOf() - 8 * 60 * 60 * 1000).toISOString();
}

function articleMetadata($) {
  const metadata = new Map();
  $('.article-metaline').each((_index, element) => {
    const line = $(element);
    const label = line.find('.article-meta-tag').text().trim();
    const value = line.find('.article-meta-value').text().trim();
    if (label && value) metadata.set(label, value);
  });
  return metadata;
}

function articleHtml(html) {
  const mainContent = MAIN_CONTENT_PATTERN.exec(html);
  if (!mainContent) return html;
  const contentStart = mainContent.index + mainContent[0].length;
  const articleEnd = ARTICLE_END_ELEMENT_PATTERN.exec(html.slice(contentStart));
  return articleEnd ? html.slice(0, contentStart + articleEnd.index) : html;
}

function compactLines(value) {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/^[^\S\n]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncateWholeLines(value, maxLength) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  if (text.length <= maxLength) return text;
  const lineEnd = text.lastIndexOf('\n', maxLength);
  if (lineEnd === -1) return undefined;
  return text.slice(0, lineEnd).trimEnd() || undefined;
}

function removeUniformBlankLines(value) {
  const lines = value.split('\n');
  if (lines.length < 3) return value;
  const uniformlySeparated = lines.every((line, index) => (
    index % 2 === 0 ? line !== '' : line === ''
  ));
  return uniformlySeparated ? lines.filter((line) => line !== '').join('\n') : value;
}

function postProcessDescription(value) {
  const truncated = truncateWholeLines(value, DESCRIPTION_MAX_LENGTH);
  if (!truncated) return undefined;
  return removeUniformBlankLines(truncated)
    .split('\n')
    .slice(0, DESCRIPTION_MAX_LINES)
    .join('\n')
    .trimEnd() || undefined;
}

function articleContentRoot(contentRoot, board, title) {
  if (board.toLowerCase() !== 'gossiping' || !/^\[新聞\]/.test(title.trim())) return contentRoot;
  const contentHtml = contentRoot.html() ?? '';
  const bodyStart = GOSSIPING_NEWS_BODY_PATTERN.exec(contentHtml);
  if (!bodyStart) return contentRoot;
  return cheerio.load(
    contentHtml.slice(bodyStart.index + bodyStart[0].length),
    null,
    false,
  ).root();
}

function parsePage(html, board) {
  const $ = cheerio.load(articleHtml(html));
  const metadata = articleMetadata($);
  const originalContentRoot = $('#main-content').clone();
  if (originalContentRoot.length === 0) throw new Error('PTT page has no article content');
  const title = $('meta[property="og:title"]').attr('content') || metadata.get('標題') || `PTT / ${board}`;
  const contentRoot = articleContentRoot(originalContentRoot, board, title);

  contentRoot.find('.article-metaline, .article-metaline-right, .push, span.f2').remove();
  let content = contentRoot.text().trim();
  if (content.endsWith('--')) content = content.slice(0, -2).trim();

  const images = uniqueUrls([
    ...$('meta[property="og:image"]').map((_index, element) => $(element).attr('content')).get(),
    ...(content.match(IMAGE_PATTERN) ?? []),
    ...contentRoot.find('a[href]').map((_index, element) => $(element).attr('href')).get()
      .filter((value) => IMAGE_URL_PATTERN.test(value)),
  ]);
  content = compactLines(content.replace(IMAGE_PATTERN, ''));

  return {
    author: metadata.get('作者'),
    title,
    postedAt: timestamp(metadata.get('時間')),
    description: content || $('meta[property="og:description"]').attr('content'),
    images,
  };
}

export const pttProvider = {
  id: 'ptt',
  patterns: [PTT_PATTERN],
  ttlSeconds: 1800,
  cacheKey: (match) => `${match.groups.board.toLowerCase()}/${match.groups.postId.toUpperCase()}`,
  async resolve({ match, http }) {
    const board = match.groups.board;
    const canonicalUrl = `https://www.ptt.cc/bbs/${board}/${match.groups.postId}.html`;
    const page = parsePage(await http.getText(canonicalUrl, {
      headers: { cookie: 'over18=1' },
    }), board);
    return createPreview({
      canonicalUrl,
      iconUrl: ICONS.ptt,
      embed: {
        color: 0x4d4e55,
        author: page.author ? { name: page.author } : undefined,
        title: truncate(page.title, 256),
        url: canonicalUrl,
        description: postProcessDescription(page.description),
        image: page.images[0],
        timestamp: page.postedAt,
        footer: 'ermiana',
      },
      images: page.images,
    });
  },
};
