import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';

export async function morePicCommand(interaction) {
  try {
    let picNow = 5;
    const imageUrl = interaction.message.embeds[0].image.url;
    const picArray = [];
    await interaction.message.components[0].components
        .filter((_button, index) => index < 4)
        .forEach((button, index) => {
          if (button.url !== null) {
            picArray.push(button.url);
          } else if (button.url === null) {
            picArray.push(imageUrl);
            picNow = index;
          }
        });

    const totalPage = picArray.length;
    const targetPage = (picNow + 1) >= totalPage ? 0 : (picNow + 1);

    if (picNow === 5) {
      await interaction.message.edit({
        components: [],
      });
      await interaction.reply( { content: '解析網址發生問題。', ephemeral: true });
      return;
    } else if (totalPage === 1 || totalPage === 0 || totalPage > 4) {
      await interaction.message.edit({
        components: [],
      });
      await interaction.reply( { content: '解析網址發生問題。', ephemeral: true });
      return;
    }

    const currentEmbed = interaction.message.embeds[0];
    const targetEmbed = EmbedBuilder.from(currentEmbed).setImage(picArray[targetPage]);

    const button = new ButtonBuilder()
        .setCustomId('morePictureButton')
        .setLabel('更多圖片')
        .setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder();

    picArray.forEach((link, index) => {
      if (index === targetPage) {
        row.addComponents(button);
      } else {
        const linkButton = new ButtonBuilder()
            .setLabel((index + 1).toString())
            .setURL(link)
            .setStyle(ButtonStyle.Link)
            .setDisabled(true);
        row.addComponents(linkButton);
      }
    });

    await interaction.message.edit({
      components: [row],
      embeds: [targetEmbed],
    });

    await new Promise((resolve) => setTimeout(resolve, 300));
    await interaction.deferUpdate();
  } catch {
    try {
      await interaction.message.edit({
        components: [],
      });
      console.log('more pic error: '+ interaction.message.guild.name);
      await interaction.reply( { content: '解析網址發生問題。', ephemeral: true });
    } catch {
      console.log('more pic error: '+ interaction.message.guild.name);
    }
  }
}
