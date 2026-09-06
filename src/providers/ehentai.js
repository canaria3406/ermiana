import { createPreview, ICONS, truncate } from './helpers.js';

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
  ['temp', '臨時'],
]);

function formatTags(tags = []) {
  const grouped = new Map();
  for (const rawTag of tags) {
    const separator = rawTag.indexOf(':');
    const namespace = separator === -1 ? 'tag' : rawTag.slice(0, separator);
    const tag = separator === -1 ? rawTag : rawTag.slice(separator + 1);
    const values = grouped.get(namespace) ?? [];
    values.push(tag);
    grouped.set(namespace, values);
  }
  return [...grouped].map(([namespace, values]) => `${TAG_NAMES.get(namespace) ?? namespace}: ${values.join(', ')}`).join('\n');
}

export const ehentaiProvider = {
  id: 'ehentai',
  patterns: [/https:\/\/e(?:x|-)hentai\.org\/g\/([0-9]+)\/([0-9a-z]+)/i],
  ttlSeconds: 7200,
  cacheKey: (match) => `${match[1]}:${match[2]}`,
  async resolve({ match, services }) {
    const galleryId = Number.parseInt(match[1], 10);
    const galleryToken = match[2];
    const gallery = await services.ehentaiApi.getGallery(galleryId, galleryToken);
    const tags = truncate(formatTags(gallery.tags), 1024);
    const fields = [
      { name: '類別', value: String(gallery.category ?? '未知'), inline: true },
      { name: '評分', value: String(gallery.rating ?? '未知'), inline: true },
      { name: '上傳者', value: String(gallery.uploader ?? '未知'), inline: true },
    ];
    if (tags) fields.push({ name: '標籤', value: tags });
    return createPreview({
      canonicalUrl: match[0],
      iconUrl: ICONS.ehentai,
      embed: {
        color: 0xf6fcfa,
        title: truncate(gallery.title, 256),
        url: match[0],
        image: gallery.thumb,
        fields,
        footer: 'ermiana',
      },
      images: gallery.thumb ? [gallery.thumb] : [],
    });
  },
};
