import { ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';

export async function messageSenderPixiv(message, spoiler, iconURL, embed, textinfo, pageCount) {
  try {
    const textinfo2 = textinfo || 'ermiana';
    const iconURL2 = iconURL || 'https://ermiana.canaria.cc/pic/canaria.png';
    embed.setFooter({ text: textinfo2, iconURL: iconURL2 });
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
