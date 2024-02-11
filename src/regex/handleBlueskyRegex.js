import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { messageSender } from '../common/messageSender.js';
import { embedSuppresser } from '../common/embedSuppresser.js';

export async function handleBlueskyRegex(result, message) {
  try {
    await message.channel.sendTyping();
  } catch {}
  try {
    const didResp = await axios.request({
      method: 'get',
      url: 'https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=' + result[1],
      timeout: 2000,
    });
    // console.log(didResp.data.did);
    const threadResp = await axios.request({
      method: 'get',
      url: 'https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://' + didResp.data.did + '/app.bsky.feed.post/' + result[2],
      timeout: 2000,
    });
    // console.log(threadResp.data.thread);
    const blueskyEmbed = new EmbedBuilder();
    blueskyEmbed.setColor(0x1DA1F2);
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
        blueskyEmbed.setTitle('@' + result[1]);
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

    messageSender(message.channel, blueskyEmbed, threadinfo);
    embedSuppresser(message);
  } catch {
    console.log('bluesky error: '+ message.guild.name);
  }
};
