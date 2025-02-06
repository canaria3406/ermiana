export async function messageSender(message, spoiler, iconURL, embed, textinfo) {
  try {
    const textinfo2 = textinfo || 'ermiana';
    const iconURL2 = iconURL || 'https://ermiana.canaria.cc/pic/canaria.png';
    embed.setFooter({ text: textinfo2, iconURL: iconURL2 });
    await message.reply({ content: spoiler, embeds: [embed], allowedMentions: { repliedUser: false } });
  } catch {
    // console.log('message send error');
  }
}
