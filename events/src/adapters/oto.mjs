// Cafe OTO's programme. Each event is a `.each-activity` block holding two
// `.each-header`s: the first is the date and start in plain text
// ("Wednesday 21 October 2026, 7.30pm"), the second the title link
// ("/events/slug/"). The featured event at the top is laid out differently -
// its start sits in a hidden <div id="start_5062">24th October, 8:15PM</div> -
// so that form is read too. The listing is paginated (?page=N; see `pages`
// in venues.yaml).
import * as cheerio from 'cheerio';
import { clean, absolute, splitLineup } from './common.mjs';
import { parseDayMonth, parseTime } from '../dates.mjs';

export function parse(body, venue, { today } = {}) {
  const $ = cheerio.load(body);
  const events = [];
  const seen = new Set();

  const add = (title, url, whenText, prefix = '') => {
    const date = parseDayMonth(whenText, today);
    if (!title || !url || !date || seen.has(url)) return;
    seen.add(url);
    events.push({
      title,
      date,
      time: parseTime(whenText.split(',').slice(1).join(',')),
      url,
      description: prefix,
      lineup: splitLineup(title),
    });
  };

  $('.each-activity').each((_, el) => {
    const block = $(el);
    const link = block.find('.each-header a[href^="/events/"]').first();
    const when = block
      .find('.each-header')
      .filter((_, h) => $(h).find('a').length === 0)
      .first()
      .text();
    add(clean(link.text()), absolute(link.attr('href'), venue.url), clean(when));
  });

  $('[id^="start_"]').each((_, el) => {
    let block = $(el).parent();
    for (let i = 0; i < 6 && block.length && !block.find('.each-header a[href^="/events/"]').length; i++) {
      block = block.parent();
    }
    const link = block.find('.each-header a[href^="/events/"]').first();
    const prefix = clean(block.find('.each-header .prefix').first().text()).replace(/:$/, '');
    add(clean(link.text()), absolute(link.attr('href'), venue.url), clean($(el).text()), prefix);
  });

  return events;
}
