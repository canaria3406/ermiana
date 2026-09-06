import process from 'node:process';
import { config as loadEnv } from 'dotenv';
import {
  buildApplicationCommands,
  REMOVE_MESSAGE_COMMAND_NAME,
  REMOVE_MESSAGE_NAME_LOCALIZATIONS,
} from '../../src/discord/commands.js';
import { discordStartupChecks } from '../../src/services/discord-deployment.js';

const preflight = process.argv.includes('--preflight');
if (process.argv.slice(2).some((arg) => arg !== '--preflight')) throw new Error('Only --preflight is supported');

const envFile = process.env.DISCORD_ENV_FILE;
loadEnv(envFile ? { path: envFile, override: false, quiet: true } : { quiet: true });

const token = process.env.DISCORD_TOKEN;
const configuredClientId = process.env.DISCORD_CLIENT_ID;
if (!token) throw new Error('DISCORD_TOKEN is required (or set DISCORD_ENV_FILE)');

const apiBase = 'https://discord.com/api/v10';

async function discordGet(path) {
  const response = await fetch(`${apiBase}${path}`, {
    signal: AbortSignal.timeout(10000),
    headers: {
      authorization: `Bot ${token}`,
      'user-agent': 'DiscordBot (ermiana verification, 2.0)',
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`Discord API ${response.status} for ${path}`);
  return body;
}

const [bot, application, gateway] = await Promise.all([
  discordGet('/users/@me'),
  discordGet('/oauth2/applications/@me'),
  discordGet('/gateway/bot'),
]);
const commands = await discordGet(`/applications/${application.id}/commands?with_localizations=true`);

const flags = Number(application.flags ?? 0);
const messageContentApproved = (flags & (1 << 18)) !== 0;
const messageContentLimited = (flags & (1 << 19)) !== 0;
const expectedCommands = buildApplicationCommands();
const removeMessage = commands.find((command) => command.name === REMOVE_MESSAGE_COMMAND_NAME && command.type === 3);
const removeMessageLocalizationsValid = Boolean(removeMessage)
  && Object.entries(REMOVE_MESSAGE_NAME_LOCALIZATIONS)
    .every(([locale, name]) => removeMessage.name_localizations?.[locale] === name);
const globalCommandsMatchDefinition = commands.length === expectedCommands.length
  && expectedCommands.every((expected) => commands.some((command) => command.name === expected.name
    && command.type === expected.type
    && Object.entries(expected.name_localizations ?? {})
      .every(([locale, name]) => command.name_localizations?.[locale] === name)));
const startupChecks = discordStartupChecks({
  bot, application, gateway,
  clientId: configuredClientId,
  totalShards: process.env.DISCORD_TOTAL_SHARDS?.trim() || 'auto',
});

console.log(JSON.stringify({
  mode: preflight ? 'preflight' : 'full',
  startupChecks,
  authenticatedBot: Boolean(bot.bot),
  botVerified: (Number(bot.public_flags ?? 0) & (1 << 16)) !== 0,
  configuredClientIdMatches: configuredClientId ? configuredClientId === application.id : null,
  approximateGuildCount: application.approximate_guild_count ?? null,
  messageContentAccess: messageContentApproved ? 'approved' : messageContentLimited ? 'limited' : 'missing',
  gateway: {
    recommendedShards: gateway.shards,
    sessionStartsRemaining: gateway.session_start_limit?.remaining,
    sessionStartsTotal: gateway.session_start_limit?.total,
    resetAfterMs: gateway.session_start_limit?.reset_after,
    maxConcurrency: gateway.session_start_limit?.max_concurrency,
  },
  globalCommands: commands.map(({ name, type, name_localizations: nameLocalizations }) => ({
    name,
    type,
    nameLocalizations,
  })),
  removeMessageCommandValid: Boolean(removeMessage),
  removeMessageLocalizationsValid,
  globalCommandsMatchDefinition,
}, null, 2));

const failedChecks = {
  ...startupChecks,
  ...(!preflight ? {
    removeMessageCommandValid: Boolean(removeMessage),
    removeMessageLocalizationsValid,
    globalCommandsMatchDefinition,
  } : {}),
};
const failures = Object.entries(failedChecks).filter(([, passed]) => !passed).map(([name]) => name);
if (failures.length > 0) throw new Error(`Discord verification failed: ${failures.join(', ')}`);
