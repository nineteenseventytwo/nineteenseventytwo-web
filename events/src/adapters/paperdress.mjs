// Paper Dress Vintage's "By Night" page: one <a class="events__event"> per
// event, holding the date ("Thu 22 Oct", no year, no time), an <h4> title and
// a short description.
import * as cheerio from 'cheerio';
import { clean, absolute, splitLineup } from './common.mjs';
import { parseDayMonth } from '../dates.mjs';

export function parse(body, venue, { today } = {}) {
  const $ = cheerio.load(body);
  const events = [];
  $('a.events__event').each((_, el) => {
    const a = $(el);
    const title = clean(a.find('h4').first().text());
    const date = parseDayMonth(a.find('p').first().text(), today);
    if (!title || !date) return;
    events.push({
      title,
      date,
      time: null,
      url: absolute(a.attr('href'), venue.url),
      description: clean(a.find('.text--small-body').first().text()).replace(/\s*…$/, '…'),
      lineup: splitLineup(title.replace(/\(.*?\)|:.*$/g, '')),
    });
  });
  return events;
}
