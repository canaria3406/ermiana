import axios from 'axios';

export class BlueskyService {
  static async getPostData(handle, postId) {
    // Try bskx.app API first
    try {
      const response = await axios.request({
        method: 'get',
        url: `https://bskx.app/profile/${handle}/post/${postId}/json`,
        timeout: 2500,
        headers: {
          'User-Agent': 'ermiana (https://github.com/canaria3406/ermiana)',
        },
      });

      if (response.status !== 200 || !response.data.posts || response.data.posts.length === 0) {
        throw new Error('bskx.app failed');
      }

      const post = response.data.posts[0];

      // Extract media
      const media = {
        type: post.embed?.$type || null,
        images: [],
        videos: [],
        thumbnail: null,
      };

      if (post.embed?.$type === 'app.bsky.embed.images#view' && post.embed.images) {
        media.images = post.embed.images.map((img) => ({
          thumb: img.thumb,
          fullsize: img.fullsize,
          alt: img.alt || '',
        }));
      } else if (post.embed?.$type === 'app.bsky.embed.video#view') {
        media.thumbnail = post.embed.thumbnail;
        media.videos.push({
          directUrl: `https://r.bskx.app/profile/${handle}/post/${postId}`,
        });
      } else if (post.embed?.$type === 'app.bsky.embed.recordWithMedia#view') {
        if (post.embed.media?.images) {
          media.images = post.embed.media.images.map((img) => ({
            thumb: img.thumb,
            fullsize: img.fullsize,
            alt: img.alt || '',
          }));
        }
      }

      return {
        success: true,
        data: {
          id: postId,
          handle,
          url: `https://bsky.app/profile/${handle}/post/${postId}`,
          author: {
            handle: handle,
            displayName: post.author?.displayName || handle,
            avatar: post.author?.avatar || null,
          },
          text: post.record?.text || '',
          createdAt: post.record?.createdAt || null,
          stats: {
            replies: post.replyCount || 0,
            reposts: post.repostCount || 0,
            likes: post.likeCount || 0,
          },
          media,
          fallbackUrl: `https://bskx.app/profile/${handle}/post/${postId}`,
        },
      };
    } catch (bskxError) {
      // Try official Bluesky API as backup
      try {
        console.log('bskx.app failed, trying official Bluesky API...');
        const threadResponse = await axios.request({
          method: 'get',
          url: `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://${handle}/app.bsky.feed.post/${postId}`,
          timeout: 2500,
          headers: {
            'User-Agent': 'ermiana (https://github.com/canaria3406/ermiana)',
          },
        });

        if (!threadResponse.data.thread?.post) {
          throw new Error('Bluesky Thread API failed');
        }

        const threadPost = threadResponse.data.thread.post;

        // Extract media from thread response
        const media = {
          type: threadPost.embed?.$type || null,
          images: [],
          videos: [],
          thumbnail: null,
        };

        if (threadPost.embed?.images) {
          media.images = threadPost.embed.images.map((img) => ({
            thumb: img.thumb,
            fullsize: img.fullsize,
            alt: img.alt || '',
          }));
        } else if (threadPost.embed?.$type === 'app.bsky.embed.video#view') {
          media.thumbnail = threadPost.embed.thumbnail;
          media.videos.push({
            directUrl: `https://r.bskx.app/profile/${handle}/post/${postId}`,
          });
        }

        return {
          success: true,
          data: {
            id: postId,
            handle,
            url: `https://bsky.app/profile/${handle}/post/${postId}`,
            author: {
              handle: threadPost.author?.handle || handle,
              displayName: threadPost.author?.displayName || handle,
              avatar: threadPost.author?.avatar || null,
            },
            text: threadPost.record?.text || '',
            createdAt: threadPost.record?.createdAt || null,
            stats: {
              replies: threadPost.replyCount || 0,
              reposts: threadPost.repostCount || 0,
              likes: threadPost.likeCount || 0,
            },
            media,
            fallbackUrl: `https://bskx.app/profile/${handle}/post/${postId}`,
          },
        };
      } catch (threadError) {
        console.error('Bluesky API Error (both APIs failed):', threadError.message);
        // Return fallback URL instead of throwing
        return {
          success: true,
          data: {
            id: postId,
            handle,
            url: `https://bsky.app/profile/${handle}/post/${postId}`,
            fallbackUrl: `https://bskx.app/profile/${handle}/post/${postId}`,
            error: 'API unavailable, use fallback URL',
          },
        };
      }
    }
  }
}
