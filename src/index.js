import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import { currentTime } from './common/currentTime.js';
import { configManager } from './common/configManager.js';
import { runBahaCron } from './common/runBahaCron.js';
import { runPresenceCron } from './common/runPresenceCron.js';
import { regexs } from './regex/regexManager.js';

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

runBahaCron();
const config = await configManager();
client.login(config.DCTK);
