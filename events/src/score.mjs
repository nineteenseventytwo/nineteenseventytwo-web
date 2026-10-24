// Scoring (plan 09, W3): rules first, behind an interface, so a model-based
// scorer can replace RulesScorer later without touching fetch or publish.
//
//   interface Scorer {
//     score(event): { score: number, reasons: string[], format: 'band' | 'dj' }
//   }
//
// `format` is separate from the score: a DJ night can match a genre (and so
// be worth listing) without being a band gig. The page only ever picks bands.

export function normalize(s) {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (phrase) => new RegExp(`(^| )${escape(normalize(phrase))}( |$)`);

export const FAVOURITE_WEIGHT = 10;

// Separators that always divide acts. Not commas: the adapters' lineup split
// does use them ("A, B, C" is how OTO lists a bill), but a comma is also part
// of band names - "hey, nothing" split there made a whole act called
// "nothing", and the favourite Nothing with it (2026-10-24).
const STRONG_SPLIT = /\s(?:\+|&|\/|\||x|w\/|with|feat\.?|ft\.?|vs\.?|presents:?|support(?:ed by)?:?)\s|:\s|\s[–—-]\s/i;
const strongActs = (title) =>
  String(title ?? '')
    .replace(/\(.*?\)/g, ' ')
    .split(STRONG_SPLIT)
    .map(normalize)
    .filter(Boolean);

export class RulesScorer {
  constructor(watchlist) {
    this.artists = (watchlist.artists ?? []).map((a) => {
      const name = typeof a === 'string' ? a : a.name;
      return { name, exact: typeof a === 'object' && a.exact === true, norm: normalize(name), re: wordRe(name) };
    });
    // Not wordRe: these phrases include punctuation ("(club)"), so they are
    // matched against the lowercased text with non-word boundaries instead.
    this.djWords = (watchlist.djNight?.words ?? []).map(
      (w) => new RegExp(`(^|[^a-z0-9])${escape(String(w).toLowerCase())}($|[^a-z0-9])`),
    );
    this.genres = Object.entries(watchlist.genres ?? {}).map(([label, g]) => ({
      label,
      weight: g.weight ?? 1,
      res: (g.words ?? []).map(wordRe),
    }));
  }

  score(event) {
    const reasons = [];
    let score = 0;

    const acts = (event.lineup ?? []).map(normalize);
    const title = normalize(event.title);
    const wholeActs = strongActs(event.title);
    for (const a of this.artists) {
      // Ordinary-word names ("Nothing", "Hum") must be a whole act: the whole
      // title, a whole act between unambiguous separators, or a listed
      // performer the title does not use as part of a longer name. Anything
      // else may appear anywhere in the title or lineup.
      const hit = a.exact
        ? title === a.norm || wholeActs.includes(a.norm) || (acts.includes(a.norm) && !a.re.test(title))
        : acts.some((act) => a.re.test(act)) || a.re.test(title);
      if (hit) {
        score += FAVOURITE_WEIGHT;
        reasons.push(`favourite: ${a.name}`);
      }
    }

    // A genre in the title or lineup is what the gig *is*; in the description
    // it is often incidental - every Vortex description lists its line-up by
    // instrument, so "saxophone" there would make the whole jazz programme a
    // pick. Description-only matches count half (rounded up).
    const headline = normalize(`${event.title} ${(event.lineup ?? []).join(' ')}`);
    const body = normalize(event.description ?? '');
    for (const g of this.genres) {
      if (g.res.some((re) => re.test(headline))) {
        score += g.weight;
        reasons.push(g.label);
      } else if (g.res.some((re) => re.test(body))) {
        score += Math.ceil(g.weight / 2);
        reasons.push(g.label);
      }
    }

    return { score, reasons, format: this.format(event) };
  }

  /** 'dj' for DJ / club / rave nights, from the title and description. */
  format(event) {
    const text = `${event.title ?? ''} ${event.description ?? ''}`.toLowerCase();
    return this.djWords.some((re) => re.test(text)) ? 'dj' : 'band';
  }
}
