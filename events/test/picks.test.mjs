import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choosePicks } from '../../public/js/picks.js';

const ev = (venue, score, date, reasons = ['saxophone']) => ({ venue, score, date, reasons, title: `${venue} ${date}` });

test('at most 2 per venue; the overflow becomes noteworthy, in date order', () => {
  const events = [
    ev('Vortex', 3, '2026-10-21'), ev('Vortex', 3, '2026-10-22'), ev('Vortex', 3, '2026-10-23'),
    ev('Vortex', 2, '2026-10-20'), ev('Oslo', 2, '2026-10-25'), ev('EartH', 0, '2026-10-26'),
  ];
  const { picks, noteworthy } = choosePicks(events);
  assert.deepEqual(picks.map((e) => e.title), ['Vortex 2026-10-21', 'Vortex 2026-10-22', 'Oslo 2026-10-25']);
  assert.deepEqual(noteworthy.map((e) => e.title), ['Vortex 2026-10-20', 'Vortex 2026-10-23']);
  // unscored gigs are neither
  assert.ok(![...picks, ...noteworthy].some((e) => e.venue === 'EartH'));
});

test('never more than 10 picks', () => {
  const events = Array.from({ length: 30 }, (_, i) => ev(`Venue ${i}`, 3, `2026-11-${String((i % 28) + 1).padStart(2, '0')}`));
  const { picks, noteworthy } = choosePicks(events);
  assert.equal(picks.length, 10);
  assert.equal(noteworthy.length, 20);
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
  assert.deepEqual(noteworthy.map((e) => e.date), ['2026-10-23']);
});
