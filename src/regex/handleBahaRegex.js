import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import cheerio from 'cheerio';
import Conf from 'conf';
import { messageSender } from '../common/messageSender.js';
import { reloadBahaTK } from '../common/reloadBahaTK.js';
import { embedSuppresser } from '../common/embedSuppresser.js';

export async function handleBahaRegex(result, message) {
  try {
    await message.channel.sendTyping();
  } catch {}
  try {
    const ermianaBH = new Conf({ projectName: 'ermianaJS' });
    if (!ermianaBH.get('BAHAENUR') || !ermianaBH.get('BAHARUNE')) {
      await reloadBahaTK();
    }
    const BAHAENUR = ermianaBH.get('BAHAENUR');
    const BAHARUNE = ermianaBH.get('BAHARUNE');

    const bahaHTML = await axios.request({
      url: 'https://forum.gamer.com.tw/' + result[1],
      method: 'get',
      headers: { Cookie: 'BAHAENUR=' + BAHAENUR + '; BAHARUNE=' + BAHARUNE + ';' },
      timeout: 2500,
    });

    const $ = cheerio.load(bahaHTML.data);
    const bahaEmbed = new EmbedBuilder();
    bahaEmbed.setColor(0x5FC9CA);
    try {
      if ($('meta[property=og:title]').attr('content')) {
        bahaEmbed.setTitle($('meta[property=og:title]').attr('content'));
      } else {
        bahaEmbed.setTitle('@場外休憩區 哈啦板 - 巴哈姆特');
      }
    } catch {}
    try {
      if (result[1]) {
        bahaEmbed.setURL('https://forum.gamer.com.tw/' + result[1]);
      }
    } catch {}
    try {
      if ($('meta[property=og:description]').attr('content')) {
        bahaEmbed.setDescription($('meta[property=og:description]').attr('content'));
      }
    } catch {}
    try {
      if ($('meta[property=og:image]').attr('content')) {
        bahaEmbed.setImage($('meta[property=og:image]').attr('content'));
      }
    } catch {}
    try {
      messageSender(message.channel, bahaEmbed, 'ermiana');
      embedSuppresser(message);
    } catch {}
  } catch {
    await reloadBahaTK();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const ermianaBH2 = new Conf({ projectName: 'ermianaJS' });
      const BAHAENUR2 = ermianaBH2.get('BAHAENUR');
      const BAHARUNE2 = ermianaBH2.get('BAHARUNE');

      const bahaHTML2 = await axios.request({
        url: 'https://forum.gamer.com.tw/' + result[1],
        method: 'get',
        headers: { Cookie: 'BAHAENUR=' + BAHAENUR2 + '; BAHARUNE=' + BAHARUNE2 + ';' },
        timeout: 2500,
      });

      const $ = cheerio.load(bahaHTML2.data);

      const bahaEmbed2 = new EmbedBuilder();
      bahaEmbed2.setColor(0x5FC9CA);
      try {
        if ($('meta[property=og:title]').attr('content')) {
          bahaEmbed2.setTitle($('meta[property=og:title]').attr('content'));
        } else {
          bahaEmbed2.setTitle('@場外休憩區 哈啦板 - 巴哈姆特');
        }
      } catch {}
      try {
        if (result[1]) {
          bahaEmbed2.setURL('https://forum.gamer.com.tw/' + result[1]);
        }
      } catch {}
      try {
        if ($('meta[property=og:description]').attr('content')) {
          bahaEmbed2.setDescription($('meta[property=og:description]').attr('content'));
        }
      } catch {}
      try {
        if ($('meta[property=og:image]').attr('content')) {
          bahaEmbed2.setImage($('meta[property=og:image]').attr('content'));
        }
      } catch {}
      try {
        messageSender(message.channel, bahaEmbed2, 'ermiana');
        embedSuppresser(message);
      } catch {}
    } catch {
      console.log('baha error: '+ message.guild.name);
    }
  }
};
