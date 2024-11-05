import { PermissionsBitField } from 'discord.js';

export async function videoLinkSender(message, spoiler, videoLink) {
  function spoilerCheck(videoLink) {
    if (spoiler) {
      return `||[連結](${videoLink})||`;
    }
    return `[連結](${videoLink})`;
  }

  try {
    if (videoLink.includes('ext_tw_video') || videoLink.includes('tweet_video')) {
      if (message.channel.permissionsFor(message.client.user).has([
        PermissionsBitField.Flags.AttachFiles,
      ]) ) {
        message.channel.send({ files: [videoLink] });
      } else {
        await message.channel.send(spoilerCheck(videoLink));
      }
    } else {
      await message.channel.send(spoilerCheck(videoLink));
    }
  } catch {
    try {
      await message.channel.send(spoilerCheck(videoLink));
      return;
    } catch {
      // console.log('videoLink backup send error');
    }
  }
}

/*
export async function videoLinkSender(message, spoiler, videoLink) {
  try {
    await message.channel.send(`[連結](${videoLink})`);
  } catch {
    // console.log('videoLink send error');
  }
}
*/
