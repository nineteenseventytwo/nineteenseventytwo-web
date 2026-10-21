// A dice.fm venue page, server-rendered. DICE's class names carry a build
// hash (EventParts__EventName-sc-26a8d3d9-0), so elements are matched on the
// stable prefix. This is the most fragile adapter: if DICE redesigns, the run
// reports 0 events for the venue rather than guessing.
import * as cheerio from 'cheerio';
import { clean, absolute, splitLineup } from './common.mjs';
import { parseDayMonth } from '../dates.mjs';

export function parse(body, venue, { today } = {}) {
  const $ = cheerio.load(body);
  const events = [];
  const seen = new Set();
  $('[class*="EventParts__EventName"]').each((_, el) => {
    const name = $(el);
    const card = name.parent();
    const title = clean(name.text());
    const date = parseDayMonth(card.find('[class*="EventParts__EventDate"]').first().text(), today);
    const url = absolute(name.attr('href') ?? card.find('a[href*="/event/"]').attr('href'), venue.url);
    if (!title || !date || !url || seen.has(url)) return;
    seen.add(url);
    events.push({ title, date, time: null, url, description: '', lineup: splitLineup(title) });
  });
  return events;
}
