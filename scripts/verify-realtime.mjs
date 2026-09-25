import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as wait } from 'node:timers/promises';
import { openEventStream } from '../lib/sse-client.ts';
import { reconcileOrders } from '../lib/order-reconciliation.ts';
import { canOptimizeImage } from '../lib/image-policy.ts';

const response = (chunks) => new Response(new ReadableStream({
  start(controller) {
    for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
    controller.close();
  },
}), { headers: { 'content-type': 'text/event-stream' } });

test('split CRLF frames, reconnect resync, and stop on revoked access', async () => {
  const events = [];
  let connections = 0;
  let revoked;
  const done = new Promise(resolve => { revoked = resolve; });
  const stop = openEventStream(async () => {
    if (++connections === 1) return response(['id: one\r', '\nevent: order.created\r\ndata: {"version":1}\r', '\n\r', '\n']);
    if (connections === 2) return response(['event: heartbeat\ndata: {}\n\n']);
    return new Response(null, { status: 403 });
  }, event => {
    events.push(event);
    if (event.type === 'unavailable') revoked();
  });
  try {
    await Promise.race([done, wait(5_000, null, { ref: false }).then(() => { throw new Error('Reconnect timed out'); })]);
    assert.equal(connections, 3);
    assert.equal(events.filter(event => event.type === 'connected').length, 2);
    assert.deepEqual(events.find(event => event.id === 'one'), { id: 'one', type: 'order.created', data: { version: 1 } });
    await wait(50);
    assert.equal(connections, 3);
  } finally { stop(); }
});

test('unmount aborts the current connection without reconnecting', async () => {
  let connectionSignal;
  let connections = 0;
  let ready;
  const connected = new Promise(resolve => { ready = resolve; });
  const stop = openEventStream(async signal => {
    ++connections;
    connectionSignal = signal;
    return new Response(new ReadableStream({
      start(controller) {
        signal.addEventListener('abort', () => controller.close(), { once: true });
      },
    }), { headers: { 'content-type': 'text/event-stream' } });
  }, () => ready());
  await connected;
  stop();
  await wait(0);
  assert.equal(connectionSignal.aborted, true);
  await wait(1_100);
  assert.equal(connections, 1);
});

test('authoritative live refresh removes remotely delivered orders and preserves loaded history', () => {
  const previous = [
    { id: 'old-live', status: 'ready' },
    { id: 'older-history', status: 'delivered' },
    { id: 'local-change', status: 'preparing' },
  ];
  const result = reconcileOrders(previous, [{ id: 'new', status: 'pending' }], new Set(['local-change']));
  assert.deepEqual(result.map(order => order.id), ['new', 'older-history', 'local-change']);
  assert.equal(reconcileOrders([{ id: 'o', status: 'ready' }], [{ id: 'o', status: 'pending' }], new Set())[0].status, 'ready');
});

test('only trusted image origins go through the server optimizer', () => {
  assert.equal(canOptimizeImage('https://dinehub-backend-42eq.onrender.com/uploads/image.png'), true);
  assert.equal(canOptimizeImage('https://dinehub-backend-42eq.onrender.com/api/private'), false);
  assert.equal(canOptimizeImage('https://images.example.test/existing-menu.png'), false);
  assert.equal(canOptimizeImage('https://dinehub-backend-42eq.onrender.com.evil.test/uploads/image.png'), false);
  assert.equal(canOptimizeImage('blob:preview'), false);
  assert.equal(canOptimizeImage('/images/local.png'), true);
});
