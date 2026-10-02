import assert from 'node:assert/strict';
import test from 'node:test';
import { ComponentType } from 'discord.js';
import {
  createEmbed,
  createNhentaiPaginationRow,
  createPaginationRow,
  createUrlStorageRow,
  DiscordRenderer,
  NHENTAI_PAGINATION_IDS,
  PAGINATION_IDS,
} from '../../../src/discord/renderer.js';

function hasUnpairedSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDBFF) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xDC00 || next > 0xDFFF) return true;
      index += 1;
    } else if (codeUnit >= 0xDC00 && codeUnit <= 0xDFFF) {
      return true;
    }
  }
  return false;
}

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

test('ignores invalid embed timestamps and preserves valid ISO timestamps', () => {
  const invalid = createEmbed({ title: 't', timestamp: 'not a date' });
  assert.equal(invalid.data.timestamp, undefined);

  const valid = createEmbed({ title: 't', timestamp: '2025-04-24T15:13:16.000Z' });
  assert.equal(valid.data.timestamp, '2025-04-24T15:13:16.000Z');
});

test('limits every preview description to 1024 characters', () => {
  const description = createEmbed({ description: '漢'.repeat(4080) }).toJSON().description;
  assert.equal(description.length, 1024);
  assert.ok(description.endsWith('…'));
});

test('preserves a 1024-character description and truncates the next character', () => {
  const exact = '字'.repeat(1024);
  assert.equal(createEmbed({ description: exact }).toJSON().description, exact);

  const truncated = createEmbed({ description: `${exact}字` }).toJSON().description;
  assert.equal(truncated.length, 1024);
  assert.ok(truncated.endsWith('…'));
});

test('description truncation never splits an emoji surrogate pair', () => {
  const input = `${'a'.repeat(1022)}😀${'b'.repeat(10)}`;
  const description = createEmbed({ description: input }).toJSON().description;
  assert.ok(description.length <= 1024);
  assert.ok(description.endsWith('…'));
  assert.equal(hasUnpairedSurrogate(description), false);
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
  assert.equal(json.description.length, 1024);
  assert.equal(total, 6000);
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

test('renders Twitter video media galleries only for the new Guild style', async () => {
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
    images: [],
    twitterGalleryMedia: [
      { type: 'video', url: 'https://video.twimg.com/ext_tw_video/example.mp4' },
    ],
    media: ['https://video.twimg.com/ext_tw_video/example.mp4'],
    suppressOriginal: false,
  }, { twitterStyle: 'new' });
  assert.equal(payload.flags, 32768);
  assert.equal(payload.components[0].toJSON().type, 17);
  assert.equal(payload.components[0].toJSON().components[2].type, 12);
  assert.equal(payload.components[0].toJSON().components[1].content, 'text\n\n-# stats');
  assert.equal(payload.components[0].toJSON().components.at(-1).content, '-# :bird: @example');
});

test('Twitter new style uses the handle link when the display name starts with emoji', async () => {
  const url = 'https://x.com/example/status/123';
  const cases = [
    ['😀', `## 😀 [(@example)](${url})`],
    ['😀 User', `## 😀 User [(@example)](${url})`],
    ['User 😀', `## [User](${url}) 😀`],
    ['User', `## [User](${url})`],
  ];

  for (const [title, expected] of cases) {
    let replyPayload;
    await new DiscordRenderer().send({
      deletable: false,
      async reply(payload) { replyPayload = payload; return {}; },
      channel: { async send() { throw new Error('new gallery must not send follow-up links'); } },
    }, {
      provider: 'twitter',
      embed: { title, url, author: { name: '@example' } },
      twitterGalleryMedia: [
        { type: 'video', url: 'https://video.twimg.com/ext_tw_video/example.mp4' },
      ],
      media: ['https://video.twimg.com/ext_tw_video/example.mp4'],
    }, { twitterStyle: 'new' });

    assert.equal(replyPayload.components[0].toJSON().components[0].content, expected);
  }
});

test('Twitter new style falls back to the open-post link when an emoji title has no handle', async () => {
  let replyPayload;
  const url = 'https://x.com/i/status/123';
  await new DiscordRenderer().send({
    deletable: false,
    async reply(payload) { replyPayload = payload; return {}; },
    channel: { async send() { throw new Error('new gallery must not send follow-up links'); } },
  }, {
    provider: 'twitter',
    embed: { title: '😀', url },
    twitterGalleryMedia: [
      { type: 'video', url: 'https://video.twimg.com/ext_tw_video/example.mp4' },
    ],
    media: ['https://video.twimg.com/ext_tw_video/example.mp4'],
  }, { twitterStyle: 'new' });

  assert.equal(
    replyPayload.components[0].toJSON().components[0].content,
    `## 😀 [開啟推文](${url})`,
  );
});

