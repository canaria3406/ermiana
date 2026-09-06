import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ShardingManager } from 'discord.js';

test('ShardingManager respawns only the child shard that exits', async (t) => {
  const manager = new ShardingManager(fileURLToPath(new URL('../fixtures/ready-shard.js', import.meta.url)), {
    token: 'fixture-token',
    totalShards: 1,
    respawn: true,
    mode: 'process',
    silent: true,
  });
  t.after(() => {
    manager.respawn = false;
    const shard = manager.shards.get(0);
    if (shard?.process || shard?.worker) shard.kill();
  });

  await manager.spawn({ amount: 1, delay: 0, timeout: 5000 });
  const shard = manager.shards.get(0);
  const originalPid = shard.process.pid;
  let died = false;
  shard.once('death', () => { died = true; });
  const readyAgain = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('respawned shard did not become ready')), 5000);
    shard.on('error', reject);
    shard.on('ready', () => {
      if (!died) return;
      clearTimeout(timer);
      resolve();
    });
  });

  shard.process.kill('SIGKILL');
  await readyAgain;
  assert.equal(manager.shards.get(0), shard);
  assert.notEqual(shard.process.pid, originalPid);
  assert.equal(shard.ready, true);
});
