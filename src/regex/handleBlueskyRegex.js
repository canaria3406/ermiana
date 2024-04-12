import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { typingSender } from '../events/typingSender.js';

export async function handleBlueskyRegex(result, message) {
  typingSender(message);
  try {
    const didResp = await axios.request({
      method: 'get',
      url: 'https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=' + result[1],
      timeout: 2000,
    });

    // console.log(didResp.data.did);
    if (didResp.status === 200) {
      const threadResp = await axios.request({
        method: 'get',
        url: 'https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://' + didResp.data.did + '/app.bsky.feed.post/' + result[2],
        timeout: 2000,
      });

      // console.log(threadResp.data.thread);
      if (threadResp.status === 200) {
        const blueskyEmbed = new EmbedBuilder();
        blueskyEmbed.setColor(0x53b4ff);
        try {
          if (threadResp.data.thread.post.author?.avatar) {
            blueskyEmbed.setAuthor({ name: '@' + result[1], iconURL: threadResp.data.thread.post.author.avatar });
          } else {
            blueskyEmbed.setAuthor({ name: '@' + result[1] });
          }
        } catch {}
        try {
          if (threadResp.data.thread.post.author?.displayName) {
            blueskyEmbed.setTitle(threadResp.data.thread.post.author.displayName);
            blueskyEmbed.setURL('https://bsky.app/profile/' + result[1] + '/post/' + result[2]);
          } else {
            blueskyEmbed.setTitle(result[1]);
            blueskyEmbed.setURL('https://bsky.app/profile/' + result[1] + '/post/' + result[2]);
          }
        } catch {}
        try {
          if (threadResp.data.thread.post.record.text) {
            blueskyEmbed.setDescription(threadResp.data.thread.post.record.text);
          }
        } catch {}
        try {
          if (threadResp.data.thread.post.embed?.images) {
            blueskyEmbed.setImage(threadResp.data.thread.post.embed.images[0].fullsize);
          }
        } catch {}

        const threadinfo ='💬' + threadResp.data.thread.post.replyCount.toString() + ' 🔁' + threadResp.data.thread.post.repostCount.toString() + ' ❤️' + threadResp.data.thread.post.likeCount.toString();

        messageSender(message, blueskyEmbed, threadinfo);
        embedSuppresser(message);

        try {
          if (threadResp.data.thread.post.embed?.images.length > 1) {
            threadResp.data.thread.post.embed.images
                .filter((_image, index) => index > 0)
                .forEach((image) => {
                  const picEmbed = new EmbedBuilder();
                  picEmbed.setColor(0x53b4ff);
                  picEmbed.setImage(image.fullsize);
                  messageSender(message, picEmbed, 'ermiana');
                });
          }
        } catch {}
      }
    }
  } catch {
    console.log('bluesky error: '+ message.guild.name);
  }
};
