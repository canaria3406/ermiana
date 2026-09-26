import {
  createPreview,
  engagement,
  fallbackPreview,
  ICONS,
  MAX_DISCORD_STORED_MEDIA,
  truncate,
  twitterImageUrl,
  uniqueUrls,
} from './helpers.js';

function twitterEmbed({ handle, avatar, name, url, text, image, timestamp, footer }) {
  return {
    color: 0x1da1f2,
    author: handle ? { name: `@${handle}`, iconUrl: avatar } : undefined,
    title: truncate(name || 'X / Twitter', 256),
    url,
    description: truncate(text, 4080),
    image,
    timestamp,
    footer,
  };
}

function quoteText(quote) {
  if (!quote) return '';
  const handle = quote.author?.screen_name ?? quote.user_screen_name;
  const url = quote.url ?? quote.tweetURL;
  const text = quote.text ? `\n${String(quote.text).replace(/^/gm, '> ')}` : '';
  return `\n> RT: [@${handle}](${url})${text}`;
}

function canonicalTwitterUrl(value, id) {
  const fallback = `https://x.com/i/status/${id}`;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const status = /^\/([A-Za-z0-9_]{1,15})\/status\/([0-9]+)\/?$/.exec(url.pathname);
    if ((hostname !== 'x.com' && hostname !== 'twitter.com') || status?.[2] !== id) return fallback;
    return `https://x.com/${status[1]}/status/${id}`;
  } catch {
    return fallback;
  }
}

