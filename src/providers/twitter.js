import { createPreview, engagement, fallbackPreview, ICONS, truncate, uniqueUrls } from './helpers.js';

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

function fromFx(tweet, id) {
  const allMedia = tweet.media?.all ?? [];
  const videos = uniqueUrls(allMedia.filter((item) => item.type !== 'photo').map((item) => item.url));
  let images = [];
  if (tweet.media?.mosaic?.type === 'mosaic_photo') images = [tweet.media.mosaic.formats?.jpeg];
  else images = (tweet.media?.photos ?? []).map((photo) => `${photo.url}`.replace(/\?.*$/, '') + '?name=large');

  const quoteImage = tweet.quote?.media?.mosaic?.formats?.jpeg ?? tweet.quote?.media?.photos?.[0]?.url;
  if (images.length === 0 && quoteImage) images = [quoteImage];
  const canonicalUrl = tweet.url ?? `https://x.com/i/status/${id}`;
  const directMedia = videos.length > 0 && images.length === 0
    ? [`https://d.vxtwitter.com/i/status/${id}`, ...videos.slice(1)]
    : videos;
  const footer = engagement({ replies: tweet.replies, reposts: tweet.retweets, likes: tweet.likes });
  return createPreview({
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
    media: directMedia,
  });
}

function fromVx(tweet, id) {
  const media = tweet.media_extended ?? [];
  const images = uniqueUrls(media.filter((item) => item.type === 'image').map((item) => item.url));
  const videos = uniqueUrls(media.filter((item) => item.type !== 'image').map((item) => item.url));
  if (images.length > 1 && tweet.combinedMediaUrl) images.splice(0, images.length, tweet.combinedMediaUrl);
  const quoteImage = tweet.qrt?.combinedMediaUrl ?? tweet.qrt?.media_extended?.find((item) => item.type === 'image')?.url;
  if (images.length === 0 && quoteImage) images.push(quoteImage);
  const canonicalUrl = tweet.tweetURL ?? `https://x.com/i/status/${id}`;
  if (videos.length > 0 && images.length === 0) {
    return fallbackPreview(canonicalUrl, `https://vxtwitter.com/i/status/${id}`);
  }
  const footer = engagement({ replies: tweet.replies, reposts: tweet.retweets, likes: tweet.likes });
  return createPreview({
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
  });
}

export const twitterProvider = {
  id: 'twitter',
  patterns: [
    /https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/status\/([0-9]+)/i,
    /https:\/\/twitter\.com\/[A-Za-z0-9_]{1,15}\/status\/([0-9]+)/i,
  ],
  ttlSeconds: 3600,
  cacheKey: (match) => match[1],
  async resolve({ match, http, logger }) {
    const id = match[1];
    try {
      const data = await http.getJson(`https://api.fxtwitter.com/i/status/${id}`);
      if (!data?.tweet) throw new Error('FXTwitter response has no tweet');
      return fromFx(data.tweet, id);
    } catch (fxError) {
      logger?.warn({ id, err: fxError }, 'FXTwitter failed; using VXTwitter');
      try {
        return fromVx(await http.getJson(`https://api.vxtwitter.com/i/status/${id}`), id);
      } catch (vxError) {
        logger?.warn({ id, err: vxError }, 'VXTwitter failed; using proxy preview');
        return fallbackPreview(`https://x.com/i/status/${id}`, `https://fxtwitter.com/i/status/${id}`);
      }
    }
  },
};
