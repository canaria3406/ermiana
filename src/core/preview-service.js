import { createHash } from 'node:crypto';

function digest(value) {
  return createHash('sha256').update(value).digest('base64url');
}

export class PreviewService {
  constructor({ registry, cache, http, services = {}, logger }) {
    this.registry = registry;
    this.cache = cache;
    this.http = http;
    this.services = services;
    this.logger = logger;
  }

  match(content) {
    return this.registry.match(content);
  }

  async resolve(candidate) {
    const { provider, match } = candidate;
    const startedAt = performance.now();
    const load = () => provider.resolve({ match, http: this.http, services: this.services, logger: this.logger });
    const cacheable = provider.ttlSeconds !== undefined;
    const preview = cacheable
      ? await this.cache.getOrLoad(
        `preview:${provider.id}`,
        digest(provider.cacheKey?.(match) ?? match[0]),
        load,
        {
          ttlSeconds: provider.ttlSeconds,
          staleTtlSeconds: provider.staleTtlSeconds ?? provider.ttlSeconds,
        },
      )
      : await load();

    const durationMs = Math.round(performance.now() - startedAt);
    if (!preview) {
      this.logger?.debug({ provider: provider.id, durationMs }, 'preview skipped');
      return null;
    }
    this.logger?.info({ provider: provider.id, durationMs, cacheable }, 'preview resolved');
    return { ...preview, provider: provider.id };
  }
}
