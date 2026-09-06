import { bahamutProvider } from './bahamut.js';
import { bilibiliProvider } from './bilibili.js';
import { blueskyProvider } from './bluesky.js';
import { ehentaiProvider } from './ehentai.js';
import { facebookProvider } from './facebook.js';
import { instagramProvider } from './instagram.js';
import { misskeyProvider } from './misskey.js';
import { nhentaiProvider } from './nhentai.js';
import { pchomeProvider } from './pchome.js';
import { pixivProvider } from './pixiv.js';
import { plurkProvider } from './plurk.js';
import { pttProvider } from './ptt.js';
import { threadsProvider } from './threads.js';
import { tiktokProvider } from './tiktok.js';
import { twitterProvider } from './twitter.js';

export const providers = Object.freeze([
  twitterProvider,
  bahamutProvider,
  pixivProvider,
  nhentaiProvider,
  ehentaiProvider,
  plurkProvider,
  pchomeProvider,
  blueskyProvider,
  misskeyProvider,
  tiktokProvider,
  facebookProvider,
  bilibiliProvider,
  pttProvider,
  threadsProvider,
  instagramProvider,
]);

export const PREVIEW_PROVIDER_IDS = Object.freeze(providers.map((provider) => provider.id));
