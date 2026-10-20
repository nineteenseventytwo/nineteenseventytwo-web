// Fails if the built site contains anything the CSP would block.
//
// The CSP (a CloudFront response header) is script-src 'self' and
// style-src 'self' with no 'unsafe-inline' (plan 09, F10). A page that
// inlines a script or a style still builds and still looks right locally -
// it only breaks in production, silently, as a CSP violation in the console.
// This makes it a build failure instead.
//
// Usage: node scripts/check-no-inline.mjs dist

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.argv[2] ?? 'dist';

const rules = [
  // <script> with no src= - an inline script. <script type="application/ld+json">
  // is data, not code, and CSP does not apply to it.
  {
    name: 'inline <script>',
    re: /<script\b(?![^>]*\bsrc=)(?![^>]*type=["']?application\/(?:ld\+)?json)[^>]*>/gi,
  },
  { name: 'inline <style>', re: /<style\b[^>]*>/gi },
  { name: 'style= attribute', re: /\sstyle\s*=/gi },
  { name: 'on*= event handler', re: /\son[a-z]+\s*=/gi },
  { name: 'javascript: URL', re: /\b(?:href|src|action)\s*=\s*["']?\s*javascript:/gi },
  { name: 'data: URI in src', re: /\bsrc\s*=\s*["']?data:/gi },
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

let files = 0;
const problems = [];
for await (const file of walk(root)) {
  files += 1;
  const html = await readFile(file, 'utf8');
  for (const { name, re } of rules) {
    for (const match of html.matchAll(re)) {
      const line = html.slice(0, match.index).split('\n').length;
      problems.push(`${relative(root, file)}:${line}  ${name}  ${match[0].slice(0, 80)}`);
    }
  }
}

if (files === 0) {
  console.error(`check-no-inline: no .html files under ${root} - did the build run?`);
  process.exit(1);
}

if (problems.length > 0) {
  console.error(`check-no-inline: ${problems.length} CSP violation(s) in ${files} page(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`check-no-inline: ${files} page(s), nothing inline.`);
