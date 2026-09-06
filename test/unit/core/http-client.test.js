import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FetchHttpClient,
  HttpError,
} from '../../../src/core/http-client.js';

test('retries retryable responses and parses JSON', async () => {
  let calls = 0;
  const client = new FetchHttpClient({
    retries: 1,
    timeoutMs: 1000,
    fetchImpl: async () => {
      calls += 1;
      return calls === 1
        ? new Response('busy', { status: 503, headers: { 'retry-after': '0' } })
        : Response.json({ ok: true });
    },
  });
  assert.deepEqual(await client.getJson('https://example.test/data'), { ok: true });
  assert.equal(calls, 2);
});
test('does not retry permanent client errors', async () => {
  const client = new FetchHttpClient({
    retries: 2,
    fetchImpl: async () => new Response('missing', { status: 404 }),
  });
  await assert.rejects(client.getText('https://example.test/missing'), (error) => {
    assert.ok(error instanceof HttpError);
    assert.equal(error.status, 404);
    return true;
  });
});

test('supports disabling retries for a request', async () => {
  let calls = 0;
  const client = new FetchHttpClient({
    retries: 2,
    fetchImpl: async (_url, options) => {
      calls += 1;
      assert.equal('retries' in options, false);
      return new Response('busy', { status: 503 });
    },
  });
  await assert.rejects(client.getJson('https://example.test/limited', { retries: 0 }), HttpError);
  assert.equal(calls, 1);
});

test('applies timeout, user agent, and per-request header overrides', async () => {
  let received;
  const client = new FetchHttpClient({
    userAgent: 'ermiana-test',
    fetchImpl: async (_url, options) => {
      received = options;
      return Response.json({ ok: true });
    },
  });
  const customHeaders = new Headers({ accept: 'application/custom', 'x-preview-test': 'yes' });
  assert.deepEqual(await client.getJson('https://example.test/headers', {
    timeoutMs: 750,
    headers: customHeaders,
  }), { ok: true });
  assert.equal(received.headers.get('accept'), 'application/custom');
  assert.equal(received.headers.get('user-agent'), 'ermiana-test');
  assert.equal(received.headers.get('x-preview-test'), 'yes');
  assert.equal(received.signal instanceof AbortSignal, true);
});

test('retries a timed out request and succeeds on the next attempt', async () => {
  let calls = 0;
  const client = new FetchHttpClient({
    retries: 1,
    timeoutMs: 5,
    fetchImpl: async (_url, options) => {
      calls += 1;
      if (calls > 1) return new Response('recovered');
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
      });
    },
  });
  assert.equal(await client.getText('https://example.test/timeout'), 'recovered');
  assert.equal(calls, 2);
});

test('retries a network failure while consuming the response body', async () => {
  let calls = 0;
  const client = new FetchHttpClient({
    retries: 1,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ok: true,
          headers: new Headers({ 'retry-after': '0' }),
          async text() { throw new TypeError('body stream disconnected'); },
        };
      }
      return new Response('complete');
    },
  });
  assert.equal(await client.getText('https://example.test/body'), 'complete');
  assert.equal(calls, 2);
});

test('posts URL-encoded forms and consumes the response body before returning headers', async () => {
  let consumed = false;
  let received;
  const headers = new Headers({ 'set-cookie': 'BAHAENUR=one' });
  const client = new FetchHttpClient({
    fetchImpl: async (_url, options) => {
      received = options;
      return { ok: true, headers, async arrayBuffer() { consumed = true; return new ArrayBuffer(0); } };
    },
  });
  const response = await client.postForm('https://example.test/login', { uid: 'user name', passwd: 'secret' }, {
    headers: new Headers({ cookie: 'verification=1' }),
  });
  assert.equal(received.method, 'POST');
  assert.equal(received.headers.get('content-type'), 'application/x-www-form-urlencoded');
  assert.equal(received.headers.get('cookie'), 'verification=1');
  assert.equal(String(received.body), 'uid=user+name&passwd=secret');
  assert.equal(consumed, true);
  assert.equal(response.headers, headers);
});
