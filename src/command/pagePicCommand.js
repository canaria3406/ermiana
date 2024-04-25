export async function pagePicCommand(interaction) {
  try {
    interaction.message.edit({
      components: [],
    });
    interaction.reply( { content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    console.log('button error with rickroll: '+ interaction.message.guild.name);
  } catch {}
}
