import assert from 'node:assert/strict';
import test from 'node:test';
import { bahamutProvider } from '../../../src/providers/bahamut.js';
import { bilibiliProvider } from '../../../src/providers/bilibili.js';
import { blueskyProvider } from '../../../src/providers/bluesky.js';
import { ehentaiProvider } from '../../../src/providers/ehentai.js';
import { facebookProvider } from '../../../src/providers/facebook.js';
import { instagramProvider } from '../../../src/providers/instagram.js';
import { misskeyProvider } from '../../../src/providers/misskey.js';
import { nhentaiProvider } from '../../../src/providers/nhentai.js';
import { pchomeProvider } from '../../../src/providers/pchome.js';
import { pixivProvider } from '../../../src/providers/pixiv.js';
import { plurkProvider } from '../../../src/providers/plurk.js';
import { pttProvider } from '../../../src/providers/ptt.js';
import { threadsProvider } from '../../../src/providers/threads.js';
import { tiktokProvider } from '../../../src/providers/tiktok.js';
import { twitterProvider } from '../../../src/providers/twitter.js';

function match(provider, url) {
  for (const pattern of provider.patterns) {
    const result = pattern.exec(url);
    if (result) return result;
  }
  throw new Error(`Fixture URL does not match ${provider.id}`);
}

const quietLogger = { warn() {}, info() {}, debug() {}, error() {} };

test('only the selected providers define preview cache TTLs', () => {
  const cached = [
    [twitterProvider, 3600],
    [plurkProvider, 1800],
    [bahamutProvider, 1800],
    [pttProvider, 1800],
    [pixivProvider, 7200],
    [nhentaiProvider, 7200],
    [ehentaiProvider, 7200],
  ];
  for (const [provider, ttlSeconds] of cached) {
    assert.equal(provider.ttlSeconds, ttlSeconds, provider.id);
    assert.equal(typeof provider.cacheKey, 'function', provider.id);
    assert.equal('staleTtlSeconds' in provider, false, provider.id);
  }

  for (const provider of [
    blueskyProvider,
    pchomeProvider,
    misskeyProvider,
    tiktokProvider,
    facebookProvider,
    bilibiliProvider,
    threadsProvider,
    instagramProvider,
  ]) {
    assert.equal('ttlSeconds' in provider, false, provider.id);
    assert.equal('staleTtlSeconds' in provider, false, provider.id);
    assert.equal('cacheKey' in provider, false, provider.id);
  }
});

test('Twitter provider maps FXTwitter media and engagement', async () => {
  const url = 'https://x.com/example/status/123';
  const preview = await twitterProvider.resolve({
    match: match(twitterProvider, url),
    logger: quietLogger,
    http: { async getJson() { return { tweet: {
      text: 'hello', replies: 1, retweets: 2, likes: 3, created_timestamp: 1700000000,
      url, author: { screen_name: 'example', name: 'Example', avatar_url: 'https://img.test/avatar.jpg' },
      media: { photos: [{ url: 'https://img.test/photo.jpg' }], all: [{ type: 'photo', url: 'https://img.test/photo.jpg' }] },
    } }; } },
  });
  assert.equal(preview.embed.title, 'Example');
  assert.equal(preview.embed.footer, '💬1 🔁2 ❤️3');
  assert.equal(preview.images[0], 'https://img.test/photo.jpg?name=large');
});

test('Bluesky provider maps multiple images', async () => {
  const url = 'https://bsky.app/profile/example.com/post/3kabcdefghij';
  const preview = await blueskyProvider.resolve({
    match: match(blueskyProvider, url), logger: quietLogger,
    http: { async getJson() { return { posts: [{
      author: { displayName: 'Blue', avatar: 'https://img.test/a.jpg' }, record: { text: 'sky' },
      replyCount: 1, repostCount: 2, likeCount: 3,
      embed: { $type: 'app.bsky.embed.images#view', images: [
        { fullsize: 'https://img.test/1.jpg' },
        { fullsize: 'https://img.test/2.jpg' },
        { fullsize: 'https://img.test/3.jpg' },
        { fullsize: 'https://img.test/4.jpg' },
        { fullsize: 'https://img.test/5.jpg' },
      ] },
    }] }; } },
  });
  assert.equal(preview.images.length, 4);
  assert.equal(preview.images.at(-1), 'https://img.test/4.jpg');
  assert.equal(preview.embed.footer, '💬1 🔁2 ❤️3');
});