function fxVideoUrl(video) {
  if (typeof video?.url === 'string' && /^https?:\/\//.test(video.url)) return video.url;
  const variants = [...(video?.variants ?? []), ...(video?.formats ?? [])]
    .filter((variant) => variant?.content_type === 'video/mp4' || variant?.container === 'mp4')
    .filter((variant) => typeof variant.url === 'string' && /^https?:\/\//.test(variant.url))
    .sort((left, right) => Number(right.bitrate ?? 0) - Number(left.bitrate ?? 0));
  return variants[0]?.url;
}

function uniqueGalleryMedia(entries) {
  const seen = new Set();
  const counts = { image: 0, video: 0 };
  return entries.map((entry) => {
    if (!entry || (entry.type !== 'image' && entry.type !== 'video')) return undefined;
    const url = entry.type === 'image'
      ? twitterImageUrl(entry.url)
      : typeof entry.url === 'string' && /^https?:\/\//.test(entry.url) ? entry.url : undefined;
    if (!url || counts[entry.type] >= MAX_DISCORD_STORED_MEDIA) return undefined;
    const key = `${entry.type}:${url}`;
    if (seen.has(key)) return undefined;
    seen.add(key);
    counts[entry.type] += 1;
    return { ...entry, url };
  }).filter(Boolean);
}

function fxGalleryMedia(allMedia, photos) {
  const entries = allMedia.map((item) => item?.type === 'photo'
    ? { type: 'image', url: item.url }
    : { type: 'video', url: fxVideoUrl(item) });
  const photoEntries = (photos ?? []).map((photo) => ({ type: 'image', url: photo?.url }));
  return uniqueGalleryMedia([...entries, ...photoEntries]);
}

function vxGalleryMedia(media) {
  return uniqueGalleryMedia((media ?? []).map((item) => ({
    type: item?.type === 'image' ? 'image' : 'video',
    url: item?.url,
  })));
}

function fromFx(tweet, id) {
  const allMedia = tweet.media?.all ?? [];
  let images = [];
  if (tweet.media?.mosaic?.type === 'mosaic_photo') images = [tweet.media.mosaic.formats?.jpeg];
  else images = (tweet.media?.photos ?? []).map((photo) => twitterImageUrl(photo?.url));

  const quoteImage = tweet.quote?.media?.mosaic?.formats?.jpeg ?? tweet.quote?.media?.photos?.[0]?.url;
  if (images.length === 0 && quoteImage) images = [quoteImage];
  const canonicalUrl = canonicalTwitterUrl(tweet.url, id);
  const footer = engagement({ replies: tweet.replies, reposts: tweet.retweets, likes: tweet.likes });
  const primaryGalleryMedia = fxGalleryMedia(allMedia, tweet.media?.photos);
  const primaryHasMedia = allMedia.length > 0 || (tweet.media?.photos ?? []).length > 0;
  const quoteGalleryMedia = fxGalleryMedia(tweet.quote?.media?.all ?? [], tweet.quote?.media?.photos);
  return {
    ...createPreview({
      canonicalUrl,
      iconUrl: ICONS.twitter,
      embed: twitterEmbed({
        handle: tweet.author?.screen_name,
        avatar: tweet.author?.avatar_url,
        name: tweet.author?.name,
        url: canonicalUrl,
        text: `${tweet.text ?? ''}${quoteText(tweet.quote)}`,
        image: images[0],
        timestamp: tweet.created_timestamp ? new Date(tweet.created_timestamp * 1000).toISOString() : undefined,
        footer,
      }),
      images,
      media: primaryGalleryMedia.filter((item) => item.type === 'video').map((item) => item.url),
    }),
    twitterGalleryMedia: primaryHasMedia ? primaryGalleryMedia : quoteGalleryMedia,
  };
}

function fromVx(tweet, id) {
  const media = tweet.media_extended ?? [];
  const images = uniqueUrls(media.filter((item) => item.type === 'image').map((item) => item.url));
  const videos = uniqueUrls(media.filter((item) => item.type !== 'image').map((item) => item.url));
  if (images.length > 1 && tweet.combinedMediaUrl) images.splice(0, images.length, tweet.combinedMediaUrl);
  const quoteImage = tweet.qrt?.combinedMediaUrl ?? tweet.qrt?.media_extended?.find((item) => item.type === 'image')?.url;
  if (images.length === 0 && quoteImage) images.push(quoteImage);
  const canonicalUrl = canonicalTwitterUrl(tweet.tweetURL, id);
  const footer = engagement({ replies: tweet.replies, reposts: tweet.retweets, likes: tweet.likes });
  const primaryGalleryMedia = vxGalleryMedia(media);
  const quoteGalleryMedia = vxGalleryMedia(tweet.qrt?.media_extended);
  return {
    ...createPreview({
      canonicalUrl,
      iconUrl: ICONS.twitter,
      embed: twitterEmbed({
        handle: tweet.user_screen_name,
        avatar: tweet.user_profile_image_url,
        name: tweet.user_name,
        url: canonicalUrl,
        text: `${tweet.text ?? ''}${quoteText(tweet.qrt)}`,
        image: images[0],
        timestamp: tweet.date_epoch ? new Date(tweet.date_epoch * 1000).toISOString() : undefined,
        footer,
      }),
      images,
      media: videos,
    }),
    twitterGalleryMedia: media.length > 0 ? primaryGalleryMedia : quoteGalleryMedia,
  };
}

async function fxPreview(http, id) {
  const data = await http.getJson(`https://api.fxtwitter.com/i/status/${id}`);
  if (!data?.tweet) throw new Error('FXTwitter response has no tweet');
  return fromFx(data.tweet, id);
}

async function vxPreview(http, id) {
  const data = await http.getJson(`https://api.vxtwitter.com/i/status/${id}`);
  if (!data?.tweetURL && !data?.user_screen_name && !data?.text) throw new Error('VXTwitter response has no tweet');
  return fromVx(data, id);
}

export const twitterProvider = {
  id: 'twitter',
  patterns: [
    /https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/status\/([0-9]+)/i,
    /https:\/\/twitter\.com\/[A-Za-z0-9_]{1,15}\/status\/([0-9]+)/i,
  ],
  ttlSeconds: 3600,
  cacheKey: (match) => `v4:${match[1]}`,
  async resolve({ match, http, logger }) {
    const id = match[1];
    try {
      return await vxPreview(http, id);
    } catch (vxError) {
      logger?.warn({ id, err: vxError }, 'VXTwitter failed; using FXTwitter');
      try {
        return await fxPreview(http, id);
      } catch (fxError) {
        logger?.warn({ id, err: fxError }, 'FXTwitter failed; using proxy preview');
        return fallbackPreview(`https://x.com/i/status/${id}`, `https://vxtwitter.com/i/status/${id}`);
      }
    }
  },
};
