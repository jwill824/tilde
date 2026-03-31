<div align="center">
  <img src="banner.svg" alt="tilde — developer environment bootstrap" width="560"/>

  [![CI](https://github.com/jwill824/tilde/actions/workflows/ci.yml/badge.svg)](https://github.com/jwill824/tilde/actions/workflows/ci.yml)
  [![Release](https://github.com/jwill824/tilde/actions/workflows/release.yml/badge.svg)](https://github.com/jwill824/tilde/actions/workflows/release.yml)
  [![npm version](https://img.shields.io/npm/v/%40jwill824%2Ftilde?color=4ade80&logo=npm)](https://www.npmjs.com/package/@jwill824/tilde)
  [![npm downloads](https://img.shields.io/npm/dm/%40jwill824%2Ftilde?color=4ade80)](https://www.npmjs.com/package/@jwill824/tilde)
  [![License: MIT](https://img.shields.io/badge/license-MIT-4ade80)](https://opensource.org/licenses/MIT)
</div>

> Your entire macOS developer environment, configured from a single file — one command to get started.

---

## Install

```bash
curl -fsSL https://thingstead.io/tilde/install.sh | bash
```

Or run without installing:

```bash
npx @jwill824/tilde
```

---

## Highlights

- **Config-first** — define your entire dev environment in `tilde.config.json`; replay it on any machine with zero re-prompting
- **Interactive wizard** — 14-step guided setup: shell → package manager → version managers → languages → contexts → git auth → secrets
- **Multi-account GitHub** — `cd` hook auto-switches `gh` CLI account and `includeIf` git identity per workspace
- **Idempotent** — safe to re-run; skips anything already correctly configured
- **Plugin architecture** — every integration (package manager, version manager, secrets backend) is swappable
- **Checkpoint / resume** — interrupted mid-wizard? Pick up where you left off
- 📄 [Configuration reference](docs/config-format.md)

---

## Full documentation →

**[thingstead.io/tilde/docs](https://thingstead.io/tilde/docs)**

Installation guide · Getting started · Configuration reference · Plugin API

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, plugin authoring guide, and speckit pipeline.


## License

MIT — see [LICENSE](LICENSE)
