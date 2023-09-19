import { ActivityType} from "discord.js";
import { CronJob } from "cron";

export function runPresenceCron(client) {
    const job2 = new CronJob("00 40 4 * * 2,5", function() {
        client.user.setPresence({ status: 'dnd' });
        console.log("Cronjob running...");
        client.user.setPresence({
            activities: [{ name: `${client.guilds.cache.size} 個伺服器的魔法詠唱`, type: ActivityType.Listening }],
            status: 'online',
        });
    }, null, true, "Asia/Taipei");
    console.log("Presence Cronjob set ok!");
    job2.start();
}