import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { loadConfig } from '../../src/config.js';

const require = createRequire(import.meta.url);

test('PM2 runs exactly one ready-aware shard manager', () => {
  const ecosystem = require('../../ecosystem.config.cjs');
  const app = ecosystem.apps[0];
  assert.equal(app.script, './src/index.js');
  assert.equal(app.exec_mode, 'fork');
  assert.equal(app.instances, 1);
  assert.equal(app.watch, false);
  assert.equal(app.wait_ready, true);
  assert.equal(app.shutdown_with_message, true);
  assert.equal(app.autorestart, true);
  assert.equal(app.cron_restart, '0 0 * * *');
  assert.equal(app.out_file, '/dev/null');
  assert.equal(app.error_file, '/dev/null');
  assert.equal(app.vizion, false);
  assert.equal(app.listen_timeout, 240000);
  assert.equal(app.listen_timeout, loadConfig({ DISCORD_TOKEN: 'x' }).runtime.readyTimeoutMs);

  const managerSource = readFileSync(new URL('../../src/index.js', import.meta.url), 'utf8');
  assert.match(managerSource, /respawn:\s*true/);
  assert.match(managerSource, /logger\.error\(details, 'shard exited unexpectedly/);
  assert.ok(managerSource.indexOf('new GuildSettingsStore') < managerSource.indexOf('connectRedis(config.redis'));
  assert.ok(managerSource.indexOf('guildSettings.initialize()') < managerSource.indexOf('manager.spawn'));

  const loggerSource = readFileSync(new URL('../../src/core/logger.js', import.meta.url), 'utf8');
  assert.match(loggerSource, /process\.stderr/);

  const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.equal(packageJson.scripts.start, 'node index.js');
  assert.equal(packageJson.scripts['discord:register'], 'node src/scripts/register-commands.js');
  assert.equal(packageJson.scripts['deploy:verify'], 'node test/discord-live/verify.js --preflight');
  assert.equal(packageJson.scripts['test:verify-discord'], 'node test/discord-live/verify.js');
  assert.equal(packageJson.scripts['test:smoke-discord'], 'node test/discord-live/smoke.js');
  assert.equal(packageJson.scripts['test:smoke-webhook'], 'node test/discord-live/webhook.js');
  assert.equal(packageJson.scripts['pm2:start'], 'pm2 start ecosystem.config.cjs');
  assert.equal(packageJson.scripts['pm2:stop'], 'pm2 stop ecosystem.config.cjs');
  assert.equal(packageJson.scripts['pm2:status'], 'pm2 status');
  const gitignore = readFileSync(new URL('../../.gitignore', import.meta.url), 'utf8');
  assert.match(gitignore, /^\.env$/m);
  const startSource = readFileSync(new URL('../../src/start.js', import.meta.url), 'utf8');
  assert.match(startSource, /index\.js/);

  const shardSource = readFileSync(new URL('../../src/bot.js', import.meta.url), 'utf8');
  assert.match(shardSource, /process\.on\('disconnect'/);

  assert.match(managerSource, /configureHttp\(\)/);
  assert.match(shardSource, /configureHttp\(\)/);
});

test('every test file is reachable by one of the configured runner globs', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  const offlineGlobs = '"test/unit/**/*.test.js" "test/process/**/*.test.js"';
  assert.equal(packageJson.scripts.test, `node --test ${offlineGlobs}`);
  assert.equal(packageJson.scripts['test:coverage'], `node --experimental-test-coverage --test ${offlineGlobs}`);
  assert.equal(packageJson.scripts['test:redis'], 'node --test "test/redis/**/*.test.js"');
  assert.equal(packageJson.scripts.check, 'npm run lint && npm run test:coverage && npm run test:redis');

  const testRoot = new URL('../../test/', import.meta.url);
  const reachable = ['unit/', 'process/', 'redis/'];
  const orphans = [];
  const walk = (relative) => {
    for (const entry of readdirSync(new URL(relative, testRoot), { withFileTypes: true })) {
      const next = `${relative}${entry.name}${entry.isDirectory() ? '/' : ''}`;
      if (entry.isDirectory()) walk(next);
      else if (next.endsWith('.test.js') && !reachable.some((prefix) => next.startsWith(prefix))) orphans.push(next);
    }
  };
  walk('');
  assert.deepEqual(orphans, []);
});
