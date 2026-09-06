import assert from 'node:assert/strict';
import test from 'node:test';
import { FacebookPreviewSiteService } from '../../../../src/services/mirrors/facebook-preview-site.js';

const INPUT = 'https://www.facebook.com/share/p/19bbiazEgn/';
const DIRECT_SHARE_INPUT = 'https://www.facebook.com/share/1HtbnLAAsE/';
const CANONICAL = 'https://www.facebook.com/SEMITaiwan/posts/1499389988889744';
const PREVIEW = 'https://facebed.com/SEMITaiwan/posts/1499389988889744';
const quietLogger = { warn() {}, info() {}, debug() {}, error() {} };

function answer({
  status = 200,
  finalUrl = 'https://facebed.com/share/p/19bbiazEgn/',
  body = `<html><head><meta property="og:title" content="SEMI"><meta property="og:url" content="${CANONICAL}"></head></html>`,
} = {}) {
  return {
    status,
    url: finalUrl,
    async text() { return body; },
  };
}

function createService(respond = () => answer()) {
  const calls = [];
  const http = {
    async request(url, options, consume) {
      calls.push({ url: String(url), options });
      const response = await respond(url, options);
      return consume(response);
    },
  };
  return { calls, service: new FacebookPreviewSiteService({ http, logger: quietLogger }) };
}

test('resolves a Facebook share link through Facebed to the short canonical preview URL', async () => {
  const { calls, service } = createService();
  assert.deepEqual(await service.resolve(INPUT), {
    canonicalUrl: CANONICAL,
    previewUrl: PREVIEW,
  });
  assert.equal(calls[0].url, 'https://facebed.com/share/p/19bbiazEgn/');
  assert.match(calls[0].options.headers['user-agent'], /Discordbot\/2\.0/);
  assert.equal(calls[0].options.consumeErrorResponses, true);
});

test('accepts a direct Facebook share token without a p, v, or r type segment', async () => {
  const { calls, service } = createService();
  assert.deepEqual(await service.resolve(DIRECT_SHARE_INPUT), {
    canonicalUrl: CANONICAL,
    previewUrl: PREVIEW,
  });
  assert.equal(calls[0].url, 'https://facebed.com/share/1HtbnLAAsE/');
});

test('removes Facebook tracking parameters while preserving required canonical query parameters', async () => {
  const canonical = 'https://www.facebook.com/permalink.php?story_fbid=123&id=456&fbclid=tracking&mibextid=more';
  const { service } = createService(() => answer({
    body: `<meta property="og:url" content="${canonical.replaceAll('&', '&amp;')}">`,
  }));
  assert.deepEqual(await service.resolve(INPUT), {
    canonicalUrl: 'https://www.facebook.com/permalink.php?story_fbid=123&id=456',
    previewUrl: 'https://facebed.com/permalink.php?story_fbid=123&id=456',
  });
});

test('rejects error pages, missing metadata, unsafe canonicals, and redirects away from Facebed', async (t) => {
  const cases = [
    ['HTTP error', answer({ status: 404 })],
    ['login wall', answer({ body: '<meta property="og:title" content="Log in or sign up to view">' })],
    ['missing metadata', answer({ body: '<html></html>' })],
    ['external canonical', answer({ body: '<meta property="og:url" content="https://example.com/post/1">' })],
    ['non-HTTPS canonical', answer({ body: '<meta property="og:url" content="http://www.facebook.com/user/posts/1">' })],
    ['unsupported canonical', answer({ body: '<meta property="og:url" content="https://www.facebook.com/user">' })],
    ['unresolved share canonical', answer({ body: '<meta property="og:url" content="https://www.facebook.com/share/p/19bbiazEgn/">' })],
    ['redirected response', answer({ finalUrl: 'https://www.facebook.com/user/posts/1' })],
  ];
  for (const [name, response] of cases) {
    await t.test(name, async () => {
      const { service } = createService(() => response);
      assert.equal(await service.resolve(INPUT), null);
    });
  }
});

test('rejects unsupported source URLs before issuing a request', async () => {
  const { calls, service } = createService();
  assert.equal(await service.resolve('https://www.facebook.com/SEMITaiwan'), null);
  assert.equal(await service.resolve(CANONICAL), null);
  assert.equal(await service.resolve('https://www.facebook.com/groups/example/posts/123'), null);
  assert.equal(await service.resolve('https://www.facebook.com/permalink.php?story_fbid=123&id=456'), null);
  assert.equal(await service.resolve('https://www.facebook.com/reel/123，超好笑'), null);
  assert.equal(await service.resolve('https://www.facebook.com/share/p/19bbiazEgn/。'), null);
  assert.equal(await service.resolve('https://www.facebook.com/share/p/'), null);
  assert.equal(await service.resolve('https://www.facebook.com/share/v/'), null);
  assert.equal(await service.resolve('https://www.facebook.com/share/r/'), null);
  assert.equal(await service.resolve('https://www.facebook.com/share/ab/'), null);
  assert.equal(await service.resolve('https://example.com/share/p/19bbiazEgn/'), null);
  assert.equal(calls.length, 0);
});

test('returns null for ordinary request failures', async () => {
  const ordinary = createService(() => { throw new Error('offline'); });
  assert.equal(await ordinary.service.resolve(INPUT), null);
});
