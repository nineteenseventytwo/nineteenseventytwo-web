// Which scored gigs become Picks, and which slide to Noteworthy.
//
// Bands only - DJ, club and rave nights never make Picks. Best first
// (score, then soonest), at most MAX_PICKS, and at most
// PER_VENUE from any one venue - otherwise one venue with a matching house
// style (Vortex, where nearly every line-up has a saxophone) fills the whole
// list. Favourite artists are outside the per-venue cap entirely - they
// neither need a slot nor use one, so two favourites at a venue still leave
// room for its two best other gigs. Shared by gigs.js and the tests.
//
// Noteworthy is grouped by venue, at most NOTEWORTHY_PER_VENUE each (its
// best, shown in date order) - so one busy venue cannot bury the rest. What
// doesn't fit is counted, and is still in "Everything at my venues".

export const MAX_PICKS = 10;
export const PER_VENUE = 2;
export const NOTEWORTHY_PER_VENUE = 5;

const isFavourite = (e) => (e.reasons ?? []).some((r) => r.startsWith('favourite'));
// Picks are bands. DJ / club / rave nights that score go to Noteworthy.
// Older events.json files have no `format`; treat those as bands.
const isBand = (e) => e.format !== 'dj';

export function choosePicks(
  events,
  { max = MAX_PICKS, perVenue = PER_VENUE, noteworthyPerVenue = NOTEWORTHY_PER_VENUE } = {},
) {
  const ranked = events
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  const picks = [];
  const groups = new Map(); // venue -> { venue, events, more }
  const perVenueCount = new Map();
  for (const e of ranked) {
    const venue = e.venue || '(unknown)';
    const used = perVenueCount.get(venue) ?? 0;
    const fav = isFavourite(e);
    if (picks.length < max && isBand(e) && (fav || used < perVenue)) {
      picks.push(e);
      // Favourites neither need nor use up one of the venue's slots.
      if (!fav) perVenueCount.set(venue, used + 1);
    } else {
      // Still in ranked order here, so the first few per venue are its best.
      if (!groups.has(venue)) groups.set(venue, { venue, events: [], more: 0 });
      const g = groups.get(venue);
      if (g.events.length < noteworthyPerVenue) g.events.push(e);
      else g.more += 1;
    }
  }
  // Within a venue, date order: it is "also on", not a ranking. Venues A-Z.
  const byDate = (a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '');
  const noteworthy = [...groups.values()].sort((a, b) => a.venue.localeCompare(b.venue));
  for (const g of noteworthy) g.events.sort(byDate);
  return { picks, noteworthy };
}
