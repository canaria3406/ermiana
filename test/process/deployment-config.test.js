import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

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
  assert.deepEqual(app.stop_exit_codes, [78]);
  assert.equal(app.cron_restart, '0 0 * * *');
  assert.equal(app.listen_timeout, 240000);
});
