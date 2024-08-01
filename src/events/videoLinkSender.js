export async function videoLinkSender(message, videoLink) {
  try {
    await message.channel.send(`[連結](${videoLink})`);
  } catch {
    // console.log('videoLink send error');
  }
}
