// Which scored gigs become Picks, and which slide to Noteworthy.
//
// Best first (score, then soonest), at most MAX_PICKS, and at most
// PER_VENUE from any one venue - otherwise one venue with a matching house
// style (Vortex, where nearly every line-up has a saxophone) fills the whole
// list. Favourite artists are outside the per-venue cap entirely - they
// neither need a slot nor use one, so two favourites at a venue still leave
// room for its two best other gigs. Shared by gigs.js and the tests.

export const MAX_PICKS = 10;
export const PER_VENUE = 2;

const isFavourite = (e) => (e.reasons ?? []).some((r) => r.startsWith('favourite'));

export function choosePicks(events, { max = MAX_PICKS, perVenue = PER_VENUE } = {}) {
  const ranked = events
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  const picks = [];
  const noteworthy = [];
  const perVenueCount = new Map();
  for (const e of ranked) {
    const venue = e.venue || '(unknown)';
    const used = perVenueCount.get(venue) ?? 0;
    const fav = isFavourite(e);
    if (picks.length < max && (fav || used < perVenue)) {
      picks.push(e);
      // Favourites neither need nor use up one of the venue's slots.
      if (!fav) perVenueCount.set(venue, used + 1);
    } else {
      noteworthy.push(e);
    }
  }
  // Noteworthy reads best in date order: it is "also on", not a ranking.
  noteworthy.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  return { picks, noteworthy };
}
