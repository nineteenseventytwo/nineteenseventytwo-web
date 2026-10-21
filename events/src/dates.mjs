// Dates on the gig list are London wall-clock: a date (YYYY-MM-DD) and an
// optional time (HH:MM). Nobody wants "19:00Z" for a gig in Dalston, and
// several sources give no time at all.

const TZ = 'Europe/London';

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n) => String(n).padStart(2, '0');

export function ymd(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** An instant (Date or ISO string with offset) -> London {date, time}. */
export function toLondon(instant) {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** Today's date in London as YYYY-MM-DD. */
export function londonToday(now = new Date()) {
  return toLondon(now).date;
}

export function monthNumber(name) {
  return MONTHS[String(name).slice(0, 4).toLowerCase().replace(/[^a-z]/g, '')] ??
    MONTHS[String(name).slice(0, 3).toLowerCase()] ?? null;
}

/**
 * Listings often say "Thu 22 Oct" with no year. They list upcoming shows, so
 * the year is the one that puts the date nearest ahead of today - this year,
 * unless that is more than a month in the past (a December page showing
 * January dates).
 */
export function inferYear(month, day, today = londonToday()) {
  const [ty] = today.split('-').map(Number);
  const candidate = ymd(ty, month, day);
  const monthAgo = shiftDays(today, -31);
  return candidate < monthAgo ? ty + 1 : ty;
}

export function shiftDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** "8:15PM", "19:00", "7.30pm" -> "HH:MM", or null. */
export function parseTime(text) {
  const m = String(text ?? '').match(/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = m[3]?.toLowerCase();
  if (!m[2] && !ap) return null; // a bare number is not a time
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

/** "Thu 22 Oct", "24th October", "22 October 2026" -> YYYY-MM-DD, or null. */
export function parseDayMonth(text, today = londonToday()) {
  const m = String(text ?? '').match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:,?\s+(\d{4}))?/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = monthNumber(m[2]);
  if (!month || day < 1 || day > 31) return null;
  const year = m[3] ? Number(m[3]) : inferYear(month, day, today);
  return ymd(year, month, day);
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Dates of a regular night between `from` and `to` (inclusive, YYYY-MM-DD).
 * Weekly when `nth` is absent; otherwise the nth such weekday of each month
 * (1-4, or -1 for the last).
 */
export function recurringDates({ day, nth = null }, from, to) {
  const dow = DAYS.indexOf(String(day).toLowerCase());
  if (dow < 0) throw new Error(`unknown day "${day}"`);
  if (nth !== null && ![1, 2, 3, 4, -1].includes(Number(nth))) throw new Error(`nth must be 1-4 or -1, not ${nth}`);
  const out = [];
  for (let d = from; d <= to; d = shiftDays(d, 1)) {
    const [y, m, dd] = d.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, dd));
    if (t.getUTCDay() !== dow) continue;
    if (nth === null) {
      out.push(d);
      continue;
    }
    const n = Number(nth);
    const ordinal = Math.ceil(dd / 7);
    const isLast = shiftDays(d, 7).slice(0, 7) !== d.slice(0, 7);
    if ((n > 0 && ordinal === n) || (n === -1 && isLast)) out.push(d);
  }
  return out;
}
