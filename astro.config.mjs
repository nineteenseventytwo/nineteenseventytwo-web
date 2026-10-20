// @ts-check
import { defineConfig } from 'astro/config';

// Static output, served from S3 behind CloudFront (platform ADR-0018).
//
// The CSP is a CloudFront response header with script-src/style-src 'self'
// and no 'unsafe-inline' (plan 09, F10), so nothing here may emit inline
// <style>, inline <script>, or data: URIs. Astro's own security.csp is not
// used: it writes a hash-based <meta> CSP per page, which is a second policy
// to keep in step with the header rather than a stricter one.
// scripts/check-no-inline.mjs fails the build if anything inline slips in.
export default defineConfig({
  site: 'https://sev.eightbitsaxlounge.com',
  build: {
    // Default 'auto' inlines small stylesheets as <style>, which the CSP
    // blocks. Every stylesheet is a file.
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      // Vite inlines small assets as data: URIs by default; img-src 'self'
      // blocks those too.
      assetsInlineLimit: 0,
    },
  },
});
