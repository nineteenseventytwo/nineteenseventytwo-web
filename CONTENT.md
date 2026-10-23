# Adding content

Everything on the site is a file in this repo. Edit, preview locally, open a
PR; merging to `main` publishes in about 30 seconds.

## The loop

```bash
npm ci                 # once
npm run dev            # http://localhost:4321 - reloads as you save
npm test               # before pushing: type check, build, CSP check (what CI runs)
```

Then a branch, a signed commit, and a PR. `main` takes changes only by PR,
and the `build` check must pass.

## Anime - `src/content/anime/`

One Markdown file per title. The filename becomes nothing visible; use a
slug: `cowboy-bebop.md`.

**Watched** - a paragraph, optionally one screenshot and one quote:

```markdown
---
title: Cowboy Bebop
year: 1998
status: watched
quote: "See you, space cowboy."          # optional
screenshot: ./cowboy-bebop.png           # optional; the image sits next to this file
screenshotAlt: Spike on the Bebop's deck # required whenever there is a screenshot
---

One paragraph: why it's worth watching.
```

**To watch** - just the title and year:

```markdown
---
title: Patlabor 2
year: 1993
status: to-watch
---
```

- The page sorts each list alphabetically by `title`. No ordering to maintain.
- **Screenshots:** put the image file in `src/content/anime/` beside its
  Markdown file and reference it as `./name.png` (`.jpg`/`.webp` also work).
  The build resizes it and converts it to WebP, so a full-resolution capture
  is fine.
- Every screenshot is captioned with its title and year automatically. Keep it
  to one per title: they are there as criticism and review, and that is what
  the fair-use reasoning rests on.
- The build **fails**, with a message naming the problem, if a screenshot has
  no `screenshotAlt`, if a `to-watch` entry has a screenshot or quote, if
  `status` is anything else, or if `year` is missing.

## Projects - `src/content/projects/`

One Markdown file per project. `platform.md` is there already.

```markdown
---
title: SaxFlash
summary: One sentence, shown in bold under the title.
order: 10                                    # lower comes first; ties sort by title
url: https://example.com                     # optional - "visit" link
repo: https://github.com/...       # optional - "source" link. The lab's own
                                    # projects use a diagram instead (below)
---

As much Markdown as the project deserves: paragraphs, lists, headings
(use ## and below), links, `code`.
```

Current `order`: platform `10`, 8 Bit Sax Lounge `20`, composer `25`, SaxFlash `30`. Leave
gaps so a new project can slot in between without renumbering.

**Diagrams** - an SVG beside the Markdown file, shown under the summary and
linked to full size:

```markdown
diagram: ./platform.svg
diagramAlt: What the diagram shows, in a sentence or three - read aloud in its place
```

- Draw it about 480 wide and tall rather than wide: on a phone it shrinks to
  the screen width, so a wide diagram becomes unreadable.
- No `<style>` and no `style="..."` inside the SVG (the CSP again) - use
  attributes like `fill="#c0c0c0"` and `font-size="13"`.
- The build fails if there is a `diagram` without `diagramAlt`.

## Gigs - `events/` and `src/content/gigs/`

**Upcoming gigs** come from the weekly `gigs` workflow (Mondays 06:00 UTC, or
run it by hand from the Actions tab). Three files steer it:

- `events/config/watchlist.yaml` - favourite artists and genre keywords. A
  favourite scores 10; a genre adds its weight if it is in the title or
  lineup, half that if only in the description. Ordinary-word artist names
  (`Nothing`, `Hum`) need `exact: true`.
- `events/config/venues.yaml` - which venues are read, and how.
- `events/manual-events.yaml` - gigs to add by hand (Shacklewell, MOTH, SJQ,
  open mics, anything off Instagram):

```yaml
events:
  - title: Seapony + support
    date: 2026-11-14
    time: "19:30"            # optional
    venue: Shacklewell Arms
    url: https://...          # optional
    note: Seen on Instagram   # optional
```

Changes to these files take effect on the next run - merge, then run the
`gigs` workflow by hand if you do not want to wait for Monday.

**Gigs you went to** are a content collection, like anime - one file each in
`src/content/gigs/`, newest first under "Been there":

```markdown
---
title: Hikikomori + Inner City Holdings
date: 2026-10-22
venue: Blondies
photo: ./2026-10-22-hikikomori.jpg    # optional, next to this file
photoAlt: The band on Blondies' stage under red light   # required with a photo
---

A line or two about the night.
```

## The other pages - `src/pages/`

`index.astro` (home) and `8bsl.astro` are plain pages: edit the HTML between
`<Base ...>` and `</Base>` directly. The `<UnderConstruction ... />` line is the
placeholder - delete it when the real content goes in. `events.astro` is the
Gigs page; its content comes from the files above.

## Rules the build enforces

The site's Content Security Policy blocks anything inline, so these fail
`npm test` (and the PR):

- no `<style>` blocks and no `style="..."` attributes - add a class to
  `src/styles/site.css` instead
- no `<script>` blocks and no `onclick=`-style attributes
- no images embedded as `data:` URIs

The stylesheet already has the decorations: `class="blink"`, the
`<UnderConstruction />` sign, `<hr class="rainbow" />`, and the bevelled
`bevel-out` / `bevel-in` boxes.

## Checking it on a phone

Everything must fit 360px wide without scrolling sideways. In the browser's dev
tools, switch to a phone viewport before pushing - long words in headings and
wide images are the usual culprits.
