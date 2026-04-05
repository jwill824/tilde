# tilde Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-04

## Active Technologies
- Node.js 20 LTS, TypeScript 5.4+ + Ink 6.8, React 18, Zod 4.3 (config schema + validation), execa 9.6 (002-cli-polish-resilience)
- Local filesystem — `tilde.config.json` (atomic overwrite via temp-rename); (002-cli-polish-resilience)
- Bash 5+ (install script); Astro 4+ with Starlight (docs site); + Astro 4, `@astrojs/starlight`, Node.js 20+ (docs build only); (003-get-tilde-sh-site)
- N/A — static files only; no database, no server state (003-get-tilde-sh-site)
- TypeScript 5.x / Node.js 22.x (CLI); Astro 5.x + Starlight (docs site); Bash (install script); HTML + Tailwind CDN (install page) + Ink (React terminal UI), Astro, @astrojs/starlight, Vites (005-ui-branding-consolidation)
- N/A — no database; config is JSON files on disk (005-ui-branding-consolidation)
- TypeScript 5.4, Node.js 20 LTS, ESM (`"type": "module"`) + Ink (React terminal UI), Zod (config schema validation), `node:fs`, `node:url`, `node:path` (006-docs-polish-spec-hygiene)
- File system only — `docs/`, `docs/design/`, `src/`, `specs/` (006-docs-polish-spec-hygiene)
- TypeScript 5.4, Node.js ≥ 20 + Ink 6 (terminal UI), React 19, Vitest 4, tsx 4, execa 9, Zod 4; Astro/Starlight (docs site) (007-cli-fix-brand-docs)
- N/A — file-based configs (`tilde.config.json`); SVG/PNG assets (007-cli-fix-brand-docs)
- TypeScript 5.4, Node.js ≥ 20 (ESM-only, NodeNext module resolution) + Ink 6, React 19, ink-select-input 6, ink-text-input 6, ink-spinner 5, Zod 4, execa 9 (008-wizard-ux-enhancements)
- `tilde.config.json` (file-based); config schema versioned with `schemaVersion` field (008-wizard-ux-enhancements)
- Node.js 22, TypeScript (docs site: Astro/Starlight), YAML (GitHub Actions), HCL (Terraform — being removed) + Cloudflare Pages (wrangler-action v3), Astro + Starlight, github-repo-factory (`repos.json`) (009-migrate-subdomain-factory)

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
- 009-migrate-subdomain-factory: Added Node.js 22, TypeScript (docs site: Astro/Starlight), YAML (GitHub Actions), HCL (Terraform — being removed) + Cloudflare Pages (wrangler-action v3), Astro + Starlight, github-repo-factory (`repos.json`)
- 008-wizard-ux-enhancements: Added TypeScript 5.4, Node.js ≥ 20 (ESM-only, NodeNext module resolution) + Ink 6, React 19, ink-select-input 6, ink-text-input 6, ink-spinner 5, Zod 4, execa 9
- 007-cli-fix-brand-docs: Added TypeScript 5.4, Node.js ≥ 20 + Ink 6 (terminal UI), React 19, Vitest 4, tsx 4, execa 9, Zod 4; Astro/Starlight (docs site)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
