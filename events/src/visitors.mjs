// The home page's visitor counter: one number, counted daily, from the
// analytics Cloudflare already keeps for the site (it proxies every request).
//
//   node events/src/visitors.mjs --previous https://sev.eightbitsaxlounge.com/counter.json --out build/counter.json
//   env: CF_API_TOKEN (Analytics:Read on the zone), CF_ZONE_ID, SITE_HOST
//
// "Visits" is Cloudflare's own measure: a page view whose referrer is not the
// site itself - someone arriving, not every request they make once here.
// Cloudflare's bot filtering has already happened, and nothing here sees an
// IP address: the API returns only a number per day.
//
// The total is the sum of a per-day record carried forward in counter.json
// itself. Each run re-reads the last LOOKBACK_DAYS (Cloudflare's numbers
// settle over a few hours, and a missed run is filled in by the next) and
// keeps every older day as it was. So a re-run never double counts, and a
// failed run loses nothing.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export const LOOKBACK_DAYS = 7;
const GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';

const QUERY = `query ($zone: String!, $host: String!, $start: Time!, $end: Time!) {
  viewer {
    zones(filter: { zoneTag: $zone }) {
      httpRequestsAdaptiveGroups(
        limit: 1
        filter: { datetime_geq: $start, datetime_lt: $end, clientRequestHTTPHost: $host, requestSource: "eyeball" }
      ) {
        sum { visits }
      }
    }
  }
}`;

/** The LOOKBACK_DAYS whole UTC days before `now`, oldest first, as YYYY-MM-DD. */
export function lookbackDays(now = new Date(), n = LOOKBACK_DAYS) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: n }, (_, i) => new Date(today - (n - i) * 86400000).toISOString().slice(0, 10));
}

/** Previous days, overwritten by any freshly counted ones; totals recomputed. */
export function merge(previous, fresh, now = new Date()) {
  const days = { ...(previous?.days ?? {}), ...fresh };
  const dates = Object.keys(days).sort();
  return {
    generated_at: now.toISOString(),
    since: dates[0] ?? null,
    through: dates.at(-1) ?? null,
    total: dates.reduce((n, d) => n + days[d], 0),
    days: Object.fromEntries(dates.map((d) => [d, days[d]])),
  };
}

/**
 * Last run's counter.json. A 404 is a first run; anything else that is not a
 * 200 is a failure - starting again from zero because the site blipped would
 * silently reset the count.
 */
export async function fetchPrevious(url, fetchImpl = fetch) {
  const res = await fetchImpl(url, { headers: { 'cache-control': 'no-cache' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`previous counter: HTTP ${res.status} from ${url}`);
  const data = await res.json();
  if (typeof data?.days !== 'object' || data.days === null) throw new Error('previous counter: no days record');
  return data;
}

async function visitsOn(day, { token, zone, host }) {
  const start = `${day}T00:00:00Z`;
  const end = new Date(Date.parse(start) + 86400000).toISOString().replace('.000', '');
  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { zone, host, start, end } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join('; '));
  const groups = body.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups;
  if (!Array.isArray(groups)) throw new Error('unexpected response shape');
  return groups[0]?.sum?.visits ?? 0;
}

async function main() {
  const arg = (name) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const { CF_API_TOKEN: token, CF_ZONE_ID: zone, SITE_HOST: host } = process.env;
  const out = arg('out');
  if (!token || !zone || !host || !out || !arg('previous')) {
    throw new Error('need CF_API_TOKEN, CF_ZONE_ID, SITE_HOST, --previous and --out');
  }

  const previous = await fetchPrevious(arg('previous'));
  const fresh = {};
  const failed = [];
  for (const day of lookbackDays()) {
    try {
      fresh[day] = await visitsOn(day, { token, zone, host });
    } catch (err) {
      // Older days can fall outside what the plan lets us query; keep
      // whatever was recorded for them before.
      failed.push(`${day}: ${err.message}`);
    }
  }
  if (Object.keys(fresh).length === 0) throw new Error(`no day could be read:\n  ${failed.join('\n  ')}`);

  const counter = merge(previous, fresh);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(counter, null, 2) + '\n');
  console.log(`${counter.total} visits since ${counter.since} (read ${Object.keys(fresh).length} days)`);
  for (const f of failed) console.log(`  skipped ${f}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
