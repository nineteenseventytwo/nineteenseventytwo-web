// iCalendar (RFC 5545) - Vortex, via The Events Calendar's ?ical=1 feed.
import { clean, absolute, splitLineup } from './common.mjs';
import { toLondon, ymd } from '../dates.mjs';

function unfold(text) {
  return String(text).replace(/\r?\n[ \t]/g, '');
}

function unescapeText(v) {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
}

// DTSTART forms: 20261021T184500Z (UTC), ;VALUE=DATE:20261021 (all day),
// ;TZID=Europe/London:20261021T184500 (zoned). WordPress sites set to a
// fixed offset emit TZID=UTC+0 - but those are wall-clock times the editor
// typed (Vortex's evening sets read 18:45/19:45 in BST, i.e. the times on
// its own pages), so a fixed-offset TZID is treated as London local, not UTC.
function parseStart(params, value) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, hh, mm] = m;
  if (!hh) return { date: ymd(+y, +mo, +d), time: null };
  if (value.endsWith('Z')) {
    return toLondon(new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm)));
  }
  return { date: ymd(+y, +mo, +d), time: `${hh}:${mm}` };
}

export function parse(body, venue) {
  const events = [];
  for (const block of unfold(body).split('BEGIN:VEVENT').slice(1)) {
    const get = (name) => {
      const line = block.split(/\r?\n/).find((l) => l.startsWith(name + ':') || l.startsWith(name + ';'));
      if (!line) return null;
      const i = line.indexOf(':');
      return { params: line.slice(name.length, i), value: line.slice(i + 1) };
    };
    const summary = get('SUMMARY');
    const start = get('DTSTART');
    if (!summary || !start) continue;
    const when = parseStart(start.params, start.value);
    if (!when) continue;
    const title = clean(unescapeText(summary.value));
    events.push({
      title,
      ...when,
      url: absolute(get('URL')?.value, venue.url) ?? venue.link ?? null,
      description: clean(unescapeText(get('DESCRIPTION')?.value ?? '')),
      lineup: splitLineup(title),
    });
  }
  return events;
}
