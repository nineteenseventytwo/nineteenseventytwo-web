import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferYear, parseDayMonth, parseTime, toLondon, shiftDays } from '../src/dates.mjs';

test('inferYear: upcoming dates this year, a passed-by-a-month date is next year', () => {
  assert.equal(inferYear(10, 22, '2026-10-21'), 2026);
  assert.equal(inferYear(1, 9, '2026-12-20'), 2027);
  assert.equal(inferYear(10, 1, '2026-10-21'), 2026); // three weeks ago: still this year
});

test('parseDayMonth handles the listing formats', () => {
  assert.equal(parseDayMonth('Thu 22 Oct', '2026-10-21'), '2026-10-22');
  assert.equal(parseDayMonth('24th October, 8:15PM', '2026-10-21'), '2026-10-24');
  assert.equal(parseDayMonth('3 January 2027', '2026-10-21'), '2027-01-03');
  assert.equal(parseDayMonth('Licensed till 3am', '2026-10-21'), null);
});

test('parseTime', () => {
  assert.equal(parseTime('8:15PM'), '20:15');
  assert.equal(parseTime(' 19:00 - 22:30 '), '19:00');
  assert.equal(parseTime('12am'), '00:00');
  assert.equal(parseTime('7.30pm'), '19:30');
  assert.equal(parseTime('Room 2'), null);
});

test('toLondon applies BST and GMT', () => {
  assert.deepEqual(toLondon('2026-10-21T18:00:00Z'), { date: '2026-10-21', time: '19:00' });
  assert.deepEqual(toLondon('2026-12-01T23:30:00Z'), { date: '2026-12-01', time: '23:30' });
  assert.deepEqual(toLondon('2026-10-23T19:00:00+01:00'), { date: '2026-10-23', time: '19:00' });
});

test('shiftDays crosses months', () => {
  assert.equal(shiftDays('2026-10-30', 3), '2026-11-02');
});
