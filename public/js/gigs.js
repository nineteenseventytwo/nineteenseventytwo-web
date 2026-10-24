// Renders "Coming up" on /events/ from /events.json (written weekly by the
// gig job). Plain DOM: every value from the file is set with textContent and
// links are http(s) only - the data comes from scraped venue pages, so none
// of it is ever treated as HTML. No inline styles (CSP): classes only.

import { choosePicks } from './picks.js';

const STALE_DAYS = 9; // weekly job, plus a little slack

const root = document.getElementById('gigs');
const status = document.getElementById('gigs-status');

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function safeUrl(url) {
  try {
    const u = new URL(url, location.href);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

function fmtDate(ymd) {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  });
}

function daysAgo(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function gigItem(e, { detailed, showVenue = true }) {
  const li = el('li', 'gig' + (e.score > 0 ? ' gig--pick' : ''));
  li.append(el('span', 'gig__when', fmtDate(e.date) + (e.time ? ` ${e.time}` : '')));

  const title = el('span', 'gig__title');
  const href = e.url && safeUrl(e.url);
  if (href) {
    const a = el('a', null, e.title);
    a.href = href;
    a.rel = 'noopener';
    title.append(a);
  } else {
    title.textContent = e.title;
  }
  li.append(title);

  const where = [showVenue && e.venue, e.format === 'dj' && 'DJ night'].filter(Boolean).join(' · ');
  if (where) li.append(el('span', 'gig__venue', where));

  if (e.reasons?.length) {
    const chips = el('span', 'gig__chips');
    for (const r of e.reasons) chips.append(el('span', r.startsWith('favourite') ? 'chip chip--fav' : 'chip', r.replace(/^favourite: /, '★ ')));
    li.append(chips);
  }

  if (detailed && e.description) li.append(el('p', 'gig__desc', e.description));
  return li;
}

function render(data) {
  const age = daysAgo(data.generated_at);
  const updated = new Date(data.generated_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  status.textContent = `Updated ${updated} (${age === 0 ? 'today' : age === 1 ? 'yesterday' : `${age} days ago`}).`;
  if (age > STALE_DAYS) {
    status.classList.add('gigs__status--stale');
    status.textContent += ' That is older than it should be - the weekly refresh may be failing, so check venue sites before you go.';
  }

  const failed = (data.sources ?? []).filter((s) => !s.ok);
  if (failed.length) {
    root.append(el('p', 'gigs__note', `Couldn't read this week: ${failed.map((s) => s.name).join(', ')}. Their gigs are missing below.`));
  }

  const events = data.events ?? [];
  if (events.length === 0) {
    root.append(el('p', null, 'Nothing listed right now.'));
    return;
  }

  const { picks, noteworthy } = choosePicks(events);
  if (picks.length) {
    root.append(el('h3', null, 'Picks'));
    const ul = el('ul', 'gigs');
    for (const e of picks) ul.append(gigItem(e, { detailed: true }));
    root.append(ul);
  }
  if (noteworthy.length) {
    const total = noteworthy.reduce((n, g) => n + g.events.length + g.more, 0);
    root.append(el('h3', null, `Noteworthy (${total})`));
    for (const g of noteworthy) {
      root.append(el('h4', 'gigs__venue', g.venue));
      const ul = el('ul', 'gigs');
      for (const e of g.events) ul.append(gigItem(e, { detailed: false, showVenue: false }));
      root.append(ul);
      if (g.more) root.append(el('p', 'gigs__more', `+ ${g.more} more here - see "Everything" below.`));
    }
  }

  const details = el('details', 'gigs__all');
  details.append(el('summary', null, `Everything at my venues (${events.length})`));
  const ul = el('ul', 'gigs');
  for (const e of events) ul.append(gigItem(e, { detailed: false }));
  details.append(ul);
  root.append(details);
}

fetch(root.dataset.src, { cache: 'no-cache' })
  .then((res) => {
    if (res.status === 404) throw new Error('none');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(render)
  .catch((err) => {
    status.textContent =
      err.message === 'none'
        ? 'No gig data yet - the weekly refresh has not run.'
        : "Couldn't load the gig list right now.";
    status.classList.add('gigs__status--stale');
  });
