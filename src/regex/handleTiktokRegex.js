import { embedSuppresser } from '../events/embedSuppresser.js';
import { backupLinkSender } from '../events/backupLinkSender.js';
import { typingSender } from '../events/typingSender.js';

export async function handleTiktokRegex( result, message, spoiler ) {
  typingSender(message);
  try {
    backupLinkSender(message, spoiler, result[0].replace(/tiktok\.com/, 'tnktok.com'));
    await new Promise((resolve) => setTimeout(resolve, 1500));
    embedSuppresser(message);
  } catch {
    console.log('tiktok error: '+ message.guild.name);
  }
};
