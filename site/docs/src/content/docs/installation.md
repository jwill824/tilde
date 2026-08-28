---
title: Installation
description: Current installation status for the tilde public proof of concept.
---

tilde is currently a public proof of concept and is not published to npm yet.
Package-manager installation is unavailable until the first package release.

## Current status

These commands are intentionally not presented as working install paths yet:

```bash
npm install -g @jwill824/tilde
npx @jwill824/tilde
curl -fsSL https://tilde.thingstead.io/install.sh | bash
```

The hosted installer exits with a status message instead of attempting an npm
install while the package is unpublished.

## Development use from source

Developers evaluating the proof of concept can inspect or run the project from source:

```bash
git clone https://github.com/jwill824/tilde.git
cd tilde
npm install
npm run build
node dist/bin/tilde.js --help
```

Running from source is intended for project evaluation and development, not as a
stable end-user installation flow.

## Planned install paths

After tilde is published to npm, the planned install paths are:

```bash
npm install -g @jwill824/tilde
npx @jwill824/tilde
curl -fsSL https://tilde.thingstead.io/install.sh | bash
```

The curl installer is expected to verify the platform, install prerequisites when
needed, install the npm package, and launch the setup wizard.

## Platform support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS (Apple Silicon) | PoC target | Primary development target |
| macOS (Intel) | PoC target | Expected to work, but not released as a package |
| Linux | Not a release target yet | Some plugin interfaces may expand later |
| Windows | Not supported | WSL may be considered after macOS workflows stabilize |
