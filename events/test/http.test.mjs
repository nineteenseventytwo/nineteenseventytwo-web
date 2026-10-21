import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRobots, isAllowed } from '../src/http.mjs';

test('robots: * group, longest match, crawl-delay', () => {
  const r = parseRobots(`
User-agent: GPTBot
Disallow: /

User-agent: *
Disallow: /admin
Allow: /admin/public
Crawl-delay: 10
`);
  assert.equal(r.delayMs, 10000);
  assert.equal(isAllowed(r.rules, '/events/'), true);
  assert.equal(isAllowed(r.rules, '/admin/x'), false);
  assert.equal(isAllowed(r.rules, '/admin/public/x'), true);
});

test('robots: a group for our own token wins over *', () => {
  const r = parseRobots('User-agent: *\nAllow: /\n\nUser-agent: sev-gig-list\nDisallow: /');
  assert.equal(isAllowed(r.rules, '/anything'), false);
});

test('robots: empty Disallow allows everything; wildcards and $', () => {
  assert.equal(isAllowed(parseRobots('User-agent: *\nDisallow:').rules, '/x'), true);
  const r = parseRobots('User-agent: *\nDisallow: /*?s=\nDisallow: /search$');
  assert.equal(isAllowed(r.rules, '/page/2/?s=foo'), false);
  assert.equal(isAllowed(r.rules, '/search'), false);
  assert.equal(isAllowed(r.rules, '/search/results'), true);
});
