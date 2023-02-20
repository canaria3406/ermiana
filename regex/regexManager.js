import { handleEhRegex } from "./handleEhRegex.js";
import { handlePttRegex } from "./handlePttRegex.js";
import { handleBahaRegex } from "./handleBahaRegex.js";
import { handlePixivRegex } from "./handlePixivRegex.js";
import { handlePlurkRegex } from "./handlePlurkRegex.js";

export const regexs =  [
    { regex: /https:\/\/e(?:x|-)hentai\.org\/g\/([0-9]+)\/([0-9a-z]+)\//,
        handler: handleEhRegex },
    { regex: /https?:\/\/www\.ptt\.cc\/bbs\/((?:G|g)ossiping|AC_In)\/M\.([0-9]+)\.A\.([0-9A-Z]+)\.html/,
        handler: handlePttRegex },
    { regex: /https?:\/\/([a-z]+)\.gamer\.com\.tw([^>])*bsn=60076([^>])*/,
        handler: handleBahaRegex },
    { regex: /https:\/\/www\.pixiv\.net\/artworks\/([0-9]+)/,
        handler: handlePixivRegex },
    { regex: /https:\/\/www\.plurk\.com\/p\/([^"]+)/,
        handler: handlePlurkRegex }
];