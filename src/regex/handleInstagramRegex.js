import { embedSuppresser } from '../common/embedSuppresser.js';

export async function handleInstagramRegex(result, message) {
  try {
    await message.channel.sendTyping();
  } catch {}
  try {
    message.channel.send('https://www.ddinstagram.com/' + result[1] + '/');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    embedSuppresser(message);
  } catch {
    console.log('weibo error: '+ message.guild.name);
  }
};
