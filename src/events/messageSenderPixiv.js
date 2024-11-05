import { ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';

export async function messageSenderPixiv(message, spoiler, embed, textinfo, pageCount) {
  try {
    const textinfo2 = textinfo || 'ermiana';
    embed.setFooter({ text: textinfo2, iconURL: 'https://cdn.discordapp.com/avatars/242927802557399040/14d549f14db4efece387552397433e6b.png' });
    const button1 = new ButtonBuilder()
        .setCustomId('theAPicture')
        .setLabel('<<')
        .setStyle(ButtonStyle.Secondary);
    const button2 = new ButtonBuilder()
        .setCustomId('theBPicture')
        .setLabel('<')
        .setStyle(ButtonStyle.Secondary);
    const buttonPage = new ButtonBuilder()
        .setCustomId('pagePicture')
        .setLabel(`1/${pageCount}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);
    const button3 = new ButtonBuilder()
        .setCustomId('theNPicture')
        .setLabel('>')
        .setStyle(ButtonStyle.Secondary);
    const button4 = new ButtonBuilder()
        .setCustomId('theZPicture')
        .setLabel('>>')
        .setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder()
        .addComponents(button1, button2, buttonPage, button3, button4);

    await message.reply({ content: spoiler, embeds: [embed], components: [row], allowedMentions: { repliedUser: false } });
  } catch {
    // console.log('button send error');
  }
}