test('Pixiv provider stores only the first URL and total page count', async () => {
  const url = 'https://www.pixiv.net/artworks/42';
  const preview = await pixivProvider.resolve({
    match: match(pixivProvider, url), logger: quietLogger,
    http: { async getJson() { return { error: false, body: {
      title: 'Artwork', pageCount: 3, bookmarkCount: 9, userName: 'Artist', userId: '7',
      urls: { regular: 'https://i.pximg.net/img/42_p0.jpg' },
      tags: { tags: [{ tag: 'cat' }] }, extraData: { meta: { twitter: { description: 'desc' } } },
    } }; } },
  });
  assert.deepEqual(preview.images, ['https://pixiv.canaria.cc/img/42_p0.jpg']);
  assert.deepEqual(preview.pagination, { type: 'pixiv-url', totalPages: 3 });
});

test('Bahamut provider extracts Open Graph data', async () => {
  const url = 'https://forum.gamer.com.tw/C.php?bsn=60076&snA=12';
  const cookieCalls = [];
  let requests = 0;
  const preview = await bahamutProvider.resolve({
    match: match(bahamutProvider, url), logger: quietLogger,
    services: { bahaSession: { async getCookie(options = {}) {
      cookieCalls.push(Boolean(options.force));
      return 'BAHAENUR=a; BAHARUNE=b';
    } } },
    http: { async getText() {
      requests += 1;
      if (requests === 1) return '<html>expired session</html>';
      return '<meta property="og:title" content="Title"><meta property="og:description" content="Desc"><meta property="og:image" content="https://img.test/baha.jpg">';
    } },
  });
  assert.equal(preview.embed.title, 'Title');
  assert.equal(preview.images[0], 'https://img.test/baha.jpg');
  assert.deepEqual(cookieCalls, [false, true]);
});

test('E-Hentai provider groups translated tags from the batching service', async () => {
  const url = 'https://e-hentai.org/g/123/abcdef';
  const preview = await ehentaiProvider.resolve({
    match: match(ehentaiProvider, url),
    services: { ehentaiApi: { async getGallery() { return {
      title: 'Gallery', category: 'Manga', rating: '4.5', uploader: 'user', thumb: 'https://img.test/eh.jpg',
      tags: ['artist:one', 'artist:two', 'language:chinese'],
    }; } } },
  });
  assert.match(preview.embed.fields.at(-1).value, /繪師: one, two/);
});

test('Plurk provider sanitizes content and supports multiple images', async () => {
  const url = 'https://www.plurk.com/p/abc123';
  const html = `<div class="name">Plurker</div><div class="text_holder">hello<br>world</div><script>{"replurkers_count": 2,"favorite_count": 3,"response_count": 1,"page_user": {"id": 12,"avatar": 4,"nick_name": "fox"},"content_raw":"https://images.plurk.com/a.jpg https://images.plurk.com/b.jpg"}</script>`;
  const preview = await plurkProvider.resolve({ match: match(plurkProvider, url), http: { async getText() { return html; } } });
  assert.equal(preview.embed.description, 'hello\nworld');
  assert.equal(preview.images.length, 2);
});

test('PChome provider parses JSONP product and description responses', async () => {
  const url = 'https://24h.pchome.com.tw/prod/DRAAAA-A900AAAAA';
  const http = { async getText(requestUrl) {
    if (requestUrl.includes('/desc')) return 'try{jsonp_desc({"DRAAAA-A900AAAAA":{"Meta":{"BrandNames":["Brand"]},"SloganInfo":["Fast","Good"]}});}catch(e){console.log(e);}';
    return 'try{jsonp_prod({"DRAAAA-A900AAAAA":{"Nick":"<b>Product</b>","Price":{"P":999},"Pic":{"B":"/items/pic.jpg"}}});}catch(e){console.log(e);}';
  } };
  const preview = await pchomeProvider.resolve({ match: match(pchomeProvider, url), http });
  assert.equal(preview.embed.title, 'Product');
  assert.equal(preview.embed.fields[1].value, '999');
});

