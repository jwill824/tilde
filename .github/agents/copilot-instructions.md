# tilde Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-30

## Active Technologies
- Node.js 20 LTS, TypeScript 5.4+ + Ink 6.8, React 18, Zod 4.3 (config schema + validation), execa 9.6 (002-cli-polish-resilience)
- Local filesystem — `tilde.config.json` (atomic overwrite via temp-rename); (002-cli-polish-resilience)
- Bash 5+ (install script); Astro 4+ with Starlight (docs site); + Astro 4, `@astrojs/starlight`, Node.js 20+ (docs build only); (003-get-tilde-sh-site)
- N/A — static files only; no database, no server state (003-get-tilde-sh-site)
- TypeScript 5.x / Node.js 22.x (CLI); Astro 5.x + Starlight (docs site); Bash (install script); HTML + Tailwind CDN (install page) + Ink (React terminal UI), Astro, @astrojs/starlight, Vites (005-ui-branding-consolidation)
- N/A — no database; config is JSON files on disk (005-ui-branding-consolidation)

- Node.js 20 LTS, TypeScript 5.4+ + Ink 4, React 18, ink-select-input, ink-text-input, ink-spinner, (001-mvp-macos-bootstrap)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

Node.js 20 LTS, TypeScript 5.4+: Follow standard conventions

## Recent Changes
- 005-ui-branding-consolidation: Added TypeScript 5.x / Node.js 22.x (CLI); Astro 5.x + Starlight (docs site); Bash (install script); HTML + Tailwind CDN (install page) + Ink (React terminal UI), Astro, @astrojs/starlight, Vites
- 003-get-tilde-sh-site: Added Bash 5+ (install script); Astro 4+ with Starlight (docs site); + Astro 4, `@astrojs/starlight`, Node.js 20+ (docs build only);
- 002-cli-polish-resilience: Added Node.js 20 LTS, TypeScript 5.4+ + Ink 6.8, React 18, Zod 4.3 (config schema + validation), execa 9.6


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
