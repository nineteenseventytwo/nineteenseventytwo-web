import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookbackDays, merge, fetchPrevious } from '../src/visitors.mjs';

test('lookback: the whole UTC days before today, oldest first, not today', () => {
  const days = lookbackDays(new Date('2026-10-24T02:30:00Z'), 3);
  assert.deepEqual(days, ['2026-10-21', '2026-10-22', '2026-10-23']);
  assert.deepEqual(lookbackDays(new Date('2026-03-01T00:00:00Z'), 2), ['2026-02-27', '2026-02-28']);
});

test('merge: fresh days overwrite, older days are kept, total is the sum', () => {
  const previous = { days: { '2026-10-01': 5, '2026-10-20': 3 } };
  const c = merge(previous, { '2026-10-20': 4, '2026-10-21': 2 }, new Date('2026-10-22T02:30:00Z'));
  assert.deepEqual(c.days, { '2026-10-01': 5, '2026-10-20': 4, '2026-10-21': 2 });
  assert.equal(c.total, 11);
  assert.equal(c.since, '2026-10-01');
  assert.equal(c.through, '2026-10-21');
});

test('merge: running it twice on the same data does not double count', () => {
  const fresh = { '2026-10-21': 2 };
  const once = merge(null, fresh);
  assert.equal(merge(once, fresh).total, once.total);
});

const res = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

test('previous: 404 is a first run; any other failure stops the run rather than resetting to zero', async () => {
  assert.equal(await fetchPrevious('u', async () => res(404)), null);
  await assert.rejects(fetchPrevious('u', async () => res(503)), /HTTP 503/);
  await assert.rejects(fetchPrevious('u', async () => res(200, { total: 9 })), /no days record/);
  assert.deepEqual((await fetchPrevious('u', async () => res(200, { days: { '2026-10-21': 2 } }))).days, { '2026-10-21': 2 });
});
