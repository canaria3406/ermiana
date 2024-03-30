import { handleEhRegex } from './handleEhRegex.js';
import { handlePttRegex } from './handlePttRegex.js';
import { handleBahaRegex } from './handleBahaRegex.js';
import { handlePixivRegex } from './handlePixivRegex.js';
import { handlePlurkRegex } from './handlePlurkRegex.js';
import { handleTwitterRegex } from './handleTwitterRegex.js';
import { handleMisskeyRegex } from './handleMisskeyRegex.js';
import { handlePchomeRegex } from './handlePchomeRegex.js';
import { handleBlueskyRegex } from './handleBlueskyRegex.js';
import { handleWeiboRegex } from './handleWeiboRegex.js';
import { handleInstagramRegex } from './handleInstagramRegex.js';

export const regexs = [
  {
    regex: /https:\/\/www\.instagram\.com\/((?:p|reel)\/[a-zA-Z0-9-_]+)/,
    handler: handleInstagramRegex },
  {
    regex: /https:\/\/m\.weibo\.cn\/detail\/([0-9]+)/,
    handler: handleWeiboRegex },
  {
    regex: /https:\/\/bsky\.app\/profile\/([a-zA-Z0-9-.]+)\/post\/([a-zA-Z0-9]{10,16})/,
    handler: handleBlueskyRegex },
  {
    regex: /https:\/\/misskey\.io\/notes\/([a-zA-Z0-9]{10,16})/,
    handler: handleMisskeyRegex },
  {
    regex: /https:\/\/www\.plurk\.com\/m\/p\/([a-zA-Z0-9]{3,10})/,
    handler: handlePlurkRegex },
  {
    regex: /https:\/\/www\.plurk\.com\/p\/([a-zA-Z0-9]{3,10})/,
    handler: handlePlurkRegex },
  {
    regex: /https?:\/\/m\.gamer\.com\.tw\/forum\/((?:C|Co)\.php\?bsn=60076&(?:snA|sn)=[0-9]+)/,
    handler: handleBahaRegex },
  {
    regex: /https?:\/\/forum\.gamer\.com\.tw\/((?:C|Co)\.php\?bsn=60076&(?:snA|sn)=[0-9]+)/,
    handler: handleBahaRegex },
  {
    regex: /https:\/\/e(?:x|-)hentai\.org\/g\/([0-9]+)\/([0-9a-z]+)/,
    handler: handleEhRegex },
  {
    regex: /https:\/\/www\.pixiv\.net\/artworks\/([0-9]+)/,
    handler: handlePixivRegex },
  {
    regex: /https:\/\/www\.pixiv\.net\/en\/artworks\/([0-9]+)/,
    handler: handlePixivRegex },
  {
    regex: /https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/status\/([0-9]+)/,
    handler: handleTwitterRegex },
  {
    regex: /https:\/\/twitter\.com\/[A-Za-z0-9_]{1,15}\/status\/([0-9]+)/,
    handler: handleTwitterRegex },
  {
    regex: /https?:\/\/www\.ptt\.cc\/bbs\/([a-zA-Z-_]+)\/(M\.[0-9]+\.A\.[0-9A-Z]+)\.html/,
    handler: handlePttRegex },
  {
    regex: /https:\/\/24h\.pchome\.com\.tw\/prod\/([^?]+)/,
    handler: handlePchomeRegex },
];
