import { configManager } from './configManager.js';
import { WebhookClient, EmbedBuilder } from 'discord.js';

export async function reloadLog(serverCount, totalUserCount) {
  try {
    const config = await configManager();
    const webhookLink = new WebhookClient({ url: config.DCWH });
    const reloadEmbed = new EmbedBuilder()
        .setColor(0xfff3a9)
        .setTitle('**【 ermiana 已重新啟動】**')
        .setDescription(`正在 ${serverCount} 個伺服器上運作中\n正在服務 ${totalUserCount} 位使用者`)
        .setTimestamp();

    await webhookLink.send({
      username: 'ermiana',
      avatarURL: 'https://cdn.discordapp.com/avatars/1078919650764652594/45d5f492295af445b65299dd6fb806b1.png',
      embeds: [reloadEmbed],
    });
  } catch (error) {
    console.log('reloadLog error');
  }
}

export async function guildLog(guild) {
  try {
    const config = await configManager();
    const webhookLink = new WebhookClient({ url: config.DCWH });
    const guildOwner = await guild.fetchOwner();
    const guildIcon = guild.iconURL();

    const guildCreateEmbed = new EmbedBuilder()
        .setColor(0xfff3a9)
        .setTitle('**【 ermiana 被新增至伺服器】**')
        .setDescription(`伺服器名稱：${guild.name}  (${guild.id})\n伺服器管理員：${guildOwner.displayName}  (@${guildOwner.user.username})\n伺服器總人數：${guild.memberCount}`)
        .setThumbnail(guildIcon)
        .setTimestamp();

    await webhookLink.send({
      username: 'ermiana',
      avatarURL: 'https://cdn.discordapp.com/avatars/1078919650764652594/45d5f492295af445b65299dd6fb806b1.png',
      embeds: [guildCreateEmbed],
    });
  } catch (error) {
    console.log('guildLog error');
  }
}
