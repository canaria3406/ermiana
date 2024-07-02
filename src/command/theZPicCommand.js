import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';

export async function theZPicCommand(interaction) {
  try {
    const imageUrl = interaction.message.embeds[0].image.url;
    const page = interaction.message.components[0].components[2].label.match(/(\d+)\/(\d+)/);

    if (!imageUrl || !page) {
      await interaction.message.edit({
        components: [],
      });
      await interaction.reply( { content: '取得圖片發生問題。', ephemeral: true });
      console.log('button error1: '+ interaction.message.guild.name);
      return;
    }

    const currentPage = parseInt(page[1]);
    const totalPage = parseInt(page[2]);
    const targetPage = totalPage;

    if (currentPage === totalPage) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await interaction.deferUpdate();
      return;
    }

    if (targetPage < 1 || targetPage > totalPage) {
      await interaction.message.edit({
        components: [],
      });
      await interaction.reply( { content: '取得圖片發生問題。', ephemeral: true });
      console.log('button error2: '+ interaction.message.guild.name);
      return;
    }

    const match = imageUrl.match(/\d+_p(\d+)(?:\.|_)/);
    if (!match) {
      await interaction.message.edit({
        components: [],
      });
      await interaction.reply( { content: '取得圖片發生問題。', ephemeral: true });
      console.log('button error3: '+ interaction.message.guild.name);
      return;
    } else if (parseInt(match[1]) !== currentPage -1) {
      await interaction.message.edit({
        components: [],
      });
      await interaction.reply( { content: '取得圖片發生問題。', ephemeral: true });
      console.log('button error4: '+ interaction.message.guild.name);
      return;
    } else {
      const currentEmbed = interaction.message.embeds[0];
      const targetEmbed = EmbedBuilder.from(currentEmbed).setImage(imageUrl.replace(`_p${currentPage - 1}`, `_p${targetPage - 1}`));

      const currentComponents = interaction.message.components[0];
      const buttonPage = new ButtonBuilder()
          .setCustomId('pagePicture')
          .setLabel(`${targetPage}/${totalPage}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);
      const targetComponents = new ActionRowBuilder()
          .addComponents(currentComponents.components[0], currentComponents.components[1], buttonPage, currentComponents.components[3], currentComponents.components[4]);

      await interaction.message.edit({
        components: [targetComponents],
        embeds: [targetEmbed],
      });

      await new Promise((resolve) => setTimeout(resolve, 300));
      await interaction.deferUpdate();
    }
  } catch {}
}
