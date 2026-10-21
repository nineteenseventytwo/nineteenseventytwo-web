// Shared helpers for adapters. Every adapter returns plain events:
//   { title, date: 'YYYY-MM-DD', time: 'HH:MM'|null, url, description, lineup: [] }
// Text only - nothing an adapter returns is ever treated as HTML downstream.

export function clean(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\*\*/g, '')
    .trim();
}

export function absolute(href, base) {
  try {
    const u = new URL(href, base);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

/** "A + B & C / D" -> ['A','B','C','D'] - a title's acts, best effort. */
export function splitLineup(title) {
  return String(title)
    .replace(/\(.*?\)/g, ' ')
    .split(/\s(?:\+|&|\/|\||x|w\/|with|feat\.?|ft\.?|vs\.?|presents:?|support(?:ed by)?:?)\s|,\s|:\s|\s[–—-]\s/i)
    .map((s) => clean(s))
    .filter((s) => s.length > 0 && s.length < 80);
}
