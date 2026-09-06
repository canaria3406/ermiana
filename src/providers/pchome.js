import * as cheerio from 'cheerio';
import { createPreview, ICONS, truncate } from './helpers.js';

function parseJsonp(value) {
  const callback = /[A-Za-z_$][\w$]*\s*\(\s*([[{])/.exec(value);
  const trimmedStart = value.search(/\S/);
  const start = callback
    ? callback.index + callback[0].lastIndexOf(callback[1])
    : trimmedStart >= 0 && (value[trimmedStart] === '{' || value[trimmedStart] === '[') ? trimmedStart : -1;
  if (start === -1) throw new Error('JSONP response has no JSON value');
  const opening = value[start];
  const closing = opening === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < value.length; index += 1) {
    const character = value[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === opening) depth += 1;
    else if (character === closing) {
      depth -= 1;
      if (depth === 0) return JSON.parse(value.slice(start, index + 1));
    }
  }
  throw new Error('JSONP response contains incomplete JSON');
}

function firstProduct(data, id) {
  return data?.[id] ?? data?.data?.[id] ?? Object.values(data ?? {})[0];
}

export const pchomeProvider = {
  id: 'pchome',
  patterns: [/https:\/\/24h\.pchome\.com\.tw\/prod\/([A-Z0-9]{6}-[A-Z0-9]{9})/i],
  async resolve({ match, http }) {
    const id = match[1].toUpperCase();
    const canonicalUrl = `https://24h.pchome.com.tw/prod/${id}`;
    const productText = await http.getText(`https://ecapi-cdn.pchome.com.tw/ecshop/prodapi/v2/prod/${id}&fields=Name,Nick,Price,Pic&_callback=jsonp_prod`);
    const descriptionText = await http.getText(`https://ecapi-cdn.pchome.com.tw/cdn/ecshop/prodapi/v2/prod/${id}/desc&fields=Meta,SloganInfo&_callback=jsonp_desc`);
    const product = firstProduct(parseJsonp(productText), id);
    const description = firstProduct(parseJsonp(descriptionText), id);
    if (!product) throw new Error('PChome response has no product');
    const titleHtml = product.Name ?? product.Nick ?? id;
    const $ = cheerio.load(String(titleHtml));
    const picture = product.Pic?.B ?? product.Pic?.S ?? product.Pic;
    const image = picture ? `https://img.pchome.com.tw/cs${String(picture).replace(/^\/+/, '/')}` : undefined;
    const brands = description?.Meta?.BrandNames ?? description?.BrandNames ?? [];
    const slogans = description?.SloganInfo ?? [];
    const price = product.Price?.P ?? product.Price ?? '未知';
    return createPreview({
      canonicalUrl,
      iconUrl: ICONS.pchome,
      embed: {
        color: 0xea1717,
        title: truncate($.text(), 256),
        url: canonicalUrl,
        description: truncate(Array.isArray(slogans) ? slogans.join('\n') : slogans, 4096),
        image,
        fields: [
          { name: '品牌', value: truncate(Array.isArray(brands) ? brands.join('_') : brands, 1024) || '未知', inline: true },
          { name: '價格', value: String(price), inline: true },
        ],
        footer: 'ermiana',
      },
      images: image ? [image] : [],
    });
  },
};