test('PChome provider prefers Name over a promotional Nick without requesting the product page', async () => {
  const url = 'https://24h.pchome.com.tw/prod/DRAHI2-A900H3OMM';
  const requestedUrls = [];
  const http = { async getText(requestUrl) {
    requestedUrls.push(requestUrl);
    if (requestUrl.includes('/desc')) return 'jsonp_desc({"DRAHI2-A900H3OMM-000":{"Meta":{},"SloganInfo":[]}})';
    return 'jsonp_prod({"DRAHI2-A900H3OMM-000":{"Name":"WD BLACK 黑標 SN850X 1TB Gen4 NVMe PCIe SSD固態硬碟(WDS100T2X0E)","Nick":"<b>★編織購物袋(限量)★</b>"}})';
  } };
  const preview = await pchomeProvider.resolve({ match: match(pchomeProvider, url), http });
  assert.equal(preview.embed.title, 'WD BLACK 黑標 SN850X 1TB Gen4 NVMe PCIe SSD固態硬碟(WDS100T2X0E)');
  assert.equal(requestedUrls.length, 2);
  assert.ok(requestedUrls.every((requestUrl) => requestUrl !== url));
});

test('Misskey provider filters files by MIME type', async () => {
  const url = 'https://misskey.io/notes/abcdefghij';
  const preview = await misskeyProvider.resolve({
    match: match(misskeyProvider, url),
    http: { async postJson() { return {
      text: 'note', repliesCount: 1, renoteCount: 2, reactions: { like: 4 },
      user: { username: 'user', name: 'User', avatarUrl: 'https://img.test/a.jpg' },
      files: [{ type: 'application/pdf', url: 'https://img.test/a.pdf' }, { type: 'image/png', url: 'https://img.test/a.png' }],
    }; } },
  });
  assert.deepEqual(preview.images, ['https://img.test/a.png']);
});

test('TikTok provider delegates preview-site selection without per-video cache metadata', async () => {
  const url = 'https://www.tiktok.com/@example/video/123';
  let selectedUrl;
  const preview = await tiktokProvider.resolve({
    match: match(tiktokProvider, url),
    services: { tiktokPreviewSite: { async getPreviewUrl(originalUrl) {
      selectedUrl = originalUrl;
      return originalUrl.replace('tiktok.com', 'tnktok.com');
    } } },
  });
  assert.equal(preview.content, 'https://www.tnktok.com/@example/video/123');
  assert.equal(selectedUrl, url);
});

test('TikTok provider returns no preview when both preview sites are unavailable', async () => {
  const url = 'https://www.tiktok.com/@example/video/456';
  const preview = await tiktokProvider.resolve({
    match: match(tiktokProvider, url),
    services: { tiktokPreviewSite: { async getPreviewUrl() { return null; } } },
  });
  assert.equal(preview, null);
});

test('Bilibili provider rewrites a BV URL to vxbilibili with page one by default', async () => {
  const url = 'https://www.bilibili.com/video/BV1UmK36aED9';
  let selectedUrl;
  const preview = await bilibiliProvider.resolve({
    match: match(bilibiliProvider, url),
    services: { bilibiliPreviewSite: { async getPreviewUrl(candidateUrl) {
      selectedUrl = candidateUrl;
      return candidateUrl;
    } } },
  });
  assert.equal(selectedUrl, 'https://www.vxbilibili.com/video/BV1UmK36aED9?p=1');
  assert.equal(preview.content, selectedUrl);
  assert.equal(preview.canonicalUrl, url);
});

test('Bilibili provider preserves a valid multipart page and discards unrelated query parameters', async () => {
  const url = 'https://www.bilibili.com/video/BV1UmK36aED9?p=3&spm_id_from=333.1007';
  const preview = await bilibiliProvider.resolve({
    match: match(bilibiliProvider, url),
    services: { bilibiliPreviewSite: { async getPreviewUrl(candidateUrl) { return candidateUrl; } } },
  });
  assert.equal(preview.content, 'https://www.vxbilibili.com/video/BV1UmK36aED9?p=3');
});

