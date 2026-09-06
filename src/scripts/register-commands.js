import {
  REST,
  Routes,
} from 'discord.js';
import { loadConfig } from '../config.js';
import { buildApplicationCommands } from '../discord/commands.js';
import { createLogger } from '../core/logger.js';

const config = loadConfig();
if (!config.discord.clientId) throw new Error('DISCORD_CLIENT_ID is required to register commands');
const logger = createLogger(config.logLevel, { process: 'command-registration' });
const commands = buildApplicationCommands();

const rest = new REST({ version: '10' }).setToken(config.discord.token);
await rest.put(Routes.applicationCommands(config.discord.clientId), { body: commands });
logger.info({ count: commands.length }, 'global application commands replaced');
