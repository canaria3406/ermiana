export async function backupLinkSender(message, backupLink) {
  try {
    await message.reply({ content: backupLink, allowedMentions: { repliedUser: false } });
  } catch {
    // console.log('backupLink send error');
  }
}
