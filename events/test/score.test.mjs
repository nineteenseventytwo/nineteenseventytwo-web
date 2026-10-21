import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RulesScorer, FAVOURITE_WEIGHT } from '../src/score.mjs';

const scorer = new RulesScorer({
  artists: [{ name: 'Nothing', exact: true }, { name: 'Hum', exact: true }, 'The Darkness', 'FM-84'],
  genres: {
    shoegaze: { weight: 3, words: ['shoegaze'] },
    saxophone: { weight: 3, words: ['sax', 'saxophone'] },
    'open mic': { weight: 1, words: ['open mic'] },
  },
});

const s = (title, extra = {}) => scorer.score({ title, lineup: extra.lineup ?? title.split(' + '), description: extra.description ?? '' });

test('exact favourites match a whole act only', () => {
  assert.equal(s('Nothing + Whirr').score, FAVOURITE_WEIGHT);
  assert.equal(s('Nothing But Thieves').score, 0);
  assert.equal(s('Hum and Strum Folk Night').score, 0);
});

test('other favourites match anywhere, punctuation-insensitive', () => {
  assert.deepEqual(s('An Evening with The Darkness').reasons, ['favourite: The Darkness']);
  assert.equal(s('FM 84 + Timecop1983').score, FAVOURITE_WEIGHT);
});

test('genres are whole-word, counted once each, half weight from the description alone', () => {
  const r = s('Shoegaze all-dayer', { description: 'shoegaze, more shoegaze, and a saxophone' });
  assert.deepEqual(r.reasons, ['shoegaze', 'saxophone']);
  assert.equal(r.score, 3 + 2); // shoegaze in the title (3); sax only in the description (ceil 3/2)
  assert.equal(s('Saxon tribute night').score, 0); // "sax" is not inside "Saxon"
});

test('a genre in the title outranks the same genre buried in the description', () => {
  const titled = s('Saxophone Summit');
  const buried = s('Rob Luft Quartet', { description: 'Line-up: Rob Luft - guitar, Joe Wright - tenor sax' });
  assert.ok(titled.score > buried.score);
});

test('format: DJ, club and rave nights vs bands - phrases, not traps', () => {
  const f = new RulesScorer({
    djNight: { words: ['club night', '(club)', 'dj', 'djs', 'dj set', 'b2b', 'rave', 'disco night'] },
  });
  const fmt = (title, description = '') => f.score({ title, description, lineup: [title] }).format;
  assert.equal(fmt('Some Weird Sin Club Night'), 'dj');
  assert.equal(fmt('Mannequin 03 (CLUB)'), 'dj');
  assert.equal(fmt('Scared To Dance: guest DJ Molly Payton'), 'dj');
  assert.equal(fmt('Nico&Linus + Flashback DJs'), 'dj');
  assert.equal(fmt('Halloween Rave'), 'dj');
  assert.equal(fmt('X b2b Y'), 'dj');
  // bands - including the traps
  assert.equal(fmt('The Sewing Club + Crysometimes'), 'band');
  assert.equal(fmt('Dance Yrself Clean'), 'band');
  assert.equal(fmt('Djinn + Raveonettes tribute'), 'band'); // "dj"/"rave" inside words
  assert.equal(fmt('Angel Du$t and Homefront', 'Hardcore rockers from Baltimore'), 'band');
});
