import axios from 'axios';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { backupLinkSender } from '../events/backupLinkSender.js';
import { typingSender } from '../events/typingSender.js';

export async function handleTiktokRegex( result, message, spoiler ) {
  try {
    const tkHTML = await axios.request({
      url: result[0].replace(/tiktok\.com/, 'tnktok.com'),
      method: 'get',
      timeout: 3000,
    });

    if (tkHTML.status == 200) {
      await typingSender(message);
      backupLinkSender(message, spoiler, result[0].replace(/tiktok\.com/, 'tnktok.com'));
      await new Promise((resolve) => setTimeout(resolve, 1500));
      embedSuppresser(message);
    } else {
      const tkHTML2 = await axios.request({
        url: result[0].replace(/tiktok\.com/, 'tiktokez.com'),
        method: 'get',
        timeout: 3000,
      });

      if (tkHTML2.status == 200) {
        await typingSender(message);
        backupLinkSender(message, spoiler, result[0].replace(/tiktok\.com/, 'tiktokez.com'));
        await new Promise((resolve) => setTimeout(resolve, 1500));
        embedSuppresser(message);
      } else {
        return;
      }
    }
  } catch {
    // console.log('tiktok error: '+ message.guild.name);
    return;
  }
};
