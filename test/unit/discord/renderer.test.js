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
    media: ['https://example.test/(video).mp4?next=(1)'],
    suppressOriginal: true,
  }, { spoiler: true });
  const components = replyPayload.components[0].toJSON().components;
  assert.equal(replyPayload.content, '||https://www.pixiv.net/artworks/42||');
  assert.equal(components[0].custom_id, PAGINATION_IDS.cycle);
  assert.equal(components[1].url, 'https://example.test/2.jpg');
  assert.equal(
    channelMessages[0].content,
    '||[連結](https://example.test/%28video%29.mp4?next=%281%29)||',
  );
  assert.equal(suppressed, true);
});

test('rewritten previews retry a fallback URL after Discord rejects an oversized payload', async () => {
  const replies = [];
  const error = Object.assign(new Error('Request entity too large'), { code: 40005 });
  const reply = await new DiscordRenderer().send({
    deletable: false,
    async reply(payload) {
      replies.push(payload);
      if (replies.length === 1) throw error;
      return { id: 'fallback-reply' };
    },
    channel: { async send() {} },
  }, {
    canonicalUrl: 'https://www.threads.com/@example/post/ABC',
    content: 'https://www.vxthreads.com/@example/post/ABC',
    discordRetryContent: 'https://fixthreads.seria.moe/@example/post/ABC',
    suppressOriginal: true,
  }, { spoiler: true });

  assert.equal(reply.id, 'fallback-reply');
  assert.deepEqual(replies.map(({ content }) => content), [
    '||https://www.vxthreads.com/@example/post/ABC||',
    '||https://fixthreads.seria.moe/@example/post/ABC||',
  ]);
});

test('rewritten previews do not retry fallback URLs for unrelated Discord errors', async () => {
  let attempts = 0;
  const failure = Object.assign(new Error('Missing permissions'), { code: 50013 });
  await assert.rejects(new DiscordRenderer().send({
    async reply() { attempts += 1; throw failure; },
    channel: { async send() {} },
  }, {
    content: 'https://www.vxthreads.com/@example/post/ABC',
    discordRetryContent: 'https://fixthreads.seria.moe/@example/post/ABC',
  }), (error) => error === failure);
  assert.equal(attempts, 1);
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
    ['😀', '@example', `## 😀 [(@example)](${url})`],
    ['😀 User', '@example', `## 😀 User [(@example)](${url})`],
    ['User 😀', '@example', `## [User](${url}) 😀`],
    ['User', '@example', `## [User](${url})`],
    ['User [Official]', '@example', `## [User [\u200BOfficial]\u200B](${url})`],
    ['😀 Tsuki', '@_tsuki_', `## 😀 Tsuki [開啟推文](${url})`, '-# :bird: @\\_tsuki\\_'],
  ];

  for (const [title, handle, expected, expectedFooter] of cases) {
    let replyPayload;
    await new DiscordRenderer().send({
      deletable: false,
      async reply(payload) { replyPayload = payload; return {}; },
      channel: { async send() { throw new Error('new gallery must not send follow-up links'); } },
    }, {
      provider: 'twitter',
      embed: { title, url, author: { name: handle } },
      twitterGalleryMedia: [
        { type: 'video', url: 'https://video.twimg.com/ext_tw_video/example.mp4' },
      ],
      media: ['https://video.twimg.com/ext_tw_video/example.mp4'],
    }, { twitterStyle: 'new' });

    const components = replyPayload.components[0].toJSON().components;
    assert.equal(components[0].content, expected);
    if (expectedFooter) assert.equal(components.at(-1).content, expectedFooter);
  }
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
