// Fixtures are synthetic: hand-written to mirror each source's structure as
// surveyed in 2026-10, not copies of the venues' pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adapters } from '../src/adapters/index.mjs';

const fx = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const today = '2026-10-21';

test('ical: folding, escapes, fixed-offset TZID as London wall time, UTC', () => {
  const ev = adapters.ical.parse(fx('vortex.ics'), { url: 'https://www.vortexjazz.co.uk/events/?ical=1', link: 'https://www.vortexjazz.co.uk/' });
  assert.equal(ev.length, 2);
  assert.deepEqual(
    [ev[0].title, ev[0].date, ev[0].time],
    ['Alex Bonney, Tim Giles, Alcyona Mick', '2026-10-21', '18:45'],
  );
  assert.deepEqual(ev[0].lineup, ['Alex Bonney', 'Tim Giles', 'Alcyona Mick']);
  assert.match(ev[0].description, /long line that was folded/);
  assert.deepEqual([ev[1].date, ev[1].time], ['2026-10-22', '20:00']); // 19:00Z in BST
});

test('jsonld: Events inside @graph, performers become the lineup', () => {
  const ev = adapters.jsonld.parse(fx('alttickets.html'), { url: 'https://www.alttickets.com/venue/london/oslo' });
  assert.equal(ev.length, 2);
  assert.deepEqual([ev[0].title, ev[0].date, ev[0].time], ['MOULD', '2026-10-21', '19:00']);
  assert.deepEqual(ev[1].lineup, ['Seapony', 'Support Act']);
  assert.equal(ev[1].url, 'https://www.alttickets.com/event/seapony');
});

test('microdata: date from datetime, time from .time, duplicates dropped', () => {
  const ev = adapters.microdata.parse(fx('earth.html'), { url: 'https://earthackney.co.uk/events/' });
  assert.equal(ev.length, 1);
  assert.deepEqual([ev[0].title, ev[0].date, ev[0].time], ['Anamanaguchi', '2026-10-23', '19:00']);
  assert.match(ev[0].description, /chiptune/i);
});

test('oto: listing blocks with dated headers, plus the featured hidden-start form', () => {
  const ev = adapters.oto.parse(fx('oto.html'), { url: 'https://www.cafeoto.co.uk/events/' }, { today });
  assert.equal(ev.length, 2);
  const byUrl = Object.fromEntries(ev.map((e) => [e.url.split('/events/')[1], e]));
  const listed = byUrl['nebbia-downes-lisle-exhaust/'];
  assert.deepEqual([listed.title, listed.date, listed.time], ['Nebbia / Downes / Lisle: Exhaust', '2026-10-21', '19:30']);
  assert.deepEqual(listed.lineup, ['Nebbia', 'Downes', 'Lisle', 'Exhaust']);
  const featured = byUrl['bbbbbbb-guttersnipe/'];
  assert.deepEqual([featured.title, featured.date, featured.time], ['BBBBBBB + Guttersnipe', '2026-10-24', '20:15']);
  assert.equal(featured.description, 'Show + live stream');
});

test('paperdress: card per event, year inferred', () => {
  const ev = adapters.paperdress.parse(fx('paperdress.html'), { url: 'https://paperdressvintage.co.uk/by-night' }, { today });
  assert.equal(ev.length, 2);
  assert.deepEqual([ev[0].title, ev[0].date, ev[0].time], ['Jodie Howl: Album Launch Party', '2026-10-22', null]);
  assert.deepEqual(ev[1].lineup, ['Last Harbours', 'Boz', 'Subconcious Club']);
});

test('dice-venue: hashed class names matched by prefix', () => {
  const ev = adapters['dice-venue'].parse(fx('dice-venue.html'), { url: 'https://dice.fm/venue/blondies-rmvw' }, { today });
  assert.equal(ev.length, 1);
  assert.deepEqual(
    [ev[0].title, ev[0].date, ev[0].url],
    ['Hikikomori + Inner City Holdings', '2026-10-22', 'https://dice.fm/event/abc123'],
  );
});
