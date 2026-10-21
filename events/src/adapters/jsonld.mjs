// schema.org Event in JSON-LD - Oslo, via its alttickets venue page.
import * as cheerio from 'cheerio';
import { clean, absolute, splitLineup } from './common.mjs';
import { toLondon } from '../dates.mjs';

function* walk(node) {
  if (Array.isArray(node)) {
    for (const n of node) yield* walk(n);
  } else if (node && typeof node === 'object') {
    yield node;
    for (const key of ['@graph', 'event', 'events', 'itemListElement', 'item']) {
      if (node[key]) yield* walk(node[key]);
    }
  }
}

const isEvent = (n) => [].concat(n['@type'] ?? []).some((t) => /Event$/.test(String(t)));

function performers(p) {
  return [].concat(p ?? []).map((x) => clean(typeof x === 'string' ? x : x?.name)).filter(Boolean);
}

export function parse(body, venue) {
  const $ = cheerio.load(body);
  const events = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    let data;
    try {
      data = JSON.parse($(el).text());
    } catch {
      return;
    }
    for (const n of walk(data)) {
      if (!isEvent(n) || !n.startDate || !n.name) continue;
      const when = /T\d{2}:\d{2}/.test(n.startDate)
        ? toLondon(n.startDate)
        : { date: String(n.startDate).slice(0, 10), time: null };
      if (!when) continue;
      const title = clean(n.name);
      const lineup = performers(n.performer);
      events.push({
        title,
        ...when,
        url: absolute(n.url, venue.url),
        description: clean(n.description),
        lineup: lineup.length ? lineup : splitLineup(title),
      });
    }
  });
  return events;
}
