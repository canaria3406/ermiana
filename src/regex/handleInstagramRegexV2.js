import axios from 'axios';
import { embedSuppresser } from '../events/embedSuppresser.js';
import { backupLinkSender } from '../events/backupLinkSender.js';
import { typingSender } from '../events/typingSender.js';

export async function handleInstagramRegex( result, message, spoiler ) {
  try {
    const igHTML = await axios.request({
      url: `https://www.ddinstagram.com/`,
      method: 'get',
      timeout: 4400,
    });

    if (igHTML.status === 200) {
      await typingSender(message);
      backupLinkSender(message, spoiler, `https://www.ddinstagram.com/p/${result[1]}/`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      embedSuppresser(message);
    } else {
      throw new Error();
    }
  } catch {
    try {
      const igHTML2 = await axios.request({
        url: `https://www.instagramez.com/p/${result[1]}/`,
        method: 'get',
        timeout: 2500,
      });

      if (igHTML2.status === 200) {
        await typingSender(message);
        backupLinkSender(message, spoiler, `https://www.instagramez.com/p/${result[1]}/`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        embedSuppresser(message);
      } else {
        throw new Error();
      }
    } catch {
      return;
    }
  }
};
