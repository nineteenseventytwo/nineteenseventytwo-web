// Fills in the visitor counter on the home page from /counter.json. Values
// are set with textContent only; the file is ours, but nothing from a fetch
// is ever treated as HTML.

const root = document.getElementById('visitors');
const MIN_DIGITS = 6;

fetch(root.dataset.src, { cache: 'no-cache' })
  .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
  .then(({ total, since }) => {
    if (!Number.isInteger(total) || total < 0) return;
    const digits = root.querySelector('.counter__digits');
    for (const d of String(total).padStart(MIN_DIGITS, '0')) {
      const span = document.createElement('span');
      span.className = 'counter__digit';
      span.textContent = d;
      digits.append(span);
    }
    const month = since
      ? new Date(`${since}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
      : null;
    const label = root.querySelector('.counter__label');
    label.textContent = `visitors${month ? ` since ${month}` : ''}`;
    // The digit boxes are decoration; this is what a screen reader hears.
    root.setAttribute('aria-label', `${total.toLocaleString('en-GB')} visitors${month ? ` since ${month}` : ''}`);
    root.setAttribute('role', 'img');
    root.hidden = false;
  })
  .catch(() => {}); // no number, no counter
