// The only way the gig job touches the network (plan 09, F9):
//   - identifies itself, with a link back to this repo
//   - honours robots.txt for its own name and for *
//   - one request at a time, per-host delay = max(Crawl-delay, 3s)
//   - conditional requests (ETag / Last-Modified), so an unchanged listing
//     costs the venue a 304
// A disallowed URL is an error the job reports, never a silent skip.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export const USER_AGENT =
  'sev-gig-list/1.0 (+https://github.com/nineteenseventytwo/nineteenseventytwo-web; weekly, one request at a time)';
const AGENT_TOKEN = 'sev-gig-list';
const MIN_DELAY_MS = 3000;
const TIMEOUT_MS = 20000;

const robotsCache = new Map(); // origin -> {rules, delayMs}
const lastHit = new Map(); // host -> epoch ms

let cache = {};
let cachePath = null;

export async function loadCache(path) {
  cachePath = path;
  try {
    cache = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    cache = {};
  }
}

export async function saveCache() {
  if (!cachePath) return;
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(cache));
}

/** Minimal robots.txt: the group for our token if present, else `*`. */
export function parseRobots(text) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const value = line.slice(i + 1).trim();
    if (key === 'user-agent') {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [], delay: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === 'allow' || key === 'disallow') current.rules.push({ allow: key === 'allow', path: value });
    if (key === 'crawl-delay' && !Number.isNaN(Number(value))) current.delay = Number(value);
  }
  const mine = groups.filter((g) => g.agents.some((a) => a !== '*' && AGENT_TOKEN.startsWith(a)));
  const chosen = mine.length ? mine : groups.filter((g) => g.agents.includes('*'));
  return {
    rules: chosen.flatMap((g) => g.rules),
    delayMs: Math.max(...chosen.map((g) => (g.delay ?? 0) * 1000), 0),
  };
}

/** Longest matching rule wins; Allow wins a tie; empty Disallow allows all. */
export function isAllowed(rules, path) {
  let best = { len: -1, allow: true };
  for (const r of rules) {
    if (!r.path) continue;
    const pattern = new RegExp(
      '^' + r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'),
    );
    if (pattern.test(path)) {
      const len = r.path.length;
      if (len > best.len || (len === best.len && r.allow)) best = { len, allow: r.allow };
    }
  }
  return best.allow;
}

async function pace(host, delayMs) {
  const wait = (lastHit.get(host) ?? 0) + Math.max(delayMs, MIN_DELAY_MS) - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit.set(host, Date.now());
}

async function rawGet(url, headers = {}) {
  return fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: '*/*', ...headers },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

async function robotsFor(url) {
  const { origin, host } = new URL(url);
  if (!robotsCache.has(origin)) {
    await pace(host, 0);
    let parsed = { rules: [], delayMs: 0 };
    try {
      const res = await rawGet(`${origin}/robots.txt`);
      // 4xx: no robots.txt, everything allowed. 5xx: be conservative.
      if (res.ok) parsed = parseRobots(await res.text());
      else if (res.status >= 500) parsed = { rules: [{ allow: false, path: '/' }], delayMs: 0 };
    } catch {
      parsed = { rules: [{ allow: false, path: '/' }], delayMs: 0 };
    }
    robotsCache.set(origin, parsed);
  }
  return robotsCache.get(origin);
}

/** GET a page politely. Returns {body, status, fromCache}. Throws on refusal or failure. */
export async function politeGet(url) {
  const u = new URL(url);
  const robots = await robotsFor(url);
  if (!isAllowed(robots.rules, u.pathname + u.search)) {
    throw new Error(`robots.txt disallows ${u.pathname}${u.search}`);
  }
  await pace(u.host, robots.delayMs);

  const prior = cache[url];
  const headers = {};
  if (prior?.etag) headers['if-none-match'] = prior.etag;
  if (prior?.lastModified) headers['if-modified-since'] = prior.lastModified;

  let res;
  try {
    res = await rawGet(url, headers);
  } catch (e) {
    await pace(u.host, robots.delayMs);
    res = await rawGet(url, headers); // one retry, after another polite wait
  }
  if (res.status === 304 && prior) return { body: prior.body, status: 304, fromCache: true };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.text();
  cache[url] = {
    etag: res.headers.get('etag') ?? undefined,
    lastModified: res.headers.get('last-modified') ?? undefined,
    body,
  };
  return { body, status: res.status, fromCache: false };
}
