import { Client, GatewayIntentBits } from 'discord.js';
import { currentTime } from './common/currentTime.js';
import { configManager } from './common/configManager.js';
import { runBahaCron } from './common/runBahaCron.js';
import { regexs } from './regex/regexManager.js';
import { refreshContextMenus } from './common/refreshContextMenus.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on('ready', () =>{
  console.log(`Ready! 以 ${client.user.tag} 身分登入`);
  currentTime();
  client.guilds.cache
      .filter((guild) => guild.memberCount > 100)
      .forEach((guild) => console.log(`${guild.memberCount} | ${guild.name}`));
  console.log(`正在 ${client.guilds.cache.size} 個伺服器上運作中`);
  const totalUserCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  console.log(`正在服務 ${totalUserCount} 位使用者`);
});

client.on('messageCreate', async (message) => {
  regexs.forEach(({ regex, handler }) => {
    if (regex.test(message.content)) {
      const result = message.content.match(regex);
      if (!(/\|\|[\s\S]*http[\s\S]*\|\|/).test(message.content) && !(/\<[\s\S]*http[\s\S]*\>/).test(message.content)) {
        handler(result, message);
      }
    }
  });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isMessageContextMenuCommand()) return;

  if (interaction.commandName === '刪除訊息') {
    const targetMessage = interaction.targetMessage;
    try {
      if (targetMessage.author.id === config.DCID) {
        if (targetMessage.deletable) {
          targetMessage.delete()
              .then(() => {
                interaction.reply( { content: '成功刪除訊息。' });
              })
              .catch(() => {
                interaction.reply( { content: '刪除訊息時發生錯誤。', ephemeral: true });
              });
        } else {
          interaction.reply( { content: '我沒有權限刪除這個訊息，請聯絡管理員，並給我**管理訊息**權限。', ephemeral: true });
        }
      } else {
        interaction.reply( { content: '我只能刪除由我自己發送的訊息喔。', ephemeral: true });
      }
    } catch {}
  }
});

const config = await configManager();
refreshContextMenus();
runBahaCron();
client.login(config.DCTK);
