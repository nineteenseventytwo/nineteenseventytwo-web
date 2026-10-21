import * as ical from './ical.mjs';
import * as jsonld from './jsonld.mjs';
import * as microdata from './microdata.mjs';
import * as oto from './oto.mjs';
import * as paperdress from './paperdress.mjs';
import * as diceVenue from './dice-venue.mjs';

export const adapters = {
  ical,
  jsonld,
  microdata,
  oto,
  paperdress,
  'dice-venue': diceVenue,
};
