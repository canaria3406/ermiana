import assert from 'node:assert/strict';
import test from 'node:test';
import { ProviderRegistry } from '../../../src/core/provider-registry.js';
import { providers } from '../../../src/providers/index.js';

const cases = [
  ['twitter', 'https://x.com/canaria/status/123456789'],
  ['bahamut', 'https://forum.gamer.com.tw/C.php?bsn=60076&snA=123'],
  ['pixiv', 'https://www.pixiv.net/artworks/123'],
  ['nhentai', 'https://nhentai.net/g/633830'],
  ['ehentai', 'https://e-hentai.org/g/123/abcdef'],
  ['plurk', 'https://www.plurk.com/p/abc123'],
  ['pchome', 'https://24h.pchome.com.tw/prod/DRAAAA-A900AAAAA'],
  ['bluesky', 'https://bsky.app/profile/example.com/post/3kabcdefghij'],
  ['misskey', 'https://misskey.io/notes/abcdefghij'],
  ['tiktok', 'https://www.tiktok.com/@example/video/123456789'],
  ['facebook', 'https://www.facebook.com/share/p/19bbiazEgn/'],
  ['bilibili', 'https://www.bilibili.com/video/BV1UmK36aED9'],
  ['ptt', 'https://www.ptt.cc/bbs/C_Chat/M.1745505996.A.757.html'],
  ['threads', 'https://www.threads.com/@example/post/ABC_def-123'],
  ['instagram', 'https://www.instagram.com/p/ABC_def-123/'],
];

test('matches every production URL rule', async (t) => {
  const registry = new ProviderRegistry(providers);
  for (const [expected, url] of cases) {
    await t.test(expected, () => {
      assert.equal(registry.match(`look ${url}`)?.provider.id, expected);
    });
  }
});

test('matches Bilibili opus and strict 12-character BV identifiers', () => {
  const registry = new ProviderRegistry(providers);
  assert.equal(registry.match('https://www.bilibili.com/opus/123456789')?.provider.id, 'bilibili');
  assert.equal(registry.match('https://www.bilibili.com/video/BV1xx411c7mQ?p=2')?.provider.id, 'bilibili');
  assert.equal(registry.match('https://www.bilibili.com/video/BV1xx411c7m')?.provider.id, undefined);
  assert.equal(registry.match('https://www.bilibili.com/video/BV1xx411c7mQ9')?.provider.id, undefined);
  assert.equal(registry.match('https://www.bilibili.com/video/bv1xx411c7mQ')?.provider.id, undefined);
});

test('matches supported PTT, Threads, Instagram, and Facebook URL variants', () => {
  const registry = new ProviderRegistry(providers);
  const variants = [
    ['ptt', 'http://ptt.cc/bbs/Gossiping/M.1234567890.A.ABC.html'],
    ['threads', 'https://threads.net/@example/post/ABC123'],
    ['threads', 'https://www.threads.com/@example/post/ABC123'],
    ['instagram', 'https://instagram.com/reel/ABC123'],
    ['instagram', 'https://www.instagram.com/example/p/ABC123/2/'],
    ['instagram', 'https://www.instagram.com/stories/example/123456789/'],
    ['facebook', 'https://www.facebook.com/share/1HtbnLAAsE/'],
    ['facebook', 'https://facebook.com/share/p/ABC123/'],
    ['facebook', 'https://m.facebook.com/share/v/ABC123/'],
    ['facebook', 'https://www.facebook.com/share/r/ABC123/'],
    ['facebook', 'https://www.facebook.com/reel/123456789/'],
  ];
  for (const [expected, url] of variants) {
    assert.equal(registry.match(url)?.provider.id, expected, url);
  }
  assert.equal(registry.match('https://www.ptt.cc/bbs/C_Chat/index.html'), null);
  assert.equal(registry.match('https://www.threads.com/@example'), null);
  assert.equal(registry.match('https://www.instagram.com/explore/'), null);
  assert.equal(registry.match('https://www.facebook.com/SEMITaiwan'), null);
  assert.equal(registry.match('https://facebook.com/SEMITaiwan/posts/1499389988889744'), null);
  assert.equal(registry.match('https://m.facebook.com/groups/example/posts/123456789/'), null);
  assert.equal(registry.match('https://www.facebook.com/permalink.php?story_fbid=123&id=456'), null);
  assert.equal(registry.match('https://www.facebook.com/share/p/'), null);
  assert.equal(registry.match('https://www.facebook.com/share/v/'), null);
  assert.equal(registry.match('https://www.facebook.com/share/r/'), null);
  assert.equal(registry.match('https://www.facebook.com/share/ab/'), null);
});

test('Facebook source matches stop before query parameters and surrounding punctuation', () => {
  const registry = new ProviderRegistry(providers);
  const cases = [
    [
      'https://www.facebook.com/reel/1234567890，超好笑',
      'https://www.facebook.com/reel/1234567890',
    ],
    [
      '大家看這個 https://www.facebook.com/share/p/19bbiazEgn/。',
      'https://www.facebook.com/share/p/19bbiazEgn/',
    ],
    [
      '好笑 (https://www.facebook.com/share/p/19bbiazEgn/)',
      'https://www.facebook.com/share/p/19bbiazEgn/',
    ],
    [
      '引用「https://www.facebook.com/reel/1234567890」',
      'https://www.facebook.com/reel/1234567890',
    ],
    [
      'https://www.facebook.com/share/p/19bbiazEgn/?mibextid=abc',
      'https://www.facebook.com/share/p/19bbiazEgn/',
    ],
    [
      'https://www.facebook.com/share/1HtbnLAAsE/，請看',
      'https://www.facebook.com/share/1HtbnLAAsE/',
    ],
  ];

  for (const [content, expected] of cases) {
    const candidate = registry.match(content);
    assert.equal(candidate?.provider.id, 'facebook', content);
    assert.equal(candidate.match[0], expected, content);
  }
});

