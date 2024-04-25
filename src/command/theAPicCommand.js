export async function theAPicCommand(interaction) {
  try {
    const imageUrl = interaction.message.embeds[0].image.url;
    const page = interaction.message.components[0].components[2].label.match(/(\d+)\/(\d+)/);

    if (!imageUrl || !page) {
      interaction.message.edit({
        components: [],
      });
      interaction.reply( { content: '取得圖片發生問題。', ephemeral: true });
      return;
    }

    const currentPage = parseInt(page[1]);
    const totalPage = parseInt(page[2]);
    const targetPage = 1;

    if (currentPage === 1) {
      interaction.deferUpdate();
      return;
    }

    if (targetPage < 1 || targetPage > totalPage) {
      interaction.message.edit({
        components: [],
      });
      interaction.reply( { content: '取得圖片發生問題。', ephemeral: true });
      return;
    }

    const match = imageUrl.match(/\d+_p(\d+)(?:\.|_)/);
    if (!match) {
      interaction.message.edit({
        components: [],
      });
      interaction.reply( { content: '取得圖片發生問題。', ephemeral: true });
      return;
    } else if (parseInt(match[1]) !== currentPage -1) {
      interaction.message.edit({
        components: [],
      });
      interaction.reply( { content: '取得圖片發生問題。', ephemeral: true });
      return;
    } else {
      interaction.reply( { content: `to page ${targetPage}` });
    }
  } catch {}
}
