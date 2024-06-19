import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { messageSender } from '../events/messageSender.js';
// import { messageSubSender } from '../events/messageSubSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { videoLinkSender } from '../events/videoLinkSender.js';
import { backupLinkSender } from '../events/backupLinkSender.js';
import { typingSender } from '../events/typingSender.js';

export async function handleInstagramRegex(result, message) {
  typingSender(message);
  const igid = result[1];
  try {
    const igResp = await axios({
      url: 'https://www.instagram.com/graphql/query/',
      method: 'get',
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Host': 'www.instagram.com',
        'Origin': 'https://www.instagram.com',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
        'Referer': `https://www.instagram.com/p/${igid}/`,
      },
      params: {
        query_hash: 'b3055c01b4b222b8a47dc12b090e4e64',
        variables: JSON.stringify({ shortcode: igid }),
      },
      timeout: 3000,
    });

    if (igResp.status === 200) {
      const igEmbed = new EmbedBuilder();
      igEmbed.setColor(0xE1306C);
      try {
        if (igResp.data.data.shortcode_media.owner.username && igResp.data.data.shortcode_media.owner.profile_pic_url) {
          igEmbed.setAuthor({ name: '@' + igResp.data.data.shortcode_media.owner.username, iconURL: igResp.data.data.shortcode_media.owner.profile_pic_url });
        } else if (igResp.data.data.shortcode_media.owner.username) {
          igEmbed.setAuthor({ name: '@' + igResp.data.data.shortcode_media.owner.username });
        }
      } catch {}
      try {
        if (igResp.data.data.shortcode_media.owner.full_name) {
          igEmbed.setTitle(igResp.data.data.shortcode_media.owner.full_name);
        } else {
          igEmbed.setTitle('Instagram');
        }
      } catch {}
      try {
        if (igResp.data.data.shortcode_media.shortcode) {
          igEmbed.setURL('https://www.instagram.com/p/' + igResp.data.data.shortcode_media.shortcode + '/');
        } else {
          igEmbed.setURL('https://www.instagram.com/p/' + igid + '/');
        }
      } catch {}
      try {
        if (igResp.data.data.shortcode_media.edge_media_to_caption.edges[0].node.text) {
          igEmbed.setDescription(igResp.data.data.shortcode_media.edge_media_to_caption.edges[0].node.text.substring(0, 300));
        }
      } catch {}
      try {
        if (igResp.data.data.shortcode_media.display_url && !igResp.data.data.shortcode_media.is_video) {
          igEmbed.setImage(igResp.data.data.shortcode_media.display_url);
        }
      } catch {}
      const iginfo = '💬' + (igResp.data.data.shortcode_media.edge_media_to_comment.count?.toString() || '0') + ' ❤️' + (igResp.data.data.shortcode_media.edge_media_preview_like.count?.toString() || '0');
      try {
        messageSender(message, igEmbed, iginfo);
        embedSuppresser(message);
      } catch {}
      try {
        if (igResp.data.data.shortcode_media.is_video) {
          videoLinkSender(message, `https://d.ddinstagram.com/p/${igid}/`);
        }
      } catch {}
      /*
      try {
        if (igResp.data.data.shortcode_media.edge_sidecar_to_children.edges) {
          igResp.data.data.shortcode_media.edge_sidecar_to_children.edges
              .filter((_edge, index) => index > 0 && index < 4)
              .forEach((edge) => {
                if (!edge.node.is_video) {
                  const picEmbed = new EmbedBuilder();
                  picEmbed.setColor(0xE1306C);
                  picEmbed.setImage(edge.node.display_url);
                  messageSubSender(message, picEmbed, 'ermiana');
                }
              });
        }
      } catch {}
      */
    } else {
      throw new Error();
    }
  } catch {
    try {
      backupLinkSender(message, `https://www.ddinstagram.com/p/${result[1]}/`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      embedSuppresser(message);
    } catch {
      console.log('instagram error: '+ message.guild.name);
    }
  }
};
