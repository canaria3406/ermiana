import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';

export async function botStatusCommand(interaction) {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  try {
    const promises = [
      client.shard.fetchClientValues('guilds.cache.size'),
      client.shard.broadcastEval((c) => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)),
    ];
    Promise.all(promises)
        .then((results) => {
          const serverCount = results[0].reduce((acc, guildCount) => acc + guildCount, 0);
          const totalUserCount = results[1].reduce((acc, memberCount) => acc + memberCount, 0);
          console.log(`正在 ${serverCount} 個伺服器上運作中\n正在服務 ${totalUserCount} 位使用者`);
          const reloadEmbed = new EmbedBuilder()
              .setColor(0xfff3a9)
              .setTitle('**【 ermiana 伺服器資訊】**')
              .setDescription(`正在 ${serverCount} 個伺服器上運作中\n正在服務 ${totalUserCount} 位使用者`)
              .setTimestamp();
          interaction.reply({ embeds: [reloadEmbed] });
        })
        .catch(console.error);
  } catch {}
}
