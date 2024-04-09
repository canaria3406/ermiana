import { embedSuppresser } from '../events/embedSuppresser.js';

export async function handleTiktokRegex(result, message) {
  try {
    await message.channel.sendTyping();
  } catch {}
  try {
    message.channel.send(result[0].replace(/tiktok\.com/, 'tnktok.com'));
    await new Promise((resolve) => setTimeout(resolve, 1500));
    embedSuppresser(message);
  } catch {
    console.log('tiktok error: '+ message.guild.name);
  }
};