test('Bilibili provider rewrites opus URLs without calling the removed API', async () => {
  const url = 'https://www.bilibili.com/opus/123';
  const preview = await bilibiliProvider.resolve({
    match: match(bilibiliProvider, url),
    services: { bilibiliPreviewSite: { async getPreviewUrl(candidateUrl) { return candidateUrl; } } },
  });
  assert.equal(preview.content, 'https://www.vxbilibili.com/opus/123');
});

test('Bilibili provider returns no preview while vxbilibili is unavailable', async () => {
  const url = 'https://www.bilibili.com/video/BV1UmK36aED9';
  const preview = await bilibiliProvider.resolve({
    match: match(bilibiliProvider, url),
    services: { bilibiliPreviewSite: { async getPreviewUrl() { return null; } } },
  });
  assert.equal(preview, null);
});

test('PTT provider fetches the source directly and builds its own preview', async () => {
  const url = 'https://www.ptt.cc/bbs/C_Chat/M.1745505996.A.757.html';
  let request;
  const html = `<html><head>
    <meta property="og:title" content="[閒聊] PTT 標題">
    <meta property="og:description" content="原始 OG 摘要">
  </head><body><div id="main-content">
    <div class="article-metaline"><span class="article-meta-tag">作者</span><span class="article-meta-value">seria (Seria)</span></div>
    <div class="article-metaline"><span class="article-meta-tag">看板</span><span class="article-meta-value">C_Chat</span></div>
    <div class="article-metaline"><span class="article-meta-tag">標題</span><span class="article-meta-value">文章標題</span></div>
    <div class="article-metaline"><span class="article-meta-tag">時間</span><span class="article-meta-value">Thu Apr 24 23:13:16 2025</span></div>
    第一段內文
    https://img.test/one.jpg
    <a href="https://img.test/two.png?size=large">https://img.test/two.png?size=large</a>
    <div class="push"><span>推</span><span>這是推文，不應進摘要</span></div>
    --
  </div></body></html>`;
  const preview = await pttProvider.resolve({
    match: match(pttProvider, url),
    http: { async getText(requestUrl, options) {
      request = { requestUrl, options };
      return html;
    } },
  });
  assert.equal(request.requestUrl, url);
  assert.equal(request.options.headers.cookie, 'over18=1');
  assert.equal(preview.canonicalUrl, url);
  assert.equal(preview.embed.title, '[閒聊] PTT 標題');
  assert.equal(preview.embed.color, 0x4d4e55);
  assert.equal(preview.embed.author.name, 'seria (Seria)');
  assert.equal(preview.embed.description, '第一段內文');
  assert.equal(preview.embed.timestamp, '2025-04-24T15:13:16.000Z');
  assert.deepEqual(preview.images, ['https://img.test/one.jpg', 'https://img.test/two.png?size=large']);
  assert.equal(preview.content, undefined);
});

test('PTT provider falls back to article metadata and normalizes board casing only in its cache key', async () => {
  const url = 'http://ptt.cc/bbs/gossiping/M.1745505996.A.757.html';
  const html = `<div id="main-content">
    <div class="article-metaline"><span class="article-meta-tag">作者</span><span class="article-meta-value">author</span></div>
    <div class="article-metaline"><span class="article-meta-tag">看板</span><span class="article-meta-value">Gossiping</span></div>
    <div class="article-metaline"><span class="article-meta-tag">標題</span><span class="article-meta-value">文章標題</span></div>
    <div class="article-metaline"><span class="article-meta-tag">時間</span><span class="article-meta-value">invalid date</span></div>
  </div>`;
  let requestedUrl;
  const preview = await pttProvider.resolve({
    match: match(pttProvider, url),
    http: { async getText(value) { requestedUrl = value; return html; } },
  });
  assert.equal(requestedUrl, 'https://www.ptt.cc/bbs/gossiping/M.1745505996.A.757.html');
  assert.equal(preview.embed.title, '文章標題');
  assert.equal(preview.embed.timestamp, undefined);
  assert.equal(pttProvider.cacheKey(match(pttProvider, url)), 'gossiping/M.1745505996.A.757');
});

