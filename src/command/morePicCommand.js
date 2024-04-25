export async function morePicCommand(interaction) {
  try {
    const url = interaction.message.embeds[0].url;
    if (url) {
      interaction.reply( { content: `<${url}>` });
    } else {
      interaction.reply( { content: '發生問題。', ephemeral: true });
    }
  } catch {}
}
