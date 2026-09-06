'use strict';

require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'ermiana',
      script: './src/index.js',
      cwd: __dirname,
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      wait_ready: true,
      listen_timeout: 240000,
      kill_timeout: 30000,
      shutdown_with_message: true,
      exp_backoff_restart_delay: 100,
      vizion: false,
      out_file: '/dev/null',
      error_file: '/dev/null',
    },
  ],
};
