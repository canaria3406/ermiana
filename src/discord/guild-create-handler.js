import { GUILD_JOIN_WEBHOOK_IPC_TYPE } from '../services/webhook-notifier.js';

async function resolveOwner(guild, logger) {
  const cachedOwner = guild.members.cache.get(guild.ownerId);
  if (cachedOwner) return cachedOwner;
  try {
    return await guild.fetchOwner();
  } catch (error) {
    logger?.warn?.({ guildId: guild.id, ownerId: guild.ownerId, err: error }, 'could not fetch new guild owner');
    return null;
  }
}

export function createGuildCreateHandler({ logger, send = process.send?.bind(process) } = {}) {
  return async function handleGuildCreate(guild) {
    logger?.info?.({
      guildId: guild.id,
      guilds: guild.client.guilds.cache.size,
      memberCount: guild.memberCount,
    }, 'joined guild');

    const owner = await resolveOwner(guild, logger);
    const message = {
      type: GUILD_JOIN_WEBHOOK_IPC_TYPE,
      guild: {
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        ownerId: guild.ownerId,
        ownerDisplayName: owner?.displayName ?? null,
        ownerUsername: owner?.user?.username ?? null,
        iconUrl: guild.iconURL({ extension: 'png', size: 128 }),
        botAvatarUrl: guild.client.user?.displayAvatarURL({ extension: 'png', size: 128 }) ?? null,
        shardId: guild.shardId,
      },
    };

    if (!send) {
      logger?.warn?.({ guildId: guild.id }, 'manager IPC unavailable; guild webhook notification skipped');
      return false;
    }
    try {
      await Promise.resolve(send(message));
      return true;
    } catch (error) {
      logger?.warn?.({ guildId: guild.id, err: error }, 'could not queue guild webhook notification');
      return false;
    }
  };
}
