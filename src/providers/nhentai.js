import { createPreview, ICONS, truncate } from './helpers.js';

const API_BASE_URL = 'https://nhentai.net/api/v2/galleries';
const IMAGE_BASE_URL = 'https://i.nhentai.net';
const PAGE_PATH_PATTERN = /^galleries\/([1-9]\d*)\/([1-9]\d*)\.(jpe?g|png|gif|webp)$/i;

const TAG_NAMES = new Map([
  ['artist', '繪師'],
  ['character', '角色'],
  ['cosplayer', 'coser'],
  ['female', '女性'],
  ['group', '社團'],
  ['language', '語言'],
  ['male', '男性'],
  ['mixed', '混合'],
  ['other', '其他'],
  ['parody', '原作'],
  ['reclass', '重新分類'],
  ['tag', '標籤'],
  ['temp', '臨時'],
]);

function formatTags(tags = []) {
  const grouped = new Map();
  for (const rawTag of tags) {
    if (!rawTag || typeof rawTag.name !== 'string') continue;
    const namespace = typeof rawTag.type === 'string' ? rawTag.type : 'tag';
    if (namespace === 'category') continue;
    const values = grouped.get(namespace) ?? [];
    values.push(rawTag.name);
    grouped.set(namespace, values);
  }
  return [...grouped]
    .map(([namespace, values]) => `${TAG_NAMES.get(namespace) ?? namespace}: ${values.join(', ')}`)
    .join('\n');
}

function parsePagePath(value) {
  if (typeof value !== 'string') return null;
  const path = value.replace(/^\/+/, '');
  const match = PAGE_PATH_PATTERN.exec(path);
  return match ? {
    path,
    mediaId: match[1],
    page: Number.parseInt(match[2], 10),
    extension: match[3].toLowerCase(),
  } : null;
}

function galleryImages(gallery) {
  const pages = Array.isArray(gallery.pages) ? gallery.pages : [];
  const first = parsePagePath(pages[0]?.path);
  const mediaId = String(gallery.media_id ?? '');
  if (!first || first.mediaId !== mediaId || first.page !== 1) return {};

  const image = `${IMAGE_BASE_URL}/${first.path}`;
  const totalPages = Number(gallery.num_pages);
  const sequential = Number.isSafeInteger(totalPages)
    && totalPages > 1
    && pages.length === totalPages
    && pages.every((page, index) => {
      const parsed = parsePagePath(page?.path);
      return parsed?.mediaId === mediaId
        && parsed.page === index + 1
        && parsed.extension === first.extension;
    });
  return { image, totalPages: sequential ? totalPages : 0 };
}

export const nhentaiProvider = {
  id: 'nhentai',
  patterns: [/https:\/\/(?:www\.)?nhentai\.net\/g\/([0-9]+)\/?/i],
  ttlSeconds: 7200,
  cacheKey: (match) => String(Number.parseInt(match[1], 10)),
  async resolve({ match, http }) {
    const galleryId = Number.parseInt(match[1], 10);
    const canonicalUrl = `https://nhentai.net/g/${galleryId}`;
    const gallery = await http.getJson(`${API_BASE_URL}/${galleryId}`);
    if (!gallery || Number(gallery.id) !== galleryId) {
      throw new Error('nhentai response has no matching gallery');
    }

    const { image, totalPages } = galleryImages(gallery);
    const galleryTags = Array.isArray(gallery.tags) ? gallery.tags : [];
    const tags = truncate(formatTags(galleryTags), 1024);
    const category = galleryTags.find((tag) => tag?.type === 'category')?.name;
    const pageCount = Number(gallery.num_pages);
    const title = truncate(gallery.title?.japanese, 256)
      ?? truncate(gallery.title?.english, 256)
      ?? truncate(gallery.title?.pretty, 256)
      ?? `nHentai #${galleryId}`;
    const fields = [
      { name: '類別', value: String(category ?? '未知'), inline: true },
      { name: '收藏', value: String(gallery.num_favorites ?? 0), inline: true },
      { name: '頁數', value: Number.isSafeInteger(pageCount) ? String(pageCount) : '未知', inline: true },
    ];
    if (tags) fields.push({ name: '標籤', value: tags });

    return createPreview({
      canonicalUrl,
      iconUrl: ICONS.nhentai,
      embed: {
        color: 0xec2353,
        title,
        url: canonicalUrl,
        image,
        fields,
        footer: 'ermiana',
      },
      images: image ? [image] : [],
      pagination: image && totalPages > 1
        ? { type: 'nhentai-url', totalPages }
        : undefined,
    });
  },
};
