import { Client, GatewayIntentBits} from "discord.js";
import { currentTime } from "./common/currentTime.js";
import { configManager } from "./common/configManager.js";
import { runBahaCron } from './common/runBahaCron.js';
import { handleEhRegex } from "./regex/handleEhRegex.js";
import { handlePttRegex } from "./regex/handlePttRegex.js";
import { handleBahaRegex } from "./regex/handleBahaRegex.js";

const client = new Client({
    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
})

client.on('ready',() =>{
    console.log(`Ready! 以 ${client.user.tag} 身分登入`);
    currentTime();
})

const regexs = [
    { regex: /https:\/\/e(?:x|-)hentai\.org\/g\/([0-9]+)\/([0-9a-z]+)\//,
        handler: handleEhRegex },
    { regex: /https?:\/\/www\.ptt\.cc\/bbs\/((?:G|g)ossiping|AC_In)\/M\.([0-9]+)\.A\.([0-9A-Z]+)\.html/,
        handler: handlePttRegex },
    { regex: /https?:\/\/([a-z]+)\.gamer\.com\.tw([^>])*bsn=60076([^>])*/,
        handler: handleBahaRegex }
];
  
client.on("messageCreate", async (message) => {
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