test('PTT provider removes blank lines when every content line is uniformly separated', async () => {
  const url = 'https://www.ptt.cc/bbs/C_Chat/M.1745505996.A.757.html';
  const body = `第一行\r\n\r\n   \r\n第二行\n${'字'.repeat(1200)}`;
  const html = `<html><head><meta property="og:title" content="標題"></head><body>
    <div id="main-content">${body}</div>
  </body></html>`;
  const preview = await pttProvider.resolve({
    match: match(pttProvider, url),
    http: { async getText() { return html; } },
  });

  assert.equal(preview.embed.description, '第一行\n第二行');
});

test('PTT provider preserves blank lines when line spacing is mixed', async () => {
  const url = 'https://www.ptt.cc/bbs/C_Chat/M.1745505996.A.757.html';
  const html = `<html><head><meta property="og:title" content="標題"></head><body>
    <div id="main-content">第一行\n\n第二行\n第三行</div>
  </body></html>`;
  const preview = await pttProvider.resolve({
    match: match(pttProvider, url),
    http: { async getText() { return html; } },
  });

  assert.equal(preview.embed.description, '第一行\n\n第二行\n第三行');
});

test('PTT provider drops the line whose fifth character reaches the 420 character limit', async () => {
  const url = 'https://www.ptt.cc/bbs/C_Chat/M.1745505996.A.757.html';
  const completeLine = '字'.repeat(414);
  const html = `<html><head><meta property="og:title" content="標題"></head><body>
    <div id="main-content">${completeLine}\n這行第五字到上限，整行不顯示</div>
  </body></html>`;
  const preview = await pttProvider.resolve({
    match: match(pttProvider, url),
    http: { async getText() { return html; } },
  });

  assert.equal(preview.embed.description, completeLine);
});

test('PTT provider intentionally omits its description when the first line exceeds 420 characters', async () => {
  const url = 'https://www.ptt.cc/bbs/C_Chat/M.1745505996.A.757.html';
  const html = `<html><head><meta property="og:title" content="標題"></head><body>
    <div id="main-content">${'字'.repeat(421)}\n第二行</div>
  </body></html>`;
  const preview = await pttProvider.resolve({
    match: match(pttProvider, url),
    http: { async getText() { return html; } },
  });

  assert.equal(preview.embed.description, undefined);
});

test('PTT provider outputs at most twelve lines after blank-line processing', async () => {
  const url = 'https://www.ptt.cc/bbs/C_Chat/M.1745505996.A.757.html';
  const lines = Array.from({ length: 13 }, (_value, index) => `第${index + 1}行`);
  const html = `<html><head><meta property="og:title" content="標題"></head><body>
    <div id="main-content">${lines.join('\n\n')}</div>
  </body></html>`;
  const preview = await pttProvider.resolve({
    match: match(pttProvider, url),
    http: { async getText() { return html; } },
  });

  assert.equal(preview.embed.description, lines.slice(0, 12).join('\n'));
  assert.equal(preview.embed.description.split('\n').length, 12);
});

test('PTT provider stops parsing at the posting-station marker', async () => {
  const url = 'https://www.ptt.cc/bbs/C_Chat/M.1745505996.A.757.html';
  const html = `<html><head><meta property="og:title" content="標題"></head><body>
    <div id="main-content">本文
      <span class="f2">※ 發信站: 批踢踢實業坊(ptt.cc)</span>
      不應讀取的內容 https://img.test/after-marker.jpg
      <div class="push">不應解析的推文</div>
    </div>
  </body></html>`;
  const preview = await pttProvider.resolve({
    match: match(pttProvider, url),
    http: { async getText() { return html; } },
  });

  assert.equal(preview.embed.description, '本文');
  assert.deepEqual(preview.images, []);
});

