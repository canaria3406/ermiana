import assert from 'node:assert/strict';
import test from 'node:test';
import { EhentaiApiService } from '../../../../src/services/upstream/ehentai-api.js';

test('batches concurrent galleries into one API request of at most 25 entries', async () => {
  const calls = [];
  const service = new EhentaiApiService({
    batchDelayMs: 1,
    http: { async postJson(url, body, options) {
      calls.push({ url, body, options });
      return { gmetadata: body.gidlist.map(([gid]) => ({ gid, title: `Gallery ${gid}` })) };
    } },
  });

  const [first, second] = await Promise.all([
    service.getGallery(1, 'aaa'),
    service.getGallery(2, 'bbb'),
  ]);
  assert.equal(first.title, 'Gallery 1');
  assert.equal(second.title, 'Gallery 2');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.gidlist.length, 2);
  assert.equal(calls[0].options.retries, 0);
});

test('does not assign another gallery when E-Hentai omits one requested gid', async () => {
  const service = new EhentaiApiService({
    batchDelayMs: 1,
    http: { async postJson() {
      return { gmetadata: [{ gid: 2, title: 'Gallery 2' }] };
    } },
  });
  const results = await Promise.allSettled([
    service.getGallery(1, 'aaa'),
    service.getGallery(2, 'bbb'),
  ]);
  assert.equal(results[0].status, 'rejected');
  assert.equal(results[1].status, 'fulfilled');
  assert.equal(results[1].value.title, 'Gallery 2');
});
