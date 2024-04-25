export async function morePicCommand(interaction) {
  try {
    const imageUrl = interaction.message.embeds[0].image.url;
    const match = imageUrl.match(/\/(\d+)_p0/);
    if (match) {
      const pid = parseInt(match[1]);
      interaction.reply( { content: `測試中... pid = ${pid}\n${imageUrl.replace('_p0', `_p1` )}` });
    } else {
      interaction.reply( { content: '取得圖片發生問題。', ephemeral: true });
    }
  } catch {}
}