test('PTT provider ignores posting-station text in head metadata and quoted article text', async () => {
  const url = 'https://www.ptt.cc/bbs/C_Chat/M.1788328219.A.4C9.html';
  const marker = '※ 發信站: 批踢踢實業坊(ptt.cc)';
  const html = `<html><head>
    <meta name="description" content="短文 -- ${marker}">
    <meta property="og:description" content="短文 -- ${marker}">
    <meta property="og:title" content="Re: [閒聊] 標題">
  </head><body><div id="main-content">
<div class="article-metaline"><span class="article-meta-tag">作者</span><span class="article-meta-value">author</span></div>
: ${marker}
這是真正想說的回文
<span class="f2">${marker}, 來自: 127.0.0.1</span>
不應解析的尾端
</div></body></html>`;
  const preview = await pttProvider.resolve({
    match: match(pttProvider, url),
    http: { async getText() { return html; } },
  });

  assert.equal(preview.embed.title, 'Re: [閒聊] 標題');
  assert.equal(preview.embed.description, `: ${marker}\n這是真正想說的回文`);
});

test('Facebook provider delegates canonical resolution and uses the generic fallback preview', async () => {
  const url = 'https://www.facebook.com/share/p/19bbiazEgn/';
  const canonicalUrl = 'https://www.facebook.com/SEMITaiwan/posts/1499389988889744';
  const previewUrl = 'https://facebed.com/SEMITaiwan/posts/1499389988889744';
  let selectedUrl;
  const preview = await facebookProvider.resolve({
    match: match(facebookProvider, url),
    services: { facebookPreviewSite: { async resolve(originalUrl) {
      selectedUrl = originalUrl;
      return { canonicalUrl, previewUrl };
    } } },
  });
  assert.equal(selectedUrl, url);
  assert.equal(preview.canonicalUrl, canonicalUrl);
  assert.equal(preview.content, previewUrl);
  assert.equal(preview.suppressOriginal, true);
});

test('Facebook provider returns no preview when Facebed cannot resolve the post', async () => {
  const url = 'https://www.facebook.com/share/p/missing/';
  const preview = await facebookProvider.resolve({
    match: match(facebookProvider, url),
    services: { facebookPreviewSite: { async resolve() { return null; } } },
  });
  assert.equal(preview, null);
});

test('nHentai provider maps v2 gallery metadata and sequential page URLs', async () => {
  const url = 'https://nhentai.net/g/633830';
  const preview = await nhentaiProvider.resolve({
    match: match(nhentaiProvider, url),
    http: { async getJson(requestUrl) {
      assert.equal(requestUrl, 'https://nhentai.net/api/v2/galleries/633830');
      return {
        id: 633830,
        media_id: '3816046',
        title: { english: 'English', japanese: 'Japanese', pretty: 'Gallery' },
        num_pages: 3,
        num_favorites: 99,
        tags: [
          { type: 'category', name: 'doujinshi' },
          { type: 'artist', name: 'one' },
          { type: 'artist', name: 'two' },
          { type: 'language', name: 'chinese' },
        ],
        pages: [1, 2, 3].map((page) => ({ path: `galleries/3816046/${page}.webp` })),
      };
    } },
  });

  assert.equal(preview.canonicalUrl, url);
  assert.equal(preview.embed.title, 'Japanese');
  assert.equal(preview.embed.color, 0xec2353);
  assert.deepEqual(preview.images, ['https://i.nhentai.net/galleries/3816046/1.webp']);
  assert.deepEqual(preview.pagination, { type: 'nhentai-url', totalPages: 3 });
  assert.deepEqual(preview.embed.fields.slice(0, 3).map(({ name, value }) => [name, value]), [
    ['類別', 'doujinshi'], ['收藏', '99'], ['頁數', '3'],
  ]);
  assert.match(preview.embed.fields.at(-1).value, /繪師: one, two/);
  assert.doesNotMatch(preview.embed.fields.at(-1).value, /類別|doujinshi/);
});

test('nHentai provider normalizes leading zeros in cache keys', () => {
  const url = 'https://nhentai.net/g/00042';
  assert.equal(nhentaiProvider.cacheKey(match(nhentaiProvider, url)), '42');
});

test('nHentai provider disables generated pagination for non-sequential API paths', async () => {
  const url = 'https://www.nhentai.net/g/42/';
  const preview = await nhentaiProvider.resolve({
    match: match(nhentaiProvider, url),
    http: { async getJson() { return {
      id: 42,
      media_id: '7',
      title: { pretty: 'Gallery' },
      num_pages: 2,
      pages: [
        { path: 'galleries/7/1.webp' },
        { path: 'galleries/7/2.png' },
      ],
      tags: [],
    }; } },
  });

  assert.deepEqual(preview.images, ['https://i.nhentai.net/galleries/7/1.webp']);
  assert.equal(preview.pagination, undefined);
});

