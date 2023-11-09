import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import { currentTime } from './common/currentTime.js';
import { configManager } from './common/configManager.js';
import { runBahaCron } from './common/runBahaCron.js';
import { runPresenceCron } from './common/runPresenceCron.js';
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
  client.user.setPresence({ status: 'dnd' });
  currentTime();
  let totalUserCount = 0;
  client.guilds.cache.forEach( (guild) => {
    if (guild.memberCount > 100) {
      console.log(`${guild.memberCount} | ${guild.name}`);
    }
    totalUserCount += guild.memberCount;
  });
  console.log(`正在 ${client.guilds.cache.size} 個伺服器上運作中`);
  console.log(`正在服務 ${totalUserCount} 位使用者`);
  client.user.setPresence({
    activities: [{ name: `${client.guilds.cache.size} 個伺服器的魔法詠唱`, type: ActivityType.Listening }],
    status: 'online',
  });
  runPresenceCron(client);
});

client.on('messageCreate', async (message) => {
  regexs.forEach(({ regex, handler }) => {
    if (regex.test(message.content)) {
      const result = message.content.match(regex);
      handler(result, message);
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
                interaction.reply('成功刪除訊息。');
              })
              .catch(() => {
                interaction.reply('刪除訊息時發生錯誤。');
              });
        } else {
          interaction.reply('我沒有權限刪除這個訊息，請聯絡管理員，並給我**管理訊息**權限。');
        }
      } else {
        interaction.reply('我只能刪除由我自己發送的訊息喔。');
      }
    } catch {}
  }
});

const config = await configManager();
refreshContextMenus();
runBahaCron();
client.login(config.DCTK);
