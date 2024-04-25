import { PermissionsBitField, Client, GatewayIntentBits } from 'discord.js';
import { currentTime } from './utils/currentTime.js';
import { configManager } from './utils/configManager.js';
import { runBahaCron } from './utils/runBahaCron.js';
import { refreshContextMenus } from './utils/refreshContextMenus.js';
import { commands } from './command/commandManager.js';
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
  currentTime();
  client.guilds.cache
      .filter((guild) => guild.memberCount > 500)
      .forEach((guild) => console.log(`${guild.memberCount} | ${guild.name}`));
  console.log(`正在 ${client.guilds.cache.size} 個伺服器上運作中`);
  const totalUserCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  console.log(`正在服務 ${totalUserCount} 位使用者`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  regexs.forEach(({ regex, handler }) => {
    if (regex.test(message.content)) {
      if (message.channel.permissionsFor(message.client.user).has(PermissionsBitField.Flags.SendMessages) &&
          message.channel.permissionsFor(message.client.user).has(PermissionsBitField.Flags.EmbedLinks)) {
        const result = message.content.match(regex);
        if (!(/\|\|[\s\S]*http[\s\S]*\|\|/).test(message.content) &&
            !(/\<[\s\S]*http[\s\S]*\>/).test(message.content)) {
          handler(result, message);
        }
      }
    }
  });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isMessageContextMenuCommand() && !interaction.isButton()) return;
  if (interaction.isMessageContextMenuCommand()) {
    commands.forEach(({ commandNames, handler }) => {
      if (interaction.commandName === commandNames) {
        handler(interaction);
      }
    });
  } else if (interaction.isButton()) {
    commands.forEach(({ commandNames, handler }) => {
      if (interaction.customId === commandNames) {
        handler(interaction);
      }
    });
  }
});

const config = await configManager();
refreshContextMenus();
runBahaCron();
client.login(config.DCTK);
