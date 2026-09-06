import { setTimeout as delay } from 'node:timers/promises';

export class HttpError extends Error {
  constructor(message, { status, url, retryable = false } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
    this.retryable = retryable;
  }
}

export async function readResponseText(response) {
  if (typeof response.text === 'function') return response.text();
  return new TextDecoder().decode(await response.arrayBuffer());
}

function retryDelay(attempt, response) {
  const value = response?.headers.get('retry-after');
  const retryAfterSeconds = Number.parseFloat(value);
  if (Number.isFinite(retryAfterSeconds)) return Math.min(Math.max(0, retryAfterSeconds * 1000), 10000);
  const retryAfterDate = Date.parse(value);
  if (Number.isFinite(retryAfterDate)) return Math.min(Math.max(0, retryAfterDate - Date.now()), 10000);
  return Math.min(200 * (2 ** attempt) + Math.floor(Math.random() * 100), 3000);
}

function mergeHeaders(defaults, overrides) {
  const headers = new Headers(defaults);
  if (overrides) {
    for (const [name, value] of new Headers(overrides)) headers.set(name, value);
  }
  return headers;
}

export class FetchHttpClient {
  constructor({
    timeoutMs = 5000,
    retries = 2,
    userAgent,
    fetchImpl = globalThis.fetch,
    logger,
  } = {}) {
    this.timeoutMs = timeoutMs;
    this.retries = retries;
    this.userAgent = userAgent;
    this.fetchImpl = fetchImpl;
    this.logger = logger;
  }

  async request(url, options = {}, consume = (response) => response) {
    const {
      timeoutMs = this.timeoutMs,
      retries = this.retries,
      consumeErrorResponses = false,
      ...fetchOptions
    } = options;
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      let response;
      try {
        const timeoutSignal = AbortSignal.timeout(timeoutMs);
        const signal = fetchOptions.signal ? AbortSignal.any([fetchOptions.signal, timeoutSignal]) : timeoutSignal;
        response = await this.fetchImpl(url, {
          ...fetchOptions,
          signal,
          headers: mergeHeaders({
            accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
            ...(this.userAgent ? { 'user-agent': this.userAgent } : {}),
          }, fetchOptions.headers),
        });
        if (response.ok || consumeErrorResponses) return await consume(response);

        const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
        const error = new HttpError(`HTTP ${response.status} for ${url}`, {
          status: response.status,
          url: String(url),
          retryable,
        });
        await response.body?.cancel().catch(() => {});
        throw error;
      } catch (error) {
        lastError = error;
        const retryable = error instanceof HttpError ? error.retryable : error?.name === 'TimeoutError' || error?.name === 'TypeError';
        if (!retryable || attempt === retries) throw error;
      }

      const waitMs = retryDelay(attempt, response);
      this.logger?.warn({ url: String(url), attempt: attempt + 1, waitMs, err: lastError }, 'retrying upstream request');
      await delay(waitMs, undefined, fetchOptions.signal ? { signal: fetchOptions.signal } : undefined);
    }
    throw lastError;
  }

  async getJson(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' }, async (response) => (
      JSON.parse(await readResponseText(response))
    ));
  }

  async getText(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' }, readResponseText);
  }

  async postJson(url, body, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      headers: mergeHeaders({ 'content-type': 'application/json' }, options.headers),
      body: JSON.stringify(body),
    }, async (response) => JSON.parse(await readResponseText(response)));
  }

  async postForm(url, values, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      headers: mergeHeaders({ 'content-type': 'application/x-www-form-urlencoded' }, options.headers),
      body: new URLSearchParams(values),
    }, async (response) => {
      await readResponseText(response);
      return response;
    });
  }
}
