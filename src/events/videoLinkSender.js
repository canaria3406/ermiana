import { PermissionsBitField } from 'discord.js';

export async function videoLinkSender(message, videoLink) {
  try {
    if (message.channel.permissionsFor(message.client.user).has([
      PermissionsBitField.Flags.AttachFiles,
    ]) ) {
      await message.channel.send({ files: [videoLink] });
    } else {
      try {
        await message.channel.send(`[連結](${videoLink})`);
      } catch {
        // console.log('videoLink backup send error');
      }
    }
  } catch {
    // console.log('videoLink send error');
  }
}
