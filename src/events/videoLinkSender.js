export async function videoLinkSender(message, videoLink) {
  try {
    try {
      await message.channel.send({ files: [videoLink] });
    } catch {
      await message.channel.send(`[連結](${videoLink})`);
    }
  } catch {
    // console.log('videoLink send error');
  }
}
