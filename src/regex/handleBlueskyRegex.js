import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { videoLinkSender } from '../events/videoLinkSender.js';
import { backupLinkSender } from '../events/backupLinkSender.js';
import { typingSender } from '../events/typingSender.js';
import { messageSenderMore } from '../events/messageSenderMore.js';

export async function handleBlueskyRegex(result, message, spoiler) {
  const iconURL = 'https://ermiana.canaria.cc/pic/bluesky.png';
  typingSender(message);

  try {
    // Try bskx.app API first (similar to fx/vxtwitter approach)
    const bskxResp = await axios.request({
      method: 'get',
      url: `https://bskx.app/profile/${result[1]}/post/${result[2]}/json`,
      timeout: 2500,
      headers: {
        'User-Agent': 'ermiana (https://github.com/canaria3406/ermiana)',
      },
    });

    if (
      bskxResp.status === 200 &&
      bskxResp.data.posts &&
      bskxResp.data.posts.length > 0
    ) {
      const post = bskxResp.data.posts[0];
      const blueskyEmbed = new EmbedBuilder();
      blueskyEmbed.setColor(0x53b4ff);

      // Set author info
      try {
        if (post.author?.avatar) {
          blueskyEmbed.setAuthor({
            name: `@${result[1]}`,
            iconURL: post.author.avatar,
          });
        } else {
          blueskyEmbed.setAuthor({ name: `@${result[1]}` });
        }
      } catch {}

      // Set title and URL
      try {
        if (post.author?.displayName) {
          blueskyEmbed.setTitle(post.author.displayName);
        } else {
          blueskyEmbed.setTitle(result[1]);
        }
        blueskyEmbed.setURL(
            `https://bsky.app/profile/${result[1]}/post/${result[2]}`,
        );
      } catch {}

      // Set description (post text)
      try {
        if (post.record?.text) {
          blueskyEmbed.setDescription(post.record.text);
        }
      } catch {}

      // Set engagement info
      const threadinfo = `💬${post.replyCount?.toString() || '0'} 🔁${post.repostCount?.toString() || '0'} ❤️${post.likeCount?.toString() || '0'}`;

      // Handle different media types
      try {
        if (post.embed?.$type === 'app.bsky.embed.video#view') {
          // Video post
          if (post.embed.thumbnail) {
            blueskyEmbed.setImage(post.embed.thumbnail);
          }
          messageSender(message, spoiler, iconURL, blueskyEmbed, threadinfo);
          embedSuppresser(message);

          // Send direct video link using r.bskx.app
          videoLinkSender(
              message,
              spoiler,
              `https://r.bskx.app/profile/${result[1]}/post/${result[2]}`,
          );
        } else if (post.embed?.$type === 'app.bsky.embed.images#view') {
          // Image post
          if (post.embed.images && post.embed.images.length === 1) {
            // Single image
            blueskyEmbed.setImage(post.embed.images[0].fullsize);
            messageSender(message, spoiler, iconURL, blueskyEmbed, threadinfo);
            embedSuppresser(message);
          } else if (post.embed.images && post.embed.images.length > 1) {
            // Multiple images
            blueskyEmbed.setImage(post.embed.images[0].fullsize);
            const imageArray = post.embed.images
                .filter((_image, index) => index > 0 && index < 4)
                .map((image) => image.fullsize);
            messageSenderMore(
                message,
                spoiler,
                iconURL,
                blueskyEmbed,
                threadinfo,
                imageArray,
            );
            embedSuppresser(message);
          }
        } else {
          // Text-only post
          messageSender(message, spoiler, iconURL, blueskyEmbed, threadinfo);
          embedSuppresser(message);
        }
      } catch {
        // Fallback for media handling errors
        messageSender(message, spoiler, iconURL, blueskyEmbed, threadinfo);
        embedSuppresser(message);
      }
    } else {
      throw new Error('bskx.app API error');
    }
  } catch {
    // Fallback to original Bluesky API approach
    try {
      const didResp = await axios.request({
        method: 'get',
        url: `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${result[1]}`,
        timeout: 2000,
      });

      if (didResp.status === 200) {
        const threadResp = await axios.request({
          method: 'get',
          url: `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://${didResp.data.did}/app.bsky.feed.post/${result[2]}`,
          timeout: 2000,
        });

        if (threadResp.status === 200) {
          const blueskyEmbed = new EmbedBuilder();
          blueskyEmbed.setColor(0x53b4ff);

          try {
            if (threadResp.data.thread.post.author?.avatar) {
              blueskyEmbed.setAuthor({
                name: `@${result[1]}`,
                iconURL: threadResp.data.thread.post.author.avatar,
              });
            } else {
              blueskyEmbed.setAuthor({ name: `@${result[1]}` });
            }
          } catch {}

          try {
            if (threadResp.data.thread.post.author?.displayName) {
              blueskyEmbed.setTitle(
                  threadResp.data.thread.post.author.displayName,
              );
              blueskyEmbed.setURL(
                  `https://bsky.app/profile/${result[1]}/post/${result[2]}`,
              );
            } else {
              blueskyEmbed.setTitle(result[1]);
              blueskyEmbed.setURL(
                  `https://bsky.app/profile/${result[1]}/post/${result[2]}`,
              );
            }
          } catch {}

          try {
            if (threadResp.data.thread.post.record.text) {
              blueskyEmbed.setDescription(
                  threadResp.data.thread.post.record.text,
              );
            }
          } catch {}

          // Handle video in fallback mode
          try {
            if (
              threadResp.data.thread.post.embed?.$type ===
              'app.bsky.embed.video'
            ) {
              // Send embed first, then video link
              messageSender(
                  message,
                  spoiler,
                  iconURL,
                  blueskyEmbed,
                  threadinfo,
              );
              embedSuppresser(message);

              // For fallback, try to use bskx.app direct link for video
              videoLinkSender(
                  message,
                  spoiler,
                  `https://r.bskx.app/profile/${result[1]}/post/${result[2]}`,
              );
            }
          } catch {}

          try {
            if (threadResp.data.thread.post.embed?.images) {
              blueskyEmbed.setImage(
                  threadResp.data.thread.post.embed.images[0].fullsize,
              );
            }
          } catch {}

          const threadinfo = `💬${threadResp.data.thread.post.replyCount.toString()} 🔁${threadResp.data.thread.post.repostCount.toString()} ❤️${threadResp.data.thread.post.likeCount.toString()}`;

          try {
            if (
              !threadResp.data.thread.post.embed?.images &&
              threadResp.data.thread.post.embed?.$type !==
                'app.bsky.embed.video'
            ) {
              messageSender(
                  message,
                  spoiler,
                  iconURL,
                  blueskyEmbed,
                  threadinfo,
              );
              embedSuppresser(message);
            } else if (threadResp.data.thread.post.embed?.images.length == 1) {
              messageSender(
                  message,
                  spoiler,
                  iconURL,
                  blueskyEmbed,
                  threadinfo,
              );
              embedSuppresser(message);
            } else if (threadResp.data.thread.post.embed?.images.length > 1) {
              const imageArray = threadResp.data.thread.post.embed.images
                  .filter((_image, index) => index > 0 && index < 4)
                  .map((image) => image.fullsize);
              messageSenderMore(
                  message,
                  spoiler,
                  iconURL,
                  blueskyEmbed,
                  threadinfo,
                  imageArray,
              );
              embedSuppresser(message);
            }
          } catch {}
        }
      }
    } catch {
      // Final fallback to bskx.app link
      try {
        backupLinkSender(
            message,
            spoiler,
            `https://bskx.app/profile/${result[1]}/post/${result[2]}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1500));
        embedSuppresser(message);
      } catch {
        console.log(`bluesky error: ${message.guild.name}`);
      }
    }
  }
}
