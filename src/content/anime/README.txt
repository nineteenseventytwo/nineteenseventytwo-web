One Markdown file per title, e.g. `cowboy-bebop.md`:

```markdown
---
title: Cowboy Bebop
year: 1998
status: watched           # or to-watch
quote: "See you, space cowboy."
screenshot: ./cowboy-bebop.png
screenshotAlt: Spike on the Bebop's deck
---

One paragraph.
```

The schema in `src/content.config.ts` rejects a screenshot without alt text,
and a screenshot or quote on a to-watch entry.
