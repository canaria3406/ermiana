import { handleEhRegex } from './handleEhRegex.js';
// import { handleNhRegex } from './handleNhRegex.js';
import { handlePttRegex } from './handlePttRegex.js';
import { handleBahaRegex } from './handleBahaRegex.js';
import { handlePixivRegex } from './handlePixivRegex.js';
import { handlePlurkRegex } from './handlePlurkRegex.js';
import { handleTwitterRegex } from './handleTwitterRegex.js';
import { handleMisskeyRegex } from './handleMisskeyRegex.js';

export const regexs = [
  // {
  //  regex: /https:\/\/nhentai\.net\/g\/([0-9]+)/,
  //  handler: handleNhRegex },
  {
    regex: /https:\/\/misskey\.io\/notes\/([a-zA-Z0-9]{10})/,
    handler: handleMisskeyRegex },
  {
    regex: /https:\/\/www\.plurk\.com\/m\/p\/([a-zA-Z0-9]{3,10})/,
    handler: handlePlurkRegex },
  {
    regex: /https:\/\/www\.plurk\.com\/p\/([a-zA-Z0-9]{3,10})/,
    handler: handlePlurkRegex },
  {
    regex: /https?:\/\/m\.gamer\.com\.tw\/forum\/C\.php\?bsn=60076&snA=([0-9]+)/,
    handler: handleBahaRegex },
  {
    regex: /https?:\/\/forum\.gamer\.com\.tw\/C\.php\?bsn=60076&snA=([0-9]+)/,
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
];
