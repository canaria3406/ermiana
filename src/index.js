import { ShardingManager } from 'discord.js';
import { configManager } from './utils/configManager.js';

const config = await configManager();
const manager = new ShardingManager('./src/bot.js', {
  token: config.DCTK,
  totalShards: 'auto',
});

manager.on('shardCreate', (shard) => console.log(`Launched shard ${shard.id}`));
manager.spawn();
