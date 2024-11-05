export async function messageSender(message, spoiler, embed, textinfo) {
  try {
    const textinfo2 = textinfo || 'ermiana';
    embed.setFooter({ text: textinfo2, iconURL: 'https://cdn.discordapp.com/avatars/242927802557399040/14d549f14db4efece387552397433e6b.png' });
    await message.reply({ content: spoiler, embeds: [embed], allowedMentions: { repliedUser: false } });
  } catch {
    // console.log('message send error');
  }
}
