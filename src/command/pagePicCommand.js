export async function pagePicCommand(interaction) {
  try {
    interaction.reply( { content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    interaction.message.edit({
      components: [],
    });
  } catch {}
}