test('limits Twitter Components V2 preview descriptions to 1024 characters', async () => {
  let payload;
  await new DiscordRenderer().send({
    deletable: false,
    async reply(value) { payload = value; return {}; },
    channel: { async send() {} },
  }, {
    provider: 'twitter',
    embed: {
      author: { name: '@example' },
      title: 'Long post',
      url: 'https://x.com/example/status/123',
      description: `${'漢'.repeat(600)} ${'letter '.repeat(250)}`,
      footer: '💬1 🔁2 ❤3',
    },
    twitterGalleryMedia: [
      { type: 'image', url: 'https://img.test/1.jpg' },
      { type: 'video', url: 'https://video.twimg.com/ext_tw_video/example.mp4' },
    ],
    media: ['https://video.twimg.com/ext_tw_video/example.mp4'],
  }, { twitterStyle: 'new' });

  const components = payload.components[0].toJSON().components;
  const body = components.find((component) => component.type === ComponentType.TextDisplay
    && component.content.includes('…')
    && !component.content.includes('Long post'));
  assert.ok(body);
  const [description, engagement] = body.content.split('\n\n');
  assert.equal(description.length, 1024);
  assert.ok(description.endsWith('…'));
  assert.equal(engagement, '-# 💬1 🔁2 ❤3');
});

test('renders Twitter default style with direct image embeds and a rewritten video link', async () => {
  let payload;
  const channelMessages = [];
  const renderer = new DiscordRenderer();
  await renderer.send({
    deletable: false,
    async reply(value) { payload = value; return {}; },
    channel: { async send(value) { channelMessages.push(value); } },
  }, {
    provider: 'twitter',
    embed: {
      title: 'Post',
      url: 'https://x.com/example/status/1',
      image: 'https://mosaic.fxtwitter.com/jpeg/1/one/two',
    },
    images: ['https://mosaic.fxtwitter.com/jpeg/1/one/two'],
    twitterGalleryMedia: [
      { type: 'image', url: 'https://img.test/1.jpg?name=orig' },
      { type: 'video', url: 'https://video.twimg.com/amplify_video/1/vid/avc1/640x360/example.mp4?tag=29' },
      { type: 'image', url: 'https://img.test/2.jpg?name=orig' },
    ],
    media: ['https://video.twimg.com/amplify_video/1/vid/avc1/640x360/example.mp4?tag=29'],
    suppressOriginal: false,
  });

  assert.equal(payload.flags, undefined);
  assert.equal(payload.components, undefined);
  assert.deepEqual(payload.embeds.map((embed) => embed.toJSON().image.url), [
    'https://img.test/1.jpg?name=large',
    'https://img.test/2.jpg?name=large',
  ]);
  assert.equal(
    channelMessages[0].content,
    '[連結](https://vxtwitter.com/tvid/amplify_video/1/vid/avc1/640x360/example)',
  );
});

test('Twitter new style matches the default multi-embed layout for image-only galleries', async () => {
  const render = async (twitterStyle) => {
    let replyPayload;
    await new DiscordRenderer().send({
      deletable: false,
      async reply(payload) { replyPayload = payload; return {}; },
      channel: { async send() { throw new Error('image-only galleries must not send follow-up links'); } },
    }, {
      provider: 'twitter',
      canonicalUrl: 'https://x.com/example/status/123',
      iconUrl: 'https://example.test/twitter.png',
      embed: {
        title: 'Three photos',
        url: 'https://x.com/example/status/123',
        description: 'individual images',
        image: 'https://mosaic.fxtwitter.com/jpeg/123/one/two/three',
        footer: '💬1 🔁1 ❤1',
      },
      images: ['https://mosaic.fxtwitter.com/jpeg/123/one/two/three'],
      twitterGalleryMedia: [
        { type: 'image', url: 'https://pbs.twimg.com/media/one.jpg?name=orig' },
        { type: 'image', url: 'https://pbs.twimg.com/media/two.jpg?name=orig' },
        { type: 'image', url: 'https://pbs.twimg.com/media/three.jpg?name=orig' },
      ],
    }, { twitterStyle });
    return replyPayload;
  };

  const defaultPayload = await render('default');
  const newPayload = await render('new');

  assert.equal(newPayload.flags, undefined);
  assert.equal(newPayload.components, undefined);
  assert.equal(newPayload.embeds.length, 3);
  assert.equal(newPayload.embeds[0].toJSON().title, 'Three photos');
  assert.deepEqual(
    newPayload.embeds.map((embed) => embed.toJSON()),
    defaultPayload.embeds.map((embed) => embed.toJSON()),
  );
});

test('a blank footer falls back to the default name instead of throwing', () => {
  for (const footer of ['   ', '\n\t', '', undefined, null]) {
    assert.equal(createEmbed({ title: 'x', footer }).data.footer.text, 'ermiana');
  }
  assert.equal(createEmbed({ title: 'x', footer: '💬1 🔁2 ❤️3' }).data.footer.text, '💬1 🔁2 ❤️3');
});
