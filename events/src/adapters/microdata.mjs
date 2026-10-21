// schema.org Event in microdata (itemscope/itemprop) - EartH.
// EartH's startDate carries the day only (T00:00); the time is in a sibling
// `.time` element ("19:00 - 22:30").
import * as cheerio from 'cheerio';
import { clean, absolute, splitLineup } from './common.mjs';
import { parseTime } from '../dates.mjs';

export function parse(body, venue) {
  const $ = cheerio.load(body);
  const seen = new Set();
  const events = [];
  $('[itemscope][itemtype$="schema.org/Event"]').each((_, el) => {
    const item = $(el);
    const title = clean(item.find('[itemprop="name"]').first().text());
    const start = item.find('[itemprop="startDate"]').first();
    const date = String(start.attr('datetime') ?? start.attr('content') ?? '').slice(0, 10);
    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const url = absolute(item.find('a[href]').first().attr('href'), venue.url);
    const key = url ?? `${date}|${title}`;
    if (seen.has(key)) return;
    seen.add(key);
    events.push({
      title,
      date,
      time: parseTime(item.find('.time').first().text()),
      url,
      description: clean(item.find('[itemprop="description"]').first().text()),
      lineup: splitLineup(title),
    });
  });
  return events;
}
