/*
import { PermissionsBitField } from 'discord.js';

export async function videoLinkSender(message, videoLink) {
  try {
    if (message.channel.permissionsFor(message.client.user).has([
      PermissionsBitField.Flags.AttachFiles,
    ]) ) {
      await Promise.race([
        message.channel.send({ files: [videoLink] }),
        new Promise((_, reject) => setTimeout(() => {
          reject(new Error());
        }, 3000)),
      ]);
    } else {
      throw new Error;
    }
  } catch {
    try {
      await message.channel.send(`[連結](${videoLink})`);
      return;
    } catch {
      // console.log('videoLink backup send error');
    }
  }
}
*/

export async function videoLinkSender(message, videoLink) {
  try {
    await message.channel.send(`[連結](${videoLink})`);
  } catch {
    // console.log('videoLink send error');
  }
}