test('nHentai provider falls back to the full English title when Japanese is unavailable', async () => {
  const url = 'https://nhentai.net/g/42';
  const preview = await nhentaiProvider.resolve({
    match: match(nhentaiProvider, url),
    http: { async getJson() { return {
      id: 42,
      media_id: '7',
      title: { english: 'Full English Title', japanese: '', pretty: 'Short Title' },
      num_pages: 1,
      pages: [{ path: 'galleries/7/1.webp' }],
      tags: [],
    }; } },
  });

  assert.equal(preview.embed.title, 'Full English Title');
});

test('PTT provider uses a generic board title for a real article container without title metadata', async () => {
  const url = 'https://www.ptt.cc/bbs/Gossiping/M.1787026603.A.A47.html';
  const html = `<html><head><title>閱讀文章 - 看板 Gossiping - 批踢踢實業坊</title></head><body>
    <div id="main-content">ASCII art 內文</div>
  </body></html>`;
  const preview = await pttProvider.resolve({
    match: match(pttProvider, url),
    http: { async getText() { return html; } },
  });

  assert.equal(preview.embed.title, 'PTT / Gossiping');
  assert.equal(preview.embed.description, 'ASCII art 內文');
});

test('PTT provider starts Gossiping news previews after the full-body marker', async () => {
  const resolve = (board, content, title = '[新聞] 標題') => {
    const url = `https://www.ptt.cc/bbs/${board}/M.1788318074.A.102.html`;
    const html = `<html><head><meta property="og:title" content="${title}"></head><body>
      <div id="main-content">
        <div class="article-metaline"><span class="article-meta-tag">看板</span><span class="article-meta-value">${board}</span></div>
        ${content}
      </div>
    </body></html>`;
    return pttProvider.resolve({
      match: match(pttProvider, url),
      http: { async getText() { return html; } },
    });
  };

  const gossiping = await resolve('Gossiping', `1.媒體來源: 媒體
<a href="https://img.test/before.jpg">https://img.test/before.jpg</a>
4.完整新聞內文:
這才是新聞正文
<a href="https://img.test/body.jpg">正文圖片</a>`);
  assert.equal(gossiping.embed.description, '這才是新聞正文\n正文圖片');
  assert.deepEqual(gossiping.images, ['https://img.test/body.jpg']);

  const withoutMarker = await resolve('Gossiping', '沒有標記的內文');
  assert.equal(withoutMarker.embed.description, '沒有標記的內文');

  const fullWidth = await resolve('Gossiping', '4.完整新聞內文：\n全形冒號正文');
  assert.equal(fullWidth.embed.description, '全形冒號正文');

  const spaced = await resolve('Gossiping', '4. 完整新聞內文 :\n空白變體正文');
  assert.equal(spaced.embed.description, '空白變體正文');

  const announcement = await resolve('Gossiping', '公告前文\n4.完整新聞內文:\n公告後文', '[公告] 新聞格式');
  assert.equal(announcement.embed.description, '公告前文\n4.完整新聞內文:\n公告後文');

  for (const prefix of ['Re:', 'Fw:']) {
    const forwarded = await resolve('Gossiping', '1.媒體來源\n4.完整新聞內文:\n引用正文', `${prefix} [新聞] 標題`);
    assert.equal(forwarded.embed.description, '1.媒體來源\n4.完整新聞內文:\n引用正文');
  }

  const stock = await resolve('Stock', '分析前言\n4.完整新聞內文:\n後續內容');
  assert.equal(stock.embed.description, '分析前言\n4.完整新聞內文:\n後續內容');
});

test('Threads provider supports both current and legacy domains', async () => {
  for (const domain of ['threads.com', 'threads.net']) {
    const url = `https://www.${domain}/@example/post/ABC_def-123`;
    const preview = await threadsProvider.resolve({
      match: match(threadsProvider, url),
      services: { threadsPreviewSite: { async getPreviewUrl() {
        return 'https://threads.canaria.cc/@example/post/ABC_def-123';
      } } },
    });
    assert.equal(preview.canonicalUrl, url);
    assert.equal(preview.content, 'https://threads.canaria.cc/@example/post/ABC_def-123');
  }
});

