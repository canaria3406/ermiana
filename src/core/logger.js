import pino from 'pino';

export function createLogger(level = 'info', bindings = {}, destination = process.stderr) {
  return pino({
    level,
    base: {
      service: 'ermiana',
      ...bindings,
    },
    redact: {
      paths: [
        'token', '*.token',
        'authorization', '*.authorization',
        'password', '*.password',
        'webhookUrl', '*.webhookUrl',
      ],
      censor: '[redacted]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }, destination);
}

export async function flushLogger(logger) {
  await new Promise((resolve, reject) => {
    logger.flush((error) => error ? reject(error) : resolve());
  });
}
