export async function messageSender(channel, embed, textinfo) {
  try {
    const textinfo2 = textinfo || 'canaria3406';
    embed.setFooter({ text: textinfo2, iconURL: 'https://cdn.discordapp.com/avatars/242927802557399040/1f3b1744568e4333a8889eafaa1f982a.png' });
    await channel.send({ embeds: [embed] });
  } catch {
    console.log('message send error');
  }
}
