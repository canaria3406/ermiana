// API handlers - 統一使用 API 處理器
import { handleTwitterRegexAPI } from './handleTwitterRegexAPI.js';
import { handlePixivRegexAPI } from './handlePixivRegexAPI.js';
import { handlePlurkRegexAPI } from './handlePlurkRegexAPI.js';
import { handleBlueskyRegexAPI } from './handleBlueskyRegexAPI.js';
import { handleTiktokRegexAPI } from './handleTiktokRegexAPI.js';
import { handleBilibiliRegexAPI } from './handleBilibiliRegexAPI.js';
import { handleEhRegexAPI } from './handleEhRegexAPI.js';
import { handlePchomeRegexAPI } from './handlePchomeRegexAPI.js';
import { handleBahaRegexAPI } from './handleBahaRegexAPI.js';
import { handleMisskeyRegexAPI } from './handleMisskeyRegexAPI.js';
import { handleInstagramRegexAPI } from './handleInstagramRegexAPI.js';
import { handleThreadsRegexAPI } from './handleThreadsRegexAPI.js';
import { handlePttRegexAPI } from './handlePttRegexAPI.js';
import { handleWeiboRegexAPI } from './handleWeiboRegexAPI.js';

// 直接使用 API 處理器
const twitterHandler = handleTwitterRegexAPI;
const pixivHandler = handlePixivRegexAPI;
const plurkHandler = handlePlurkRegexAPI;
const blueskyHandler = handleBlueskyRegexAPI;
const tiktokHandler = handleTiktokRegexAPI;
const bilibiliHandler = handleBilibiliRegexAPI;
const ehHandler = handleEhRegexAPI;
const pchomeHandler = handlePchomeRegexAPI;
const bahaHandler = handleBahaRegexAPI;
const misskeyHandler = handleMisskeyRegexAPI;
const instagramHandler = handleInstagramRegexAPI;
const threadsHandler = handleThreadsRegexAPI;
const pttHandler = handlePttRegexAPI;
const weiboHandler = handleWeiboRegexAPI;

export const regexsMap = new Map([
  [/https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/status\/([0-9]+)/, twitterHandler],
  [/https:\/\/twitter\.com\/[A-Za-z0-9_]{1,15}\/status\/([0-9]+)/, twitterHandler],
  [/https?:\/\/m\.gamer\.com\.tw\/forum\/((?:C|Co)\.php\?bsn=60076&(?:snA|sn)=[0-9]+)/, bahaHandler],
  [/https?:\/\/forum\.gamer\.com\.tw\/((?:C|Co)\.php\?bsn=60076&(?:snA|sn)=[0-9]+)/, bahaHandler],
  [/https:\/\/www\.pixiv\.net\/artworks\/([0-9]+)/, pixivHandler],
  [/https:\/\/www\.pixiv\.net\/en\/artworks\/([0-9]+)/, pixivHandler],
  [/https:\/\/e(?:x|-)hentai\.org\/g\/([0-9]+)\/([0-9a-z]+)/, ehHandler],
  [/https:\/\/www\.plurk\.com\/m\/p\/([a-zA-Z0-9]{3,10})/, plurkHandler],
  [/https:\/\/www\.plurk\.com\/p\/([a-zA-Z0-9]{3,10})/, plurkHandler],
  [/https:\/\/24h\.pchome\.com\.tw\/prod\/([A-Z0-9]{6}-[A-Z0-9]{9})/, pchomeHandler],
  [/https:\/\/www\.instagram\.com\/(?:p|reel)\/([a-zA-Z0-9-_]+)/, instagramHandler],
  [/https:\/\/www\.instagram\.com\/[A-Za-z0-9_.]+\/(?:p|reel)\/([a-zA-Z0-9-_]+)/, instagramHandler],
  [/https:\/\/www\.threads\.net\/@[A-Za-z0-9_.]+\/post\/[a-zA-Z0-9-_]+/, threadsHandler],
  [/https?:\/\/www\.ptt\.cc\/bbs\/([a-zA-Z-_]+)\/(M\.[0-9]+\.A\.[0-9A-Z]+)\.html/, pttHandler],
  [/https:\/\/m\.weibo\.cn\/detail\/([0-9]+)/, weiboHandler],
  [/https:\/\/bsky\.app\/profile\/([a-zA-Z0-9-.]+)\/post\/([a-zA-Z0-9]{10,16})/, blueskyHandler],
  [/https:\/\/misskey\.io\/notes\/([a-zA-Z0-9]{10,16})/, misskeyHandler],
  [/https:\/\/www\.tiktok\.com\/@[a-zA-Z0-9-_.]+\/video\/[0-9]+/, tiktokHandler],
  [/https:\/\/www\.bilibili\.com\/opus\/([0-9]+)/, bilibiliHandler],
]);

export function matchRules(content) {
  const rules = [
    /<[\s\S]*http[\s\S]*>/,
    /~~[\s\S]*http[\s\S]*~~/,
  ];
  return rules.some((rule) => rule.test(content));
}
