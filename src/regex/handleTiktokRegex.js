import { embedSuppresser } from '../events/embedSuppresser.js';
import { videoLinkSender } from '../events/videoLinkSender.js';
import { typingSender } from '../events/typingSender.js';

export async function handleTiktokRegex(result, message) {
  typingSender(message);
  try {
    videoLinkSender(message, result[0].replace(/tiktok\.com/, 'tnktok.com'));
    await new Promise((resolve) => setTimeout(resolve, 1500));
    embedSuppresser(message);
  } catch {
    console.log('tiktok error: '+ message.guild.name);
  }
};