test('selects the earliest supported URL and honors user suppression syntax', () => {
  const registry = new ProviderRegistry(providers);
  const pixiv = cases.find(([name]) => name === 'pixiv')[1];
  const twitter = cases.find(([name]) => name === 'twitter')[1];
  assert.equal(registry.match(`${pixiv} then ${twitter}`).provider.id, 'pixiv');
  assert.equal(registry.match(`<${pixiv}>`), null);
  assert.equal(registry.match(`~~${twitter}~~`), null);
  assert.equal(registry.match(`<${pixiv}> then ${pixiv}`)?.provider.id, 'pixiv');
  assert.equal(registry.match(`~~${twitter}~~ then ${twitter}`)?.provider.id, 'twitter');
});

test('pairs ~~ delimiters left to right instead of spanning separate strikethroughs', () => {
  const registry = new ProviderRegistry(providers);
  const twitter = cases.find(([name]) => name === 'twitter')[1];
  const pixiv = cases.find(([name]) => name === 'pixiv')[1];

  assert.equal(registry.match(`~~a~~ ${twitter} ~~b~~`)?.provider.id, 'twitter');
  assert.equal(registry.match(`~~a~~ ${pixiv} ~~b~~ ${twitter}`)?.provider.id, 'pixiv');
  assert.equal(registry.match(`~~a~~ ${twitter} ~~`)?.provider.id, 'twitter');
  assert.equal(registry.match(`~~${twitter}~~`), null);
  assert.equal(registry.match(`~~ prefix ${twitter} suffix ~~`), null);
});

test('a < span ends at the first > and nested < cannot revive a suppressed link', () => {
  const registry = new ProviderRegistry(providers);
  const pixiv = cases.find(([name]) => name === 'pixiv')[1];

  assert.equal(registry.match(`<a> <b ${pixiv}>`), null);
  assert.equal(registry.match(`<a <b> ${pixiv}>`)?.provider.id, 'pixiv');
  assert.equal(registry.match(`<<<${pixiv}>`), null);
  assert.equal(registry.match(`< ${pixiv}`)?.provider.id, 'pixiv');
});

test('suppression scanning stays linear on adversarial content', () => {
  const registry = new ProviderRegistry(providers);
  const content = '~~'.repeat(1000) + 'https://a.tw/x '.repeat(133);
  const startedAt = performance.now();
  registry.match(content);
  const elapsedMs = performance.now() - startedAt;
  assert.ok(elapsedMs < 250, `suppression scan took ${elapsedMs.toFixed(1)}ms`);
});

test('compiled patterns are reused without leaking lastIndex between messages', () => {
  const registry = new ProviderRegistry(providers);
  const twitter = cases.find(([name]) => name === 'twitter')[1];
  assert.ok(registry.matchers.every(({ pattern }) => pattern.global));

  registry.match(`${twitter} and ${twitter}`);
  assert.ok(registry.matchers.every(({ pattern }) => pattern.lastIndex === 0));
  assert.equal(registry.match(`lead ${twitter}`).index, 5);
  assert.equal(registry.match(`lead ${twitter}`).index, 5);
});

test('matches real-world URL forms and keeps tracking parameters out of the cache key', () => {
  const registry = new ProviderRegistry(providers);
  const realWorld = [
    ['plurk', 'https://www.plurk.com/p/3j3cq0k381', '3j3cq0k381'],
    ['plurk', 'https://www.plurk.com/p/3j3ru67c6t', '3j3ru67c6t'],
    ['twitter', 'https://x.com/only1centt/status/2094716943110414821?s=20', 'v4:2094716943110414821'],
    ['pchome', 'https://24h.pchome.com.tw/prod/DSBC7E-A900HPF6T', undefined],
    ['bahamut', 'https://forum.gamer.com.tw/C.php?bsn=60076&snA=5288773&tnum=13756', 'C.php?bsn=60076&snA=5288773'],
    ['bahamut', 'https://forum.gamer.com.tw/C.php?bsn=60076&snA=9208478&tnum=27', 'C.php?bsn=60076&snA=9208478'],
    ['bahamut', 'https://forum.gamer.com.tw/C.php?bsn=60076&snA=5170434&tnum=707672', 'C.php?bsn=60076&snA=5170434'],
    ['bahamut', 'https://forum.gamer.com.tw/C.php?bsn=60076&snA=8876354&tnum=471&bPage=3', 'C.php?bsn=60076&snA=8876354'],
  ];
  for (const [expected, url, cacheKey] of realWorld) {
    const result = registry.match(`看看這個 ${url} 如何`);
    assert.equal(result?.provider.id, expected, url);
    assert.equal(result.provider.cacheKey?.(result.match), cacheKey, url);
  }
});
