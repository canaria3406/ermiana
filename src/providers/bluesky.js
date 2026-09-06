import { createPreview, engagement, fallbackPreview, ICONS, truncate } from './helpers.js';

function postToPreview(post, handle, rkey) {
  const canonicalUrl = `https://bsky.app/profile/${handle}/post/${rkey}`;
  const embedView = post.embed;
  const images = embedView?.images?.map((image) => image.fullsize) ?? [];
  const isVideo = embedView?.$type?.includes('video');
  const footer = engagement({ replies: post.replyCount, reposts: post.repostCount, likes: post.likeCount });
  return createPreview({
    canonicalUrl,
    iconUrl: ICONS.bluesky,
    embed: {
      color: 0x53b4ff,
      author: { name: `@${handle}`, iconUrl: post.author?.avatar },
      title: truncate(post.author?.displayName || handle, 256),
      url: canonicalUrl,
      description: truncate(post.record?.text, 4096),
      image: images[0] ?? (isVideo ? embedView.thumbnail : undefined),
      footer,
    },
    images,
    media: isVideo ? [`https://r.bskx.app/profile/${handle}/post/${rkey}`] : [],
  });
}

export const blueskyProvider = {
  id: 'bluesky',
  patterns: [/https:\/\/bsky\.app\/profile\/([a-zA-Z0-9.-]+)\/post\/([a-zA-Z0-9]{10,16})/i],
  async resolve({ match, http, logger }) {
    const [, handle, rkey] = match;
    try {
      const data = await http.getJson(`https://bskx.app/profile/${handle}/post/${rkey}/json`);
      if (!data?.posts?.[0]) throw new Error('bskx response has no post');
      return postToPreview(data.posts[0], handle, rkey);
    } catch (bskxError) {
      logger?.warn({ handle, rkey, err: bskxError }, 'bskx failed; using public Bluesky API');
      try {
        const identity = await http.getJson(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`);
        const uri = `at://${identity.did}/app.bsky.feed.post/${rkey}`;
        const data = await http.getJson(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}`);
        return postToPreview(data.thread.post, handle, rkey);
      } catch (error) {
        logger?.warn({ handle, rkey, err: error }, 'Bluesky APIs failed; using proxy preview');
        return fallbackPreview(`https://bsky.app/profile/${handle}/post/${rkey}`, `https://bskx.app/profile/${handle}/post/${rkey}`);
      }
    }
  },
};
