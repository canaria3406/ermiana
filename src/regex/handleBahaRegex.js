import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Conf from 'conf';
import { reloadBahaTK } from '../utils/reloadBahaTK.js';
import { messageSender } from '../events/messageSender.js';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { typingSender } from '../events/typingSender.js';

export async function handleBahaRegex( result, message, spoiler ) {
  const iconURL = 'https://ermiana.canaria.cc/pic/baha.png';
  typingSender(message);
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
    bahaEmbed.setColor(1559500);
    bahaEmbed.setTitle($('meta[property=og:title]').attr('content'));
    bahaEmbed.setURL('https://forum.gamer.com.tw/' + result[1]);
    try {
      bahaEmbed.setDescription($('meta[property=og:description]').attr('content'));
    } catch {}
    try {
      bahaEmbed.setImage($('meta[property=og:image]').attr('content'));
    } catch {}

    messageSender(message, spoiler, iconURL, bahaEmbed, 'ermiana');
    embedSuppresser(message);
  } catch {
    // console.log('baha error');
    await reloadBahaTK();
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
      bahaEmbed2.setColor(1559500);
      bahaEmbed2.setTitle($('meta[property=og:title]').attr('content'));
      bahaEmbed2.setURL('https://forum.gamer.com.tw/' + result[1]);
      try {
        bahaEmbed2.setDescription($('meta[property=og:description]').attr('content'));
      } catch {}
      try {
        bahaEmbed2.setImage($('meta[property=og:image]').attr('content'));
      } catch {}

      messageSender(message, spoiler, iconURL, bahaEmbed2, 'ermiana');
      embedSuppresser(message);
    } catch {
      console.log('baha error: '+ message.guild.name);
      // console.log('baha second try error');
    }
  }
};
