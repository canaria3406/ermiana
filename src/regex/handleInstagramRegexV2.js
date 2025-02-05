import axios from 'axios';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { backupLinkSender } from '../events/backupLinkSender.js';
import { typingSender } from '../events/typingSender.js';

export async function handleInstagramRegex( result, message, spoiler ) {
  try {
    const igHTML = await axios.request({
      url: `https://www.ddinstagram.com/p/DD9yTv4SvWb/`,
      method: 'get',
      timeout: 2000,
    });

    if (igHTML.status == 200) {
      await typingSender(message);
      backupLinkSender(message, spoiler, `https://www.ddinstagram.com/p/${result[1]}/`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      embedSuppresser(message);
    } else {
      const igHTML2 = await axios.request({
        url: `https://www.instagramez.com/p/DD9yTv4SvWb/`,
        method: 'get',
        timeout: 2000,
      });

      if (igHTML2.status == 200) {
        await typingSender(message);
        backupLinkSender(message, spoiler, `https://www.instagramez.com/p/${result[1]}/`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        embedSuppresser(message);
      } else {
        return;
      }
    }
  } catch {
    // console.log('instagram error: '+ message.guild.name);
    return;
  }
  // }
};
