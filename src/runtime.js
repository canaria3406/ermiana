import { CacheService, connectRedis, MemoryCacheBackend } from './core/cache.js';
import { FetchHttpClient } from './core/http-client.js';
import { PreviewService } from './core/preview-service.js';
import { ProviderRegistry } from './core/provider-registry.js';
import { PREVIEW_PROVIDER_IDS, providers } from './providers/index.js';
import { BahaSessionService } from './services/upstream/baha-session.js';
import { BilibiliPreviewSiteService } from './services/mirrors/bilibili-preview-site.js';
import { EhentaiApiService } from './services/upstream/ehentai-api.js';
import { FacebookPreviewSiteService } from './services/mirrors/facebook-preview-site.js';
import { InstagramPreviewSiteService } from './services/mirrors/instagram-preview-site.js';
import { ThreadsPreviewSiteService } from './services/mirrors/threads-preview-site.js';
import { TikTokPreviewSiteService } from './services/mirrors/tiktok-preview-site.js';
import { GuildSettingsStore } from './services/guild-settings.js';

export async function createRuntime(config, logger) {
  const fallback = new MemoryCacheBackend();
  const guildSettings = new GuildSettingsStore({
    databasePath: config.guild.databasePath,
    redis: null,
    providerIds: PREVIEW_PROVIDER_IDS,
    logger,
  });
  let redisBackend;
  try {
    redisBackend = await connectRedis(config.redis, logger);
  } catch (error) {
    guildSettings.close();
    throw error;
  }
  guildSettings.attachRedis(redisBackend);
  if (redisBackend) await guildSettings.initialize();
  const cache = new CacheService({
    backend: redisBackend ?? fallback,
    fallback,
    ...config.cache,
    logger,
  });
  const http = new FetchHttpClient({ ...config.http, logger });
  const bahaSession = new BahaSessionService({
    cache,
    http,
    userId: config.baha.userId,
    password: config.baha.password,
    logger,
  });
  const ehentaiApi = new EhentaiApiService({ http, logger });
  const facebookPreviewSite = new FacebookPreviewSiteService({ http, logger });
  const tiktokPreviewSite = new TikTokPreviewSiteService();
  const bilibiliPreviewSite = new BilibiliPreviewSiteService();
  const threadsPreviewSite = new ThreadsPreviewSiteService();
  const instagramPreviewSite = new InstagramPreviewSiteService();
  const registry = new ProviderRegistry(providers);
  const previewService = new PreviewService({
    registry,
    cache,
    http,
    services: {
      bahaSession,
      ehentaiApi,
      facebookPreviewSite,
      tiktokPreviewSite,
      bilibiliPreviewSite,
      threadsPreviewSite,
      instagramPreviewSite,
    },
    logger,
  });

  return {
    cache,
    guildSettings,
    http,
    previewService,
    async close() {
      guildSettings.close();
      await cache.close();
    },
  };
}
