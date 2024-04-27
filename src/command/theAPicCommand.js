import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';

export async function theAPicCommand(interaction) {
  try {
    const imageUrl = interaction.message.embeds[0].image.url;
    const page = interaction.message.components[0].components[2].label.match(/(\d+)\/(\d+)/);

    if (!imageUrl || !page) {
      interaction.message.edit({
        components: [],
      });
      interaction.reply( { content: '取得圖片發生問題。', ephemeral: true });
      console.log('button error: '+ interaction.message.guild.name);
      return;
    }

    const currentPage = parseInt(page[1]);
    const totalPage = parseInt(page[2]);
    const targetPage = 1;

    if (currentPage === 1) {
      await interaction.deferUpdate();
      return;
    }

    if (targetPage < 1 || targetPage > totalPage) {
      interaction.message.edit({
        components: [],
      });
      interaction.reply( { content: '取得圖片發生問題。', ephemeral: true });
      console.log('button error: '+ interaction.message.guild.name);
      return;
    }

    const match = imageUrl.match(/\d+_p(\d+)(?:\.|_)/);
    if (!match) {
      interaction.message.edit({
        components: [],
      });
      interaction.reply( { content: '取得圖片發生問題。', ephemeral: true });
      console.log('button error: '+ interaction.message.guild.name);
      return;
    } else if (parseInt(match[1]) !== currentPage -1) {
      interaction.message.edit({
        components: [],
      });
      interaction.reply( { content: '取得圖片發生問題。', ephemeral: true });
      console.log('button error: '+ interaction.message.guild.name);
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

      await interaction.deferUpdate();
    }
  } catch {}
}
