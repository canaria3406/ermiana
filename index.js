import { Client, GatewayIntentBits} from "discord.js";
import { currentTime } from "./common/currentTime.js";
import { configManager } from "./common/configManager.js";
import { runBahaCron } from "./common/runBahaCron.js";
import { regexs } from "./regex/regexManager.js";

const client = new Client({
    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
})

client.on("ready",() =>{
    console.log(`Ready! 以 ${client.user.tag} 身分登入`);
    currentTime();
    console.log(`在 ${client.guilds.cache.size} 個伺服器上運作中`);
    client.user.setActivity(`運作於 ${client.guilds.cache.size} 個伺服器上`);
});
  
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