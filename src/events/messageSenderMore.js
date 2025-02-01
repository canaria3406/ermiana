import { ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';

export async function messageSenderMore(message, spoiler, iconURL, embed, textinfo, linkArray) {
  try {
    const textinfo2 = textinfo || 'ermiana';
    const iconURL2 = iconURL || 'https://cdn.discordapp.com/avatars/242927802557399040/14d549f14db4efece387552397433e6b.png';
    embed.setFooter({ text: textinfo2, iconURL: iconURL2 });
    const button = new ButtonBuilder()
        .setCustomId('morePictureButton')
        .setLabel('更多圖片')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder()
        .addComponents(button);

    linkArray.forEach((link, index) => {
      const linkButton = new ButtonBuilder()
          .setLabel((index + 2).toString())
          .setURL(link)
          .setStyle(ButtonStyle.Link)
          .setDisabled(true);
      row.addComponents(linkButton);
    });

    await message.reply({ content: spoiler, embeds: [embed], components: [row], allowedMentions: { repliedUser: false } });
  } catch {
    // console.log('button send error');
  }
}
