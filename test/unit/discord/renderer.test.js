import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmbed,
  createNhentaiPaginationRow,
  createPaginationRow,
  createUrlStorageRow,
  DiscordRenderer,
  NHENTAI_PAGINATION_IDS,
  PAGINATION_IDS,
} from '../../../src/discord/renderer.js';

test('builds a Discord-safe embed', () => {
  const json = createEmbed({
    color: 0x123456,
    title: 'title',
    description: 'description',
    url: 'https://example.test/post',
    image: 'https://example.test/image.jpg',
    fields: [{ name: 'field', value: 'value', inline: true }],
    footer: 'stats',
  }, 'https://example.test/icon.png').toJSON();
  assert.equal(json.title, 'title');
  assert.equal(json.footer.text, 'stats');
  assert.equal(json.fields[0].inline, true);
});

test('limits all textual embed content to Discord\'s combined 6000 character cap', () => {
  const json = createEmbed({
    author: { name: 'a'.repeat(256) },
    title: 't'.repeat(256),
    description: 'd'.repeat(4096),
    fields: Array.from({ length: 25 }, () => ({ name: 'n'.repeat(256), value: 'v'.repeat(1024) })),
    footer: 'f'.repeat(2048),
  }).toJSON();
  const total = (json.author?.name.length ?? 0)
    + (json.title?.length ?? 0)
    + (json.description?.length ?? 0)
    + (json.footer?.text.length ?? 0)
    + (json.fields ?? []).reduce((sum, field) => sum + field.name.length + field.value.length, 0);
  assert.ok(total <= 6000);
});

test('Pixiv pagination preserves the legacy five-button design', () => {
  const first = createPaginationRow(1, 3).toJSON().components;
  const last = createPaginationRow(3, 3).toJSON().components;
  assert.deepEqual(first.map((button) => button.label), ['<<', '<', '1/3', '>', '>>']);
  assert.deepEqual(first.map((button) => button.custom_id), Object.values(PAGINATION_IDS).slice(1));
  assert.equal(first[2].disabled, true);
  assert.equal(first[0].disabled, undefined);
  assert.equal(first[1].disabled, undefined);
  assert.equal(last[3].disabled, undefined);
  assert.equal(last[4].disabled, undefined);
});

test('renderer uses dedicated nHentai IDs with the five-button pagination design', async () => {
  let replyPayload;
  const renderer = new DiscordRenderer();
  await renderer.send({
    deletable: false,
    async reply(payload) { replyPayload = payload; return {}; },
    channel: { async send() {} },
  }, {
    canonicalUrl: 'https://nhentai.net/g/42',
    embed: { title: 'Gallery' },
    images: ['https://i.nhentai.net/galleries/7/1.webp'],
    pagination: { type: 'nhentai-url', totalPages: 12 },
  });

  const buttons = replyPayload.components[0].toJSON().components;
  assert.deepEqual(buttons.map(({ label }) => label), ['<<', '<', '1/12', '>', '>>']);
  assert.deepEqual(buttons.map(({ custom_id: customId }) => customId), Object.values(NHENTAI_PAGINATION_IDS));
});

test('keeps the legacy Pixiv and generic-image custom IDs unchanged', () => {
  assert.deepEqual(PAGINATION_IDS, {
    cycle: 'morePictureButton',
    first: 'theAPicture',
    previous: 'theBPicture',
    page: 'pagePicture',
    next: 'theNPicture',
    last: 'theZPicture',
  });
});

test('uses the requested N-suffixed IDs only for nHentai pagination', () => {
  assert.deepEqual(NHENTAI_PAGINATION_IDS, {
    first: 'theAPictureN',
    previous: 'theBPictureN',
    page: 'pagePictureN',
    next: 'theNPictureN',
    last: 'theZPictureN',
  });
  assert.deepEqual(
    createNhentaiPaginationRow(1, 3).toJSON().components.map(({ custom_id: customId }) => customId),
    Object.values(NHENTAI_PAGINATION_IDS),
  );
});

test('stores arbitrary image URLs in Discord link buttons', () => {
  const components = createUrlStorageRow([
    'https://example.test/1.jpg',
    'https://example.test/2.jpg',
  ]).toJSON().components;
  assert.equal(components[0].custom_id, PAGINATION_IDS.cycle);
  assert.equal(components[0].label, '更多圖片');
  assert.equal(components[1].url, 'https://example.test/2.jpg');
  assert.equal(components[1].disabled, true);
});

test('keeps the legacy four-image limit for generic previews', () => {
  const components = createUrlStorageRow(
    Array.from({ length: 5 }, (_, index) => `https://example.test/${index + 1}.jpg`),
  ).toJSON().components;
  assert.equal(components.length, 4);
  assert.equal(components[0].label, '更多圖片');
  assert.equal(components[3].url, 'https://example.test/4.jpg');
  assert.ok(components.every((button) => button.url !== 'https://example.test/5.jpg'));
});

test('renderer keeps pagination stateless, sends media, and suppresses the original embed', async () => {
  const channelMessages = [];
  let suppressed = false;
  const renderer = new DiscordRenderer();
  let replyPayload;
  const message = {
    id: 'source',
    deletable: true,
    async suppressEmbeds(value) { suppressed = value; },
    async reply(payload) {
      replyPayload = payload;
      assert.equal(payload.components.length, 1);
      return { id: 'reply' };
    },
    channel: { async send(payload) { channelMessages.push(payload); } },
  };
  await renderer.send(message, {
    canonicalUrl: 'https://www.pixiv.net/artworks/42',
    embed: { title: 'Preview', url: 'https://example.test/post' },
    images: ['https://example.test/1.jpg', 'https://example.test/2.jpg'],
    media: ['https://example.test/video.mp4'],
    suppressOriginal: true,
  }, { spoiler: true });
  const components = replyPayload.components[0].toJSON().components;
  assert.equal(replyPayload.content, '||https://www.pixiv.net/artworks/42||');
  assert.equal(components[0].custom_id, PAGINATION_IDS.cycle);
  assert.equal(components[1].url, 'https://example.test/2.jpg');
  assert.match(channelMessages[0].content, /^\|\|/);
  assert.equal(suppressed, true);
});

test('renders Twitter media galleries only for the new Guild style', async () => {
  let payload;
  const renderer = new DiscordRenderer();
  await renderer.send({
    deletable: false,
    async reply(value) { payload = value; return {}; },
    channel: { async send() {} },
  }, {
    provider: 'twitter',
    embed: {
      title: 'Post',
      url: 'https://x.com/example/status/1',
      description: 'text',
      author: { name: '@example' },
      footer: 'stats',
    },
    images: ['https://img.test/1.jpg'],
    twitterGalleryMedia: [
      { type: 'image', url: 'https://img.test/1.jpg' },
      { type: 'image', url: 'https://img.test/2.jpg' },
    ],
    suppressOriginal: false,
  }, { twitterStyle: 'new' });
  assert.equal(payload.flags, 32768);
  assert.equal(payload.components[0].toJSON().type, 17);
  assert.equal(payload.components[0].toJSON().components[2].type, 12);
});

test('a blank footer falls back to the default name instead of throwing', () => {
  for (const footer of ['   ', '\n\t', '', undefined, null]) {
    assert.equal(createEmbed({ title: 'x', footer }).data.footer.text, 'ermiana');
  }
  assert.equal(createEmbed({ title: 'x', footer: '💬1 🔁2 ❤️3' }).data.footer.text, '💬1 🔁2 ❤️3');
});
