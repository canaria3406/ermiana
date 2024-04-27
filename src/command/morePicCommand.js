import { EmbedBuilder } from 'discord.js';

export async function morePicCommand(interaction) {
  try {
    const picArray = [];
    interaction.message.components[0].components
        .filter((_button, index) => index > 0 && index < 4)
        .forEach((button) => {
          picArray.push(button.url);
        });

    if (picArray) {
      const embedColor = interaction.message.embeds[0].color || 0x0e2e47;

      picArray.forEach(async (image, index) => {
        const picEmbed = new EmbedBuilder();
        picEmbed.setColor(embedColor);
        picEmbed.setImage(image);
        picEmbed.setFooter({ text: 'ermiana', iconURL: 'https://cdn.discordapp.com/avatars/242927802557399040/14d549f14db4efece387552397433e6b.png' });

        if (index === 0) {
          interaction.reply({ embeds: [picEmbed] });
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          await new Promise((resolve) => setTimeout(resolve, 200));
          interaction.message.channel.send({ embeds: [picEmbed] });
        }
      });

      interaction.message.edit({
        components: [],
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await interaction.deferUpdate();
    } else {
      await interaction.message.edit({
        components: [],
      });
      console.log('more pic error: '+ interaction.message.guild.name);
      await interaction.reply( { content: '解析網址發生問題。', ephemeral: true });
    }
  } catch {}
}
