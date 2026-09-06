import assert from 'node:assert/strict';
import test from 'node:test';
import { createLogger } from '../../../src/core/logger.js';

function captureLogger(level) {
  const lines = [];
  const destination = { write(chunk) { lines.push(String(chunk)); } };
  return { logger: createLogger(level, { process: 'test' }, destination), lines };
}

test('production logger emits only error and fatal records', () => {
  const { logger, lines } = captureLogger('error');
  logger.trace('trace');
  logger.debug('debug');
  logger.info('info');
  logger.warn('warn');
  logger.error({ token: 'secret' }, 'error');
  logger.fatal('fatal');

  assert.equal(lines.length, 2);
  const records = lines.map((line) => JSON.parse(line));
  assert.deepEqual(records.map(({ level }) => level), [50, 60]);
  assert.deepEqual(records.map(({ msg }) => msg), ['error', 'fatal']);
  assert.equal(records[0].token, '[redacted]');
});

test('development trace logger emits every configured log level', () => {
  const { logger, lines } = captureLogger('trace');
  logger.trace('trace');
  logger.debug('debug');
  logger.info('info');
  logger.warn('warn');
  logger.error('error');
  logger.fatal('fatal');

  assert.deepEqual(lines.map((line) => JSON.parse(line).msg), [
    'trace', 'debug', 'info', 'warn', 'error', 'fatal',
  ]);
});
