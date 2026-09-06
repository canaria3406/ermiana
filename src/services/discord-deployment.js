export function discordStartupChecks({ bot, application, gateway, clientId, totalShards = 'auto' }) {
  const flags = Number(application.flags ?? 0);
  const shardCount = totalShards === 'auto' ? gateway.shards : Number(totalShards);
  const validShardCount = Number.isSafeInteger(shardCount) && shardCount > 0;
  return {
    authenticatedBot: bot.bot === true,
    configuredClientIdMatches: Boolean(clientId) && clientId === application.id,
    messageContentAccess: (flags & ((1 << 18) | (1 << 19))) !== 0,
    validShardCount,
    sessionStartsAvailable: validShardCount
      && Number.isSafeInteger(gateway.session_start_limit?.remaining)
      && gateway.session_start_limit.remaining >= shardCount,
  };
}
