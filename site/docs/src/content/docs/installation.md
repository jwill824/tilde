---
title: Installation
description: All supported ways to install tilde on macOS, Linux, and other platforms.
---

tilde can be installed in several ways depending on your platform and preferences.
All methods install the same package — choose the one that fits your workflow.

## curl (Recommended)

The fastest way to get started on macOS or Linux. This script installs Homebrew and
Node.js if needed, then installs tilde globally and launches the setup wizard.

```bash
curl -fsSL https://thingstead.io/tilde/install.sh | bash
```

> **curl not available?** If your system doesn't have `curl`, install tilde directly
> with `npx @jwill824/tilde` (requires Node.js 20+) or via `npm install -g @jwill824/tilde`.

The install script is served at [thingstead.io/tilde](https://thingstead.io/tilde) and is open
source — you can [inspect it before running](https://thingstead.io/tilde/install.sh).

### What happens during install

1. **OS check** — verifies macOS or Linux; prints a friendly message on Windows.
2. **Xcode CLT** *(macOS only)* — installs Command Line Tools if missing.
3. **Package manager prompt** — asks whether to install/use Homebrew (macOS) or a
   Linux package manager (apt / dnf / pacman). You can skip if Node.js is already managed.
4. **Node.js 20+** — detects existing Node or installs via the selected package manager.
5. **Version resolution** — queries `npm view @jwill824/tilde version` to find the
   latest stable release. No hardcoded version.
6. **npm global install** — runs `npm install -g "@jwill824/tilde@<version>"`. npm
   automatically verifies the package integrity (`dist.integrity` sha512) during install.
7. **Launch** — runs `tilde` to start the interactive setup wizard.

The script is idempotent: re-running it skips any step that is already complete.

## npx (no install required)

Run tilde once without installing it globally. Useful for trying tilde on a machine
where you already have Node.js 20+.

```bash
npx @jwill824/tilde
```

## npm global install

Install tilde globally using npm. Requires Node.js 20+ to already be installed.

```bash
npm install -g @jwill824/tilde
```

After installing, run the setup wizard:

```bash
tilde
```

## Platform support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS (Apple Silicon) | ✅ Fully supported | Primary target |
| macOS (Intel) | ✅ Supported | |
| Linux | ⚠️ Experimental | curl install; some features may vary |
| Windows | ❌ Not supported | Use `npx @jwill824/tilde` or WSL |