test('Instagram provider delegates post, reel, user-post, and story URLs', async () => {
  const urls = [
    'https://www.instagram.com/p/ABC_def-123/',
    'https://instagram.com/reel/ABC_def-123',
    'https://www.instagram.com/example/reels/ABC_def-123/2',
    'https://www.instagram.com/stories/example/123456789/',
  ];
  for (const url of urls) {
    const preview = await instagramProvider.resolve({
      match: match(instagramProvider, url),
      services: { instagramPreviewSite: { async getPreviewUrl(originalUrl) {
        return originalUrl.replace('instagram.com', 'oginstagram.com');
      } } },
    });
    assert.equal(preview.canonicalUrl, url);
    assert.equal(preview.content, url.replace('instagram.com', 'oginstagram.com'));
  }
});

test('rewritten-link providers return no preview when their services are unavailable', async () => {
  const fixtures = [
    [threadsProvider, 'https://www.threads.com/@example/post/ABC123', 'threadsPreviewSite'],
    [instagramProvider, 'https://www.instagram.com/p/ABC123/', 'instagramPreviewSite'],
  ];
  for (const [provider, url, serviceName] of fixtures) {
    const preview = await provider.resolve({
      match: match(provider, url),
      services: { [serviceName]: { async getPreviewUrl() { return null; } } },
    });
    assert.equal(preview, null, provider.id);
  }
});

test('Bahamut reads Open Graph from the head without parsing the thread body', async () => {
  const url = 'https://forum.gamer.com.tw/C.php?bsn=60076&snA=5288773&tnum=13756';
  const head = '<html><head><meta property="og:title" content="標題">'
    + '<meta property="og:description" content="內文">'
    + '<meta property="og:image" content="https://img.test/baha.jpg"></head>';
  const thread = `${head}<body>${'<div class="c-post">留言內容</div>'.repeat(40000)}</body></html>`;

  const startedAt = performance.now();
  const preview = await bahamutProvider.resolve({
    match: match(bahamutProvider, url), logger: quietLogger,
    services: { bahaSession: { async getCookie() { return 'BAHAENUR=a; BAHARUNE=b'; } } },
    http: { async getText() { return thread; } },
  });
  const elapsedMs = performance.now() - startedAt;

  assert.equal(preview.embed.title, '標題');
  assert.equal(preview.embed.description, '內文');
  assert.equal(preview.images[0], 'https://img.test/baha.jpg');
  assert.ok(elapsedMs < 60, `parsing a ${Math.round(thread.length / 1024)}KB thread took ${elapsedMs.toFixed(0)}ms`);
});

test('Bahamut falls back to the whole document when the head is incomplete', async () => {
  const url = 'https://forum.gamer.com.tw/C.php?bsn=60076&snA=12';
  const resolve = (html) => bahamutProvider.resolve({
    match: match(bahamutProvider, url), logger: quietLogger,
    services: { bahaSession: { async getCookie() { return 'BAHAENUR=a; BAHARUNE=b'; } } },
    http: { async getText() { return html; } },
  });

  const outsideHead = '<html><head><meta property="og:title" content="標題">'
    + '<meta property="og:description" content="內文"></head>'
    + '<body><meta property="og:image" content="https://img.test/late.jpg"></body></html>';
  assert.equal((await resolve(outsideHead)).images[0], 'https://img.test/late.jpg');

  const scripted = '<html><head><script>var s = "</head>";</script>'
    + '<meta property="og:title" content="標題"><meta property="og:description" content="內文">'
    + '<meta property="og:image" content="https://img.test/baha.jpg"></head><body>x</body></html>';
  assert.equal((await resolve(scripted)).embed.title, '標題');
  assert.equal((await resolve(scripted)).images[0], 'https://img.test/baha.jpg');

  await assert.rejects(() => resolve('<html><head><title>t</title></head><body>x</body></html>'), /no Open Graph title/);
});
