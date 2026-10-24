import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choosePicks } from '../../public/js/picks.js';

const flat = (groups) => groups.flatMap((g) => g.events);
const ev = (venue, score, date, reasons = ['saxophone']) => ({ venue, score, date, reasons, title: `${venue} ${date}` });

test('at most 2 per venue; the overflow becomes noteworthy, in date order', () => {
  const events = [
    ev('Vortex', 3, '2026-10-21'), ev('Vortex', 3, '2026-10-22'), ev('Vortex', 3, '2026-10-23'),
    ev('Vortex', 2, '2026-10-20'), ev('Oslo', 2, '2026-10-25'), ev('EartH', 0, '2026-10-26'),
  ];
  const { picks, noteworthy } = choosePicks(events);
  assert.deepEqual(picks.map((e) => e.title), ['Vortex 2026-10-21', 'Vortex 2026-10-22', 'Oslo 2026-10-25']);
  assert.deepEqual(flat(noteworthy).map((e) => e.title), ['Vortex 2026-10-20', 'Vortex 2026-10-23']);
  // unscored gigs are neither
  assert.ok(![...picks, ...flat(noteworthy)].some((e) => e.venue === 'EartH'));
});

test('never more than 10 picks', () => {
  const events = Array.from({ length: 30 }, (_, i) => ev(`Venue ${i}`, 3, `2026-11-${String((i % 28) + 1).padStart(2, '0')}`));
  const { picks, noteworthy } = choosePicks(events);
  assert.equal(picks.length, 10);
  assert.equal(flat(noteworthy).length, 20);
});

test('favourites lead and sit outside the per-venue cap', () => {
  const events = [
    ev('EartH', 3, '2026-10-21'), ev('EartH', 3, '2026-10-22'), ev('EartH', 3, '2026-10-23'),
    ev('EartH', 10, '2026-11-01', ['favourite: Anamanaguchi']),
    ev('EartH', 10, '2026-11-02', ['favourite: The Darkness']),
  ];
  const { picks, noteworthy } = choosePicks(events);
  // both favourites, then EartH's two best others; the third other overflows
  assert.deepEqual(picks.map((e) => e.date), ['2026-11-01', '2026-11-02', '2026-10-21', '2026-10-22']);
  assert.deepEqual(flat(noteworthy).map((e) => e.date), ['2026-10-23']);
});

test('DJ nights never make Picks, however well they score - they go to Noteworthy', () => {
  const events = [
    { ...ev('Shacklewell', 10, '2026-10-31', ['favourite: Boy Harsher']), format: 'dj' },
    { ...ev('Paper Dress', 3, '2026-11-13', ['hardcore & punk']), format: 'dj' },
    { ...ev('EartH', 2, '2026-11-13', ['hardcore & punk']), format: 'band' },
    ev('Oslo', 1, '2026-11-01'), // no format (older events.json): a band
  ];
  const { picks, noteworthy } = choosePicks(events);
  assert.deepEqual(picks.map((e) => e.venue), ['EartH', 'Oslo']);
  // grouped by venue, venues A-Z
  assert.deepEqual(noteworthy.map((g) => g.venue), ['Paper Dress', 'Shacklewell']);
});

test('Noteworthy: grouped by venue, at most 5 each (the best), the rest counted', () => {
  // Vortex: 2 picks, then 7 overflow scoring 1..7; Oslo: 2 picks, 1 overflow
  const events = [
    ev('Vortex', 9, '2026-11-01'), ev('Vortex', 9, '2026-11-02'),
    ...[1, 2, 3, 4, 5, 6, 7].map((s) => ev('Vortex', s, `2026-12-0${s}`)),
    ev('Oslo', 9, '2026-11-03'), ev('Oslo', 9, '2026-11-04'), ev('Oslo', 1, '2026-11-20'),
  ];
  const { noteworthy } = choosePicks(events);
  assert.deepEqual(noteworthy.map((g) => g.venue), ['Oslo', 'Vortex']);
  const vortex = noteworthy[1];
  // the five best (scores 7..3), shown in date order; the two weakest counted
  assert.deepEqual(vortex.events.map((e) => e.date), ['2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06', '2026-12-07']);
  assert.equal(vortex.more, 2);
  assert.equal(noteworthy[0].more, 0);
});
