import { PermissionsBitField, Client, GatewayIntentBits, ActivityType } from 'discord.js';
import { currentTime } from './utils/currentTime.js';
import { configManager } from './utils/configManager.js';
import { runCronJob } from './utils/runCronJob.js';
import { reloadLog, guildLog } from './utils/botLog.js';
import { msgCommandsMap, btnCommandsMap } from './command/commandManager.js';
import { regexsMap, matchRules } from './regex/regexManager.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on('ready', async () => {
  console.log(`Ready! 以 ${client.user.tag} 身分登入`);
  currentTime();
  try {
    await client.shard.broadcastEval((c) => c.readyAt !== null);
    const promises = [
      client.shard.fetchClientValues('guilds.cache.size'),
      client.shard.broadcastEval((c) => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)),
    ];
    Promise.all(promises)
        .then((results) => {
          const serverCount = results[0].reduce((acc, guildCount) => acc + guildCount, 0);
          const totalUserCount = results[1].reduce((acc, memberCount) => acc + memberCount, 0);
          console.log(`正在 ${serverCount} 個伺服器上運作中`);
          console.log(`正在服務 ${totalUserCount} 位使用者`);
          reloadLog(serverCount, totalUserCount);
        })
        .catch(console.error);

    client.user.setPresence({
      activities: [{
        name: '今この瞬間を大切に',
        type: ActivityType.Custom,
      }],
      status: 'online',
    });
  } catch {
    return;
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (/http/.test(message.content)) {
    for (const [regex, handler] of regexsMap) {
      if (regex.test(message.content)) {
        if (message.channel.permissionsFor(client.user).has([
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.EmbedLinks,
        ]) && !matchRules(message.content)) {
          const result = message.content.match(regex);
          const spoiler = (/\|\|[\s\S]*http[\s\S]*\|\|/).test(message.content) ? `||${result[0]}||` : '';
          await handler(result, message, spoiler);
          break;
        } else {
          break;
        }
      }
    }
  }
});

client.on('guildCreate', async (guild) => {
  guildLog(guild);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isMessageContextMenuCommand() && !interaction.isButton()) return;
  if (interaction.isMessageContextMenuCommand()) {
    for (const [commandNames, handler] of msgCommandsMap) {
      if (interaction.commandName === commandNames) {
        await handler(interaction);
        break;
      }
    }
  } else if (interaction.isButton()) {
    for (const [commandNames, handler] of btnCommandsMap) {
      if (interaction.customId === commandNames) {
        await handler(interaction);
        break;
      }
    }
  } else {
    return;
  }
});

const config = await configManager();
runCronJob();
client.login(config.DCTK);
