import assert from 'node:assert/strict';
import test from 'node:test';
import { createEventDrain } from '../../../src/core/event-drain.js';

test('stops accepting events and waits for active handlers before shutdown', async () => {
  let release;
  const handlerStarted = Promise.withResolvers();
  const handlerRelease = new Promise((resolve) => { release = resolve; });
  const handled = [];
  const drain = createEventDrain();
  const handler = drain.track('messageCreate', async (value) => {
    handled.push(value);
    handlerStarted.resolve();
    await handlerRelease;
  });

  const active = handler('active');
  await handlerStarted.promise;
  const stopping = drain.stopAndDrain(1000);
  assert.equal(handler('late'), undefined);
  release();

  assert.deepEqual(await stopping, { drained: true, pending: 0 });
  await active;
  assert.deepEqual(handled, ['active']);
});

test('reports handlers that exceed the shutdown drain deadline', async () => {
  const drain = createEventDrain();
  drain.track('messageCreate', () => new Promise(() => {}))();

  assert.deepEqual(await drain.stopAndDrain(1), { drained: false, pending: 1 });
});

test('reports rejected event handlers without leaking an unhandled rejection', async () => {
  const failures = [];
  const drain = createEventDrain({
    onError: (error, event) => failures.push({ error, event }),
  });
  const failure = new Error('handler failed');

  await assert.rejects(drain.track('interactionCreate', async () => { throw failure; })(), failure);
  assert.deepEqual(failures, [{ error: failure, event: 'interactionCreate' }]);
});
