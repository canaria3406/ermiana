import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import Conf from 'conf';
import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { typingSender } from '../events/typingSender.js';

export async function handleNhRegex( result, message, spoiler ) {
  const iconURL = 'https://ermiana.canaria.cc/pic/eh.png';
  typingSender(message);
  const nid = result[1];
  try {
    const ermianaNh = new Conf({ projectName: 'ermianaJS' });
    if (!ermianaNh.get('NhHeaderCookie')) {
      await reloadNhTK();
    }
    const NhHeaderCookie = ermianaNh.get('NhHeaderCookie');

    const headers = {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Host': 'nhentai.net',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
      'Cookie': NhHeaderCookie,
    };

    const resp = await axios.request({
      method: 'get',
      url: 'https://nhentai.net/api/gallery/' + nid,
      headers: headers,
      timeout: 2000,
    });

    if (resp.status === 200) {
      const tagMap = new Map();
      resp.data.tags.forEach((tag) => {
        const type = tag.type;
        const name = tag.name;

        if (tagMap.has(type)) {
          tagMap.get(type).push(name);
        } else {
          tagMap.set(type, [name]);
        }
      });

      // translate the tag keys
      const translateTags = [];
      const tagReplaceList = new Map([
        ['artist', '繪師'],
        ['category', '類別'],
        ['character', '角色'],
        ['cosplayer', 'coser'],
        ['female', '女性'],
        ['group', '社團'],
        ['language', '語言'],
        ['male', '男性'],
        ['mixed', '混合'],
        ['other', '其他'],
        ['parody', '原作'],
        ['reclass', '重新分類'],
        ['temp', '臨時'],
        ['tag', '標籤'],
      ]);
      tagMap.forEach((value, key) => {
        const values = value.join(', ');
        if (tagReplaceList.has(key)) {
          translateTags.push(tagReplaceList.get(key) + ': ' + values);
        } else {
          translateTags.push(key + ': ' + values);
        }
      });

      const nhEmbed = new EmbedBuilder();
      nhEmbed.setColor(0xed2553);

      try {
        if (resp.data.title.japanese) {
          nhEmbed.setTitle(resp.data.title.japanese);
        } else {
          nhEmbed.setTitle(resp.data.title.english);
        }
      } catch {}

      nhEmbed.setURL(result[0]);
      // nhEmbed.addFields(
      //        { name: "頁數", value: resp.data.num_pages.toString(), inline : true},
      //        { name: "收藏", value: resp.data.num_favorites.toString(), inline : true}
      // );
      try {
        nhEmbed.addFields({ name: '說明', value: translateTags.reverse().join('\n') });
      } catch {}
      try {
        nhEmbed.setImage('https://t.nhentai.net/galleries/' + resp.data.media_id + '/thumb.jpg');
      } catch {}

      messageSender(message, spoiler, iconURL, nhEmbed, 'ermiana');
      embedSuppresser(message);
    } else {
      console.error('Request failed');
    }
  } catch {
    console.log('nh error');
    await reloadNhTK();
  }
};
