import { handleEhRegex } from './handleEhRegex.js';
import { handlePttRegex } from './handlePttRegex.js';
import { handleBahaRegex } from './handleBahaRegex.js';
import { handlePixivRegex } from './handlePixivRegex.js';
import { handlePlurkRegex } from './handlePlurkRegexV2.js';
import { handleTwitterRegex } from './handleTwitterRegexV2.js';
import { handleMisskeyRegex } from './handleMisskeyRegex.js';
import { handlePchomeRegex } from './handlePchomeRegex.js';
import { handleBlueskyRegex } from './handleBlueskyRegex.js';
import { handleWeiboRegex } from './handleWeiboRegex.js';
import { handleInstagramRegex } from './handleInstagramRegexV2.js';
import { handleTiktokRegex } from './handleTiktokRegexV2.js';
import { handleBilibiliRegex } from './handleBilibiliRegex.js';
// import { handleThreadsRegex } from './handleThreadsRegex.js';
// [/https:\/\/www\.threads\.net\/@[A-Za-z0-9_.]+\/post\/[a-zA-Z0-9-_]+/, handleThreadsRegex],

export const regexsMap = new Map([
  [/https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/status\/([0-9]+)/, handleTwitterRegex],
  [/https:\/\/twitter\.com\/[A-Za-z0-9_]{1,15}\/status\/([0-9]+)/, handleTwitterRegex],
  [/https?:\/\/www\.ptt\.cc\/bbs\/([a-zA-Z-_]+)\/(M\.[0-9]+\.A\.[0-9A-Z]+)\.html/, handlePttRegex],
  [/https?:\/\/m\.gamer\.com\.tw\/forum\/((?:C|Co)\.php\?bsn=60076&(?:snA|sn)=[0-9]+)/, handleBahaRegex],
  [/https?:\/\/forum\.gamer\.com\.tw\/((?:C|Co)\.php\?bsn=60076&(?:snA|sn)=[0-9]+)/, handleBahaRegex],
  [/https:\/\/www\.pixiv\.net\/artworks\/([0-9]+)/, handlePixivRegex],
  [/https:\/\/www\.pixiv\.net\/en\/artworks\/([0-9]+)/, handlePixivRegex],
  [/https:\/\/e(?:x|-)hentai\.org\/g\/([0-9]+)\/([0-9a-z]+)/, handleEhRegex],
  [/https:\/\/www\.plurk\.com\/m\/p\/([a-zA-Z0-9]{3,10})/, handlePlurkRegex],
  [/https:\/\/www\.plurk\.com\/p\/([a-zA-Z0-9]{3,10})/, handlePlurkRegex],
  [/https:\/\/24h\.pchome\.com\.tw\/prod\/([^?]+)/, handlePchomeRegex],
  [/https:\/\/www\.instagram\.com\/(?:p|reel)\/([a-zA-Z0-9-_]+)/, handleInstagramRegex],
  [/https:\/\/www\.instagram\.com\/[A-Za-z0-9_.]+\/(?:p|reel)\/([a-zA-Z0-9-_]+)/, handleInstagramRegex],
  [/https:\/\/m\.weibo\.cn\/detail\/([0-9]+)/, handleWeiboRegex],
  [/https:\/\/bsky\.app\/profile\/([a-zA-Z0-9-.]+)\/post\/([a-zA-Z0-9]{10,16})/, handleBlueskyRegex],
  [/https:\/\/misskey\.io\/notes\/([a-zA-Z0-9]{10,16})/, handleMisskeyRegex],
  [/https:\/\/www\.tiktok\.com\/@[a-zA-Z0-9-_.]+\/video\/[0-9]+/, handleTiktokRegex],
  [/https:\/\/www\.bilibili\.com\/opus\/([0-9]+)/, handleBilibiliRegex],
]);

export function matchRules(content) {
  const rules = [
    /\<[\s\S]*http[\s\S]*\>/,
    /\~\~[\s\S]*http[\s\S]*\~\~/,
  ];
  return rules.some((rule) => rule.test(content));
}
