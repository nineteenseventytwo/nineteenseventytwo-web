// The weekly gig job (plan 09, W.4): read every venue, merge the manual
// entries, score, and write events.json for the Gigs page to fetch.
//
//   node events/src/run.mjs --out build/events.json [--cache events/.cache/http.json] [--only oslo]
//
// A venue that fails is recorded in `sources` with its error and the run
// carries on; the page says which ones are missing. The job exits non-zero
// only if *every* scraped source failed - a page of nothing but stale manual
// entries is worse than keeping last week's file.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { adapters } from './adapters/index.mjs';
import { politeGet, loadCache, saveCache } from './http.mjs';
import { RulesScorer } from './score.mjs';
import { londonToday, shiftDays, recurringDates } from './dates.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WINDOW_DAYS = 90;
const DESCRIPTION_MAX = 200;

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}

const loadYaml = async (rel) => parseYaml(await readFile(join(root, rel), 'utf8'));

function id(...parts) {
  return createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12);
}

function trim(text) {
  if (!text || text.length <= DESCRIPTION_MAX) return text || '';
  return text.slice(0, DESCRIPTION_MAX).replace(/\s+\S*$/, '') + '…';
}

async function main() {
  const out = arg('out', 'build/events.json');
  const only = arg('only');
  await loadCache(arg('cache', join(root, '.cache/http.json')));

  const { venues } = await loadYaml('config/venues.yaml');
  const watchlist = await loadYaml('config/watchlist.yaml');
  const manualFile = (await loadYaml('manual-events.yaml')) ?? {};
  const manual = manualFile.events ?? [];
  const recurring = manualFile.recurring ?? [];
  const scorer = new RulesScorer(watchlist);
  const today = londonToday();
  const until = shiftDays(today, WINDOW_DAYS);

  const sources = [];
  const events = [];

  for (const venue of venues.filter((v) => !only || v.id === only)) {
    const adapter = adapters[venue.adapter];
    const started = Date.now();
    try {
      if (!adapter) throw new Error(`unknown adapter ${venue.adapter}`);
      const pages = Math.max(1, Number(venue.pages ?? 1));
      const found = [];
      let fromCache = true;
      for (let n = 1; n <= pages; n++) {
        const url = n === 1 ? venue.url : `${venue.url}${venue.url.includes('?') ? '&' : '?'}page=${n}`;
        const res = await politeGet(url);
        fromCache &&= res.fromCache;
        const batch = adapter.parse(res.body, venue, { today });
        found.push(...batch);
        if (batch.length === 0) break; // ran out of pages
      }
      const upcoming = found.filter((e) => e.date >= today && e.date <= until);
      for (const e of upcoming) events.push({ ...e, venueId: venue.id, venue: venue.name, source: 'scraped' });
      sources.push({ id: venue.id, name: venue.name, ok: true, count: upcoming.length, cached: fromCache });
      console.log(`${venue.id}: ${upcoming.length} upcoming (${found.length} parsed)${fromCache ? ' [304]' : ''} ${Date.now() - started}ms`);
    } catch (e) {
      sources.push({ id: venue.id, name: venue.name, ok: false, count: 0, error: String(e.message ?? e) });
      console.error(`${venue.id}: FAILED - ${e.message ?? e}`);
    }
  }

  for (const m of manual) {
    const date = String(m.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !m.title) {
      console.error(`manual entry skipped (needs title and date YYYY-MM-DD): ${JSON.stringify(m)}`);
      continue;
    }
    if (date < today || date > until) continue;
    events.push({
      title: String(m.title),
      date,
      time: m.time ? String(m.time) : null,
      url: m.url ?? null,
      description: m.note ?? '',
      lineup: m.lineup ?? [String(m.title)],
      venue: m.venue ?? '',
      venueId: 'manual',
      source: 'manual',
    });
  }

  for (const r of recurring) {
    if (!r.title || !r.day) {
      console.error(`recurring entry skipped (needs title and day): ${JSON.stringify(r)}`);
      continue;
    }
    let dates;
    try {
      dates = recurringDates(r, today, until);
    } catch (e) {
      console.error(`recurring entry skipped (${e.message}): ${r.title}`);
      continue;
    }
    for (const date of dates) {
      events.push({
        title: String(r.title),
        date,
        time: r.time ? String(r.time) : null,
        url: r.url ?? null,
        description: r.note ?? '',
        lineup: [String(r.title)],
        venue: r.venue ?? '',
        venueId: 'recurring',
        source: 'recurring',
      });
    }
  }

  const scored = events
    .map((e) => {
      const { score, reasons, format } = scorer.score(e);
      return {
        id: id(e.venueId, e.date, e.title),
        title: e.title,
        date: e.date,
        time: e.time,
        venue: e.venue,
        url: e.url,
        description: trim(e.description),
        score,
        reasons,
        format,
        source: e.source,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '') || b.score - a.score);

  const payload = { generated_at: new Date().toISOString(), today, window_days: WINDOW_DAYS, sources, events: scored };
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(payload, null, 1));
  await saveCache();

  const picks = scored.filter((e) => e.score > 0).length;
  console.log(`\n${scored.length} events, ${picks} picks -> ${out}`);
  const scrapedOk = sources.filter((s) => s.ok).length;
  if (sources.length > 0 && scrapedOk === 0) {
    console.error('every source failed - not publishing');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
