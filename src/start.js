import 'dotenv/config';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const managerPath = path.join(projectRoot, 'src', 'index.js');

const child = spawn(process.execPath, [managerPath], {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', (error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
});

let forwardedSignals = 0;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    forwardedSignals += 1;
    if (child.exitCode !== null) return;
    child.kill(forwardedSignals === 1 ? signal : 'SIGKILL');
  });
}

const { code } = await new Promise((resolve) => {
  child.once('close', (exitCode) => resolve({ code: exitCode }));
});
process.exitCode = Number.isInteger(code) ? code : 1;
