import { ActivityType } from 'discord.js';
import { CronJob } from 'cron';

export function runPresenceCron(client) {
  const presenceJob = new CronJob('00 30 23 * * *', function() {
    client.user.setPresence({ status: 'dnd' });
    console.log('Cronjob running...');
    client.user.setPresence({
      activities: [{ name: `${client.guilds.cache.size} 個伺服器的魔法詠唱`, type: ActivityType.Listening }],
      status: 'online',
    });
  }, null, true, 'Asia/Taipei');
  console.log('Presence Cronjob set ok!');
  presenceJob.start();
}
