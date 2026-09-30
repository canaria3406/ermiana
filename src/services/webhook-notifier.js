import { EmbedBuilder, WebhookClient } from 'discord.js';

export const GUILD_JOIN_WEBHOOK_IPC_TYPE = 'ermiana:webhook:guild-join';

const EMBED_COLOR = 0xfff3a9;
const WEBHOOK_USERNAME = 'ermiana';

function normalizedCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function webhookPayload(embed, avatarURL) {
  return {
    username: WEBHOOK_USERNAME,
    ...(avatarURL ? { avatarURL } : {}),
    embeds: [embed],
    allowedMentions: { parse: [] },
  };
}

export function createRestartWebhookPayload({ guildCount, memberCount, botAvatarUrl, timestamp = new Date() }) {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle('**【 ermiana 已重新啟動】**')
    .setDescription(
      `正在 ${normalizedCount(guildCount)} 個伺服器上運作中\n正在服務 ${normalizedCount(memberCount)} 位使用者`,
    )
    .setTimestamp(timestamp);
  return webhookPayload(embed, botAvatarUrl);
}

export function createGuildJoinWebhookPayload(guild, { timestamp = new Date() } = {}) {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle('**【 ermiana 被新增至伺服器】**')
    .setDescription(
      `伺服器名稱：${guild.name}  (${guild.id})\n`
      + `伺服器總人數：${normalizedCount(guild.memberCount)}`,
    )
    .setTimestamp(timestamp);
  if (guild.iconUrl) embed.setThumbnail(guild.iconUrl);
  return webhookPayload(embed, guild.botAvatarUrl);
}

export async function collectDiscordStats(manager) {
  const perShard = await manager.broadcastEval((client) => ({
    guildCount: client.guilds.cache.size,
    memberCount: client.guilds.cache.reduce((sum, guild) => sum + guild.memberCount, 0),
    botAvatarUrl: client.user?.displayAvatarURL() ?? null,
  }));
  return perShard.reduce((total, shard) => ({
    guildCount: total.guildCount + normalizedCount(shard.guildCount),
    memberCount: total.memberCount + normalizedCount(shard.memberCount),
    botAvatarUrl: total.botAvatarUrl ?? shard.botAvatarUrl ?? null,
  }), { guildCount: 0, memberCount: 0, botAvatarUrl: null });
}

export function isGuildJoinWebhookMessage(message) {
  return message?.type === GUILD_JOIN_WEBHOOK_IPC_TYPE
    && typeof message.guild?.id === 'string'
    && typeof message.guild?.name === 'string'
    && Number.isSafeInteger(message.guild.memberCount)
    && message.guild.memberCount >= 0;
}

export function webhookErrorDetails(error) {
  return {
    name: error?.name ?? 'Error',
    message: String(error?.message ?? error).replace(
      /https:\/\/(?:ptb\.|canary\.)?discord\.com\/api(?:\/v\d{1,2})?\/webhooks\/\d+\/[\w-]+/gi,
      '[redacted Discord webhook URL]',
    ),
    ...(error?.code !== undefined ? { code: error.code } : {}),
    ...(error?.status !== undefined ? { status: error.status } : {}),
  };
}

export class DiscordWebhookNotifier {
  constructor({ url, webhookClient } = {}) {
    this.webhookClient = webhookClient ?? (url ? new WebhookClient({ url }, {
      allowedMentions: { parse: [] },
    }) : null);
    this.ownsClient = !webhookClient && Boolean(this.webhookClient);
  }

  get enabled() {
    return Boolean(this.webhookClient);
  }

  async notifyRestart(stats) {
    if (!this.webhookClient) return null;
    return this.webhookClient.send(createRestartWebhookPayload(stats));
  }

  async notifyGuildJoin(guild) {
    if (!this.webhookClient) return null;
    return this.webhookClient.send(createGuildJoinWebhookPayload(guild));
  }

  close() {
    if (this.ownsClient) this.webhookClient.destroy();
  }
}
