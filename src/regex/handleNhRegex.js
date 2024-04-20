import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import Conf from 'conf';
import { reloadNhTK } from '../utils/reloadNhTK.js';
import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { typingSender } from '../events/typingSender.js';

export async function handleNhRegex( result, message ) {
  typingSender(message);
  const nid = result[1];
  try {
    const ermianaNH = new Conf({ projectName: 'ermianaJS' });
    if (!ermianaNH.get('NhHeaderToken')) {
      await reloadNhTK();
    }
    const NhHeaderToken = ermianaNH.get('NhHeaderToken');

    const headers = {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Host': 'nhentai.net',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
      'Cookie': NhHeaderToken,
    };

    const resp = await axios.request({
      method: 'get',
      url: 'https://nhentai.net/api/gallery/' + nid,
      headers: headers,
      timeout: 2500,
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
      try {
        nhEmbed.setDescription(translateTags.reverse().join('\n'));
      } catch {}
      try {
        nhEmbed.setImage('https://t.nhentai.net/galleries/' + resp.data.media_id + '/thumb.jpg');
      } catch {}

      messageSender(message, nhEmbed, 'ermiana');
      embedSuppresser(message);
    }
  } catch {
    console.log('nh error: '+ message.guild.name);
  }
};
