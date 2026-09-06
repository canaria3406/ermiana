if (!process.send) throw new Error('ready-shard fixture requires an IPC channel');

process.send({ _ready: true });
process.on('message', (message) => {
  if (message === 'shutdown') process.exit(0);
});
setInterval(() => {}, 1000);